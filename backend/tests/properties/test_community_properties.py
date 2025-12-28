"""
Property-based tests for community gallery services.

Properties tested:
- Property 10: Like Idempotency
- Property 11: Comment Edit Window
- Property 12: Tag Normalization
- Property 13: Follow Symmetry Prevention
- Property 14: Denormalized Counter Consistency
"""
from datetime import datetime, timedelta, timezone
from typing import List
from unittest.mock import MagicMock
import pytest
from hypothesis import given, strategies as st, settings, assume
from pydantic import ValidationError

from backend.api.schemas.community import CreatePostRequest, UpdateCommentRequest, TAG_PATTERN
from backend.services.community_engagement_service import (
    CommunityEngagementService, COMMENT_EDIT_WINDOW_MINUTES,
)
from backend.services.exceptions import CommunityEditWindowExpiredError, CommunitySelfFollowError

# Strategies
user_id_st = st.uuids().map(str)
post_id_st = st.uuids().map(str)
comment_id_st = st.uuids().map(str)
TAG_REGEX_MULTI = r"^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$"
TAG_REGEX_SINGLE = r"^[a-z0-9]$"
valid_tag_st = st.one_of(st.from_regex(TAG_REGEX_MULTI, fullmatch=True), st.from_regex(TAG_REGEX_SINGLE, fullmatch=True))
invalid_tag_st = st.sampled_from(["-invalid", "invalid-", "has spaces", "special!char", "under_score", "a" * 31])
op_count_st = st.integers(min_value=1, max_value=20)
within_window_st = st.integers(min_value=0, max_value=COMMENT_EDIT_WINDOW_MINUTES - 1)
outside_window_st = st.integers(min_value=COMMENT_EDIT_WINDOW_MINUTES + 1, max_value=1440)


def create_service():
    mock = MagicMock()
    for m in ['table', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'rpc']:
        getattr(mock, m).return_value = mock
    mock.execute.return_value = MagicMock(data=[], count=0)
    return CommunityEngagementService(supabase_client=mock), mock


class TestLikeIdempotency:
    """Property 10: Liking multiple times = liking once."""

    @settings(max_examples=100)
    @given(user_id=user_id_st, post_id=post_id_st, n=op_count_st)
    @pytest.mark.asyncio
    async def test_multiple_likes_same_as_one(self, user_id: str, post_id: str, n: int):
        svc, mock = create_service()
        inserts = []
        mock.insert.side_effect = lambda d: (inserts.append(d), mock)[1]
        resp = []
        for i in range(n):
            resp.extend([MagicMock(data=[]), MagicMock(data=[{"id": post_id}])])
            if i == 0:
                resp.extend([MagicMock(data=[]), MagicMock(data=[{"id": "l1"}]), MagicMock(data=[])])
            else:
                resp.append(MagicMock(data=[{"id": "l1"}]))
        mock.execute.side_effect = resp
        for _ in range(n):
            await svc.like_post(user_id, post_id)
        assert len(inserts) == 1

    @settings(max_examples=50)
    @given(user_id=user_id_st, post_id=post_id_st)
    @pytest.mark.asyncio
    async def test_like_unlike_like(self, user_id: str, post_id: str):
        svc, mock = create_service()
        cnt = [0]
        mock.insert.side_effect = lambda d: (cnt.__setitem__(0, cnt[0] + 1), mock)[1]
        mock.execute.side_effect = [
            MagicMock(data=[]), MagicMock(data=[{"id": post_id}]), MagicMock(data=[]),
            MagicMock(data=[{"id": "l1"}]), MagicMock(data=[]), MagicMock(data=[]), MagicMock(data=[]),
            MagicMock(data=[]), MagicMock(data=[{"id": post_id}]), MagicMock(data=[]),
            MagicMock(data=[{"id": "l2"}]), MagicMock(data=[]),
        ]
        await svc.like_post(user_id, post_id)
        await svc.unlike_post(user_id, post_id)
        await svc.like_post(user_id, post_id)
        assert cnt[0] == 2


class TestCommentEditWindow:
    """Property 11: Comments editable only within 15 minutes."""

    @settings(max_examples=100)
    @given(user_id=user_id_st, cid=comment_id_st, mins=outside_window_st)
    @pytest.mark.asyncio
    async def test_edit_after_window_fails(self, user_id: str, cid: str, mins: int):
        svc, mock = create_service()
        ts = (datetime.now(timezone.utc) - timedelta(minutes=mins)).isoformat().replace("+00:00", "Z")
        row = {"id": cid, "post_id": "p1", "user_id": user_id, "content": "Old",
               "is_edited": False, "created_at": ts, "updated_at": ts}
        mock.execute.side_effect = [MagicMock(data=[]), MagicMock(data=[row])]
        with pytest.raises(CommunityEditWindowExpiredError) as exc:
            await svc.edit_comment(user_id, cid, UpdateCommentRequest(content="New"))
        assert exc.value.details["window_minutes"] == COMMENT_EDIT_WINDOW_MINUTES

    @settings(max_examples=100)
    @given(user_id=user_id_st, cid=comment_id_st, mins=within_window_st)
    @pytest.mark.asyncio
    async def test_edit_within_window_succeeds(self, user_id: str, cid: str, mins: int):
        svc, mock = create_service()
        ts = (datetime.now(timezone.utc) - timedelta(minutes=mins)).isoformat().replace("+00:00", "Z")
        now = datetime.utcnow().isoformat() + "Z"
        row = {"id": cid, "post_id": "p1", "user_id": user_id, "content": "Old",
               "is_edited": False, "created_at": ts, "updated_at": ts}
        upd = {**row, "content": "New", "is_edited": True, "updated_at": now}
        mock.execute.side_effect = [MagicMock(data=[]), MagicMock(data=[row]), MagicMock(data=[upd]),
                                    MagicMock(data=[{"id": user_id, "display_name": "U", "avatar_url": None}])]
        result = await svc.edit_comment(user_id, cid, UpdateCommentRequest(content="New"))
        assert result.is_edited is True


