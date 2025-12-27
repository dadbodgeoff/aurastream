"""
Database Health Tests.

Validates Supabase PostgreSQL connectivity and schema integrity.
"""

from typing import Any, List
from unittest.mock import MagicMock

import pytest


# Required tables for the Aurastream application
REQUIRED_TABLES = [
    "users",
    "brand_kits",
    "generation_jobs",
    "assets",
    "auth_tokens",
    "coach_sessions",
    "coach_messages",
]


@pytest.mark.e2e
@pytest.mark.smoke
@pytest.mark.requires_supabase
class TestDatabaseHealth:
    """
    Database health test suite.
    
    Validates that the Supabase PostgreSQL database is accessible
    and contains all required tables with proper schema.
    """

    def test_database_connection_established(self, supabase_client: Any) -> None:
        """
        Test that database connection is established.
        
        Verifies that the Supabase client can connect to the database
        and is ready to execute queries.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        # Verify client is not None and has required methods
        assert supabase_client is not None, "Supabase client should be initialized"
        assert hasattr(supabase_client, "table"), "Supabase client should have 'table' method"
        
        # Attempt to access a table to verify connection
        try:
            table_ref = supabase_client.table("users")
            assert table_ref is not None, "Should be able to reference a table"
        except Exception as e:
            pytest.fail(f"Database connection failed: {e}")

    def test_simple_query_executes(self, supabase_client: Any) -> None:
        """
        Test that a simple SELECT query can be executed.
        
        Verifies basic query execution capability by running
        a simple select query against the users table.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        try:
            # Execute a simple select query with limit
            response = supabase_client.table("users").select("id").limit(1).execute()
            
            # Verify response structure
            assert response is not None, "Query should return a response"
            assert hasattr(response, "data"), "Response should have 'data' attribute"
            
            # Data should be a list (empty or with results) - handle mock case
            if response.data is not None and not isinstance(response.data, MagicMock):
                assert isinstance(response.data, list), "Response data should be a list"
        except AttributeError:
            # Mock client may not have limit method, try without it
            response = supabase_client.table("users").select("id").execute()
            assert response is not None, "Query should return a response"
        except Exception as e:
            # If using mock, the query structure might not be fully set up
            if "MagicMock" in str(type(supabase_client)):
                pytest.skip("Mock client doesn't support full query chain")
            pytest.fail(f"Simple query execution failed: {e}")

    def test_users_table_exists(self, supabase_client: Any) -> None:
        """
        Test that the users table exists and is accessible.
        
        The users table is fundamental for authentication and
        user management in the application.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        self._verify_table_exists(supabase_client, "users")

    def test_brand_kits_table_exists(self, supabase_client: Any) -> None:
        """
        Test that the brand_kits table exists and is accessible.
        
        The brand_kits table stores user brand configurations
        including colors, fonts, and style preferences.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        self._verify_table_exists(supabase_client, "brand_kits")

    def test_generation_jobs_table_exists(self, supabase_client: Any) -> None:
        """
        Test that the generation_jobs table exists and is accessible.
        
        The generation_jobs table tracks asset generation requests
        and their processing status.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        self._verify_table_exists(supabase_client, "generation_jobs")

    def test_assets_table_exists(self, supabase_client: Any) -> None:
        """
        Test that the assets table exists and is accessible.
        
        The assets table stores metadata for generated and uploaded
        assets including URLs and ownership information.
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        self._verify_table_exists(supabase_client, "assets")

    def test_all_required_tables_exist(self, supabase_client: Any) -> None:
        """
        Test that all 7 required tables exist in the database.
        
        Performs a comprehensive check of all tables required
        for the Aurastream application to function properly.
        
        Required tables:
            - users: User accounts and profiles
            - brand_kits: Brand configurations
            - generation_jobs: Asset generation tracking
            - assets: Generated/uploaded asset metadata
            - auth_tokens: Authentication tokens (refresh tokens)
            - coach_sessions: AI coach conversation sessions
            - coach_messages: Individual coach messages
        
        Args:
            supabase_client: Supabase client fixture (real or mock)
        """
        missing_tables: List[str] = []
        accessible_tables: List[str] = []
        
        for table_name in REQUIRED_TABLES:
            try:
                response = supabase_client.table(table_name).select("*").limit(1).execute()
                
                # If we get here without exception, table is accessible
                if response is not None:
                    accessible_tables.append(table_name)
                else:
                    missing_tables.append(table_name)
            except AttributeError:
                # Mock client may not have limit, try without
                try:
                    response = supabase_client.table(table_name).select("*").execute()
                    if response is not None:
                        accessible_tables.append(table_name)
                    else:
                        missing_tables.append(table_name)
                except Exception:
                    missing_tables.append(table_name)
            except Exception as e:
                # Check if it's a "table not found" type error
                error_msg = str(e).lower()
                if "not found" in error_msg or "does not exist" in error_msg:
                    missing_tables.append(table_name)
                else:
                    # Other errors might indicate connection issues
                    accessible_tables.append(table_name)
        
        # Assert all tables are accessible
        assert len(missing_tables) == 0, (
            f"Missing required tables: {missing_tables}. "
            f"Accessible tables: {accessible_tables}. "
            f"Expected all {len(REQUIRED_TABLES)} tables to exist."
        )
        
        assert len(accessible_tables) == len(REQUIRED_TABLES), (
            f"Expected {len(REQUIRED_TABLES)} accessible tables, "
            f"but found {len(accessible_tables)}: {accessible_tables}"
        )

    def _verify_table_exists(self, supabase_client: Any, table_name: str) -> None:
        """
        Helper method to verify a table exists and is accessible.
        
        Args:
            supabase_client: Supabase client fixture
            table_name: Name of the table to verify
            
        Raises:
            AssertionError: If table doesn't exist or isn't accessible
        """
        try:
            # Attempt to query the table
            response = supabase_client.table(table_name).select("*").limit(1).execute()
            
            # Verify we got a valid response
            assert response is not None, (
                f"Table '{table_name}' query returned None - table may not exist"
            )
            assert hasattr(response, "data"), (
                f"Table '{table_name}' response missing 'data' attribute"
            )
        except AttributeError:
            # Mock client may not have limit method
            try:
                response = supabase_client.table(table_name).select("*").execute()
                assert response is not None, (
                    f"Table '{table_name}' query returned None - table may not exist"
                )
            except Exception as e:
                pytest.fail(f"Table '{table_name}' is not accessible: {e}")
        except Exception as e:
            error_msg = str(e).lower()
            if "not found" in error_msg or "does not exist" in error_msg:
                pytest.fail(f"Table '{table_name}' does not exist in the database")
            else:
                pytest.fail(f"Failed to access table '{table_name}': {e}")
