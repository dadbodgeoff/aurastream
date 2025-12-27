"""
Password Service for Aurastream Authentication.

This module provides secure password hashing and validation using bcrypt.
Security Note: Never log passwords in any function.
"""

import bcrypt
import re
from dataclasses import dataclass
from typing import List

# Security configuration
BCRYPT_COST_FACTOR = 12
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


@dataclass
class PasswordValidationResult:
    """Result of password strength validation."""
    is_valid: bool
    score: int  # 0-4 strength score
    failed_requirements: List[str]
    suggestions: List[str]


class PasswordService:
    """Service for secure password hashing and validation."""
    
    def __init__(self, cost_factor: int = BCRYPT_COST_FACTOR):
        """
        Initialize the password service.
        
        Args:
            cost_factor: bcrypt cost factor (default: 12)
        """
        self.cost_factor = cost_factor
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with configured cost factor.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password string
            
        Note:
            Each call produces a different hash due to random salt.
        """
        salt = bcrypt.gensalt(rounds=self.cost_factor)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify a password against its hash using timing-safe comparison.
        
        Args:
            password: Plain text password to verify
            hashed: Previously hashed password
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except (ValueError, TypeError):
            # Invalid hash format
            return False
    
    def validate_password_strength(self, password: str) -> PasswordValidationResult:
        """
        Validate password meets security requirements.
        
        Requirements:
        - Minimum 8 characters
        - Maximum 128 characters
        - At least one lowercase letter
        - At least one uppercase letter
        - At least one digit
        - At least one special character (recommended but not required)
        
        Args:
            password: Password to validate
            
        Returns:
            PasswordValidationResult with validation details
        """
        failed_requirements = []
        suggestions = []
        score = 0
        
        # Length checks
        if len(password) < MIN_PASSWORD_LENGTH:
            failed_requirements.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
        else:
            score += 1
            
        if len(password) > MAX_PASSWORD_LENGTH:
            failed_requirements.append(f"Password must be at most {MAX_PASSWORD_LENGTH} characters")
        
        # Character type checks
        if not re.search(r'[a-z]', password):
            failed_requirements.append("Password must contain at least one lowercase letter")
        else:
            score += 1
            
        if not re.search(r'[A-Z]', password):
            failed_requirements.append("Password must contain at least one uppercase letter")
        else:
            score += 1
            
        if not re.search(r'\d', password):
            failed_requirements.append("Password must contain at least one digit")
        else:
            score += 1
        
        # Special character (recommended)
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            suggestions.append("Consider adding a special character for extra security")
        else:
            score += 1
        
        # Common password patterns (basic check)
        common_patterns = ['password', '123456', 'qwerty', 'letmein', 'welcome']
        if any(pattern in password.lower() for pattern in common_patterns):
            suggestions.append("Avoid common password patterns")
            score = max(0, score - 1)
        
        # Length bonus
        if len(password) >= 12:
            score = min(5, score + 1)
        if len(password) >= 16:
            score = min(5, score + 1)
        
        # Normalize score to 0-4
        score = min(4, score)
        
        return PasswordValidationResult(
            is_valid=len(failed_requirements) == 0,
            score=score,
            failed_requirements=failed_requirements,
            suggestions=suggestions
        )
    
    def get_strength_label(self, score: int) -> str:
        """
        Get human-readable strength label from score.
        
        Args:
            score: Password strength score (0-4)
            
        Returns:
            Human-readable strength label
        """
        labels = {
            0: "Very Weak",
            1: "Weak", 
            2: "Fair",
            3: "Strong",
            4: "Very Strong"
        }
        return labels.get(score, "Unknown")


# Singleton instance for convenience
password_service = PasswordService()
