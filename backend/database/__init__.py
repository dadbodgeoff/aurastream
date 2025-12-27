"""
Aurastream - Database Module

Provides database client and service classes for Supabase operations.
"""

from backend.database.supabase_client import (
    get_supabase_client,
    get_anon_client,
    get_supabase_service,
    supabase,
    SupabaseService,
    SupabaseConnectionError,
    SupabaseConfigurationError,
)

__all__ = [
    "get_supabase_client",
    "get_anon_client",
    "get_supabase_service",
    "supabase",
    "SupabaseService",
    "SupabaseConnectionError",
    "SupabaseConfigurationError",
]