class TestTagNormalization:
    """Property 12: Tags normalized to lowercase, trimmed, validated."""

    @settings(max_examples=100)
    @given(tag=valid_tag_st)
    def test_valid_tags_match_pattern(self, tag: str):
        assert TAG_PATTERN.match(tag)

    @settings(max_examples=100)
    @given(tags=st.lists(valid_tag_st, min_size=1, max_size=5))
    def test_valid_tags_accepted(self, tags: List[str]):
        req = CreatePostRequest(asset_id="a1", title="Test", tags=tags)
        for t in req.tags:
            assert t == t.lower() and TAG_PATTERN.match(t)

    @settings(max_examples=50)
    @given(tag=valid_tag_st, sp=st.integers(min_value=1, max_value=3))
    def test_tags_trimmed(self, tag: str, sp: int):
        req = CreatePostRequest(asset_id="a1", title="Test", tags=[" " * sp + tag + " " * sp])
        assert req.tags[0] == tag

    @settings(max_examples=50)
    @given(inv=invalid_tag_st)
    def test_invalid_tags_rejected(self, inv: str):
        with pytest.raises(ValidationError):
            CreatePostRequest(asset_id="a1", title="Test", tags=[inv])

    def test_tag_edge_cases(self):
        assert TAG_PATTERN.match("a") and TAG_PATTERN.match("gaming") and TAG_PATTERN.match("twitch-emotes")
        assert not TAG_PATTERN.match("") and not TAG_PATTERN.match("-a") and not TAG_PATTERN.match("a-")


class TestFollowSymmetryPrevention:
    """Property 13: User cannot follow themselves."""

    @settings(max_examples=100)
    @given(user_id=user_id_st)
    @pytest.mark.asyncio
    async def test_self_follow_raises_error(self, user_id: str):
        svc, _ = create_service()
        with pytest.raises(CommunitySelfFollowError):
            await svc.follow_user(user_id, user_id)

    @settings(max_examples=100)
    @given(fid=user_id_st, tid=user_id_st)
    @pytest.mark.asyncio
    async def test_different_users_can_follow(self, fid: str, tid: str):
        assume(fid != tid)
        svc, mock = create_service()
        mock.execute.side_effect = [MagicMock(data=[]), MagicMock(data=[]), MagicMock(data=[{"id": "f1"}]),
                                    MagicMock(data=[{"user_id": fid}]), MagicMock(data=[{"user_id": tid}]),
                                    MagicMock(data=[]), MagicMock(data=[])]
        await svc.follow_user(fid, tid)


class TestDenormalizedCounterConsistency:
    """Property 14: like_count matches actual likes in table."""

    @settings(max_examples=50)
    @given(uids=st.lists(user_id_st, min_size=1, max_size=10, unique=True), pid=post_id_st)
    @pytest.mark.asyncio
    async def test_like_count_matches_actual(self, uids: List[str], pid: str):
        svc, mock = create_service()
        likes = set()
        mock.insert.side_effect = lambda d: (likes.add(d.get("user_id")) if "user_id" in d else None, mock)[1]
        resp = []
        for u in uids:
            resp.extend([MagicMock(data=[]), MagicMock(data=[{"id": pid}]), MagicMock(data=[]),
                         MagicMock(data=[{"id": f"l-{u}"}]), MagicMock(data=[])])
        mock.execute.side_effect = resp
        for u in uids:
            await svc.like_post(u, pid)
        assert len(likes) == len(uids)

    @settings(max_examples=50)
    @given(uid=user_id_st, pid=post_id_st, ops=st.lists(st.sampled_from(["like", "unlike"]), min_size=1, max_size=20))
    @pytest.mark.asyncio
    async def test_like_unlike_sequence(self, uid: str, pid: str, ops: List[str]):
        svc, mock = create_service()
        liked, resp = False, []
        for op in ops:
            if op == "like":
                resp.extend([MagicMock(data=[]), MagicMock(data=[{"id": pid}])])
                if liked:
                    resp.append(MagicMock(data=[{"id": "l1"}]))
                else:
                    resp.extend([MagicMock(data=[]), MagicMock(data=[{"id": "l1"}]), MagicMock(data=[])])
                    liked = True
            else:
                resp.extend([MagicMock(data=[]), MagicMock(data=[])])
                liked = False
        mock.execute.side_effect = resp
        for op in ops:
            await (svc.like_post(uid, pid) if op == "like" else svc.unlike_post(uid, pid))
        exp = ops[-1] == "like" if ops else False
        mock.execute.side_effect = [MagicMock(data=[{"id": "l1"}] if exp else [])]
        assert await svc.is_liked(uid, pid) == exp
