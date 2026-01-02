"""
Creator Intel V2 - Custom Exceptions

Enterprise-grade exception hierarchy for the Creator Intel system.
All exceptions inherit from IntelError for consistent error handling.
"""

from typing import Optional, Dict, Any


class IntelError(Exception):
    """
    Base exception for all Creator Intel errors.
    
    Attributes:
        message: Human-readable error description
        code: Machine-readable error code
        details: Additional context for debugging
    """
    
    def __init__(
        self,
        message: str,
        code: str = "INTEL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize the exception.
        
        Args:
            message: Human-readable error description
            code: Machine-readable error code for programmatic handling
            details: Additional context dictionary for debugging
        """
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.code,
            "message": self.message,
            "details": self.details,
        }
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(code={self.code!r}, message={self.message!r})"


class IntelConfigError(IntelError):
    """
    Raised when there's a configuration error.
    
    Examples:
        - Missing required environment variables
        - Invalid configuration values
        - Incompatible settings
    """
    
    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize configuration error.
        
        Args:
            message: Description of the configuration issue
            config_key: The specific configuration key that's problematic
            details: Additional context
        """
        full_details = details or {}
        if config_key:
            full_details["config_key"] = config_key
        
        super().__init__(
            message=message,
            code="INTEL_CONFIG_ERROR",
            details=full_details,
        )
        self.config_key = config_key


class IntelDataError(IntelError):
    """
    Raised when there's an issue with data processing.
    
    Examples:
        - Missing required data
        - Invalid data format
        - Data validation failures
    """
    
    def __init__(
        self,
        message: str,
        category_key: Optional[str] = None,
        data_source: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize data error.
        
        Args:
            message: Description of the data issue
            category_key: The category being processed
            data_source: Source of the problematic data (e.g., "redis", "youtube")
            details: Additional context
        """
        full_details = details or {}
        if category_key:
            full_details["category_key"] = category_key
        if data_source:
            full_details["data_source"] = data_source
        
        super().__init__(
            message=message,
            code="INTEL_DATA_ERROR",
            details=full_details,
        )
        self.category_key = category_key
        self.data_source = data_source


class IntelQuotaError(IntelError):
    """
    Raised when API quota is exhausted or insufficient.
    
    Examples:
        - YouTube daily quota exceeded
        - Twitch rate limit hit
        - Insufficient quota for operation
    """
    
    def __init__(
        self,
        message: str,
        platform: str,
        units_required: Optional[int] = None,
        units_remaining: Optional[int] = None,
        reset_time: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize quota error.
        
        Args:
            message: Description of the quota issue
            platform: The platform with quota issues (e.g., "youtube", "twitch")
            units_required: How many units the operation needed
            units_remaining: How many units are left
            reset_time: When the quota resets (ISO format)
            details: Additional context
        """
        full_details = details or {}
        full_details["platform"] = platform
        if units_required is not None:
            full_details["units_required"] = units_required
        if units_remaining is not None:
            full_details["units_remaining"] = units_remaining
        if reset_time:
            full_details["reset_time"] = reset_time
        
        super().__init__(
            message=message,
            code="INTEL_QUOTA_ERROR",
            details=full_details,
        )
        self.platform = platform
        self.units_required = units_required
        self.units_remaining = units_remaining
        self.reset_time = reset_time


class IntelTimeoutError(IntelError):
    """
    Raised when an operation times out.
    
    Examples:
        - API request timeout
        - Analysis taking too long
        - Database query timeout
    """
    
    def __init__(
        self,
        message: str,
        operation: str,
        timeout_seconds: float,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize timeout error.
        
        Args:
            message: Description of what timed out
            operation: The operation that timed out
            timeout_seconds: The timeout threshold that was exceeded
            details: Additional context
        """
        full_details = details or {}
        full_details["operation"] = operation
        full_details["timeout_seconds"] = timeout_seconds
        
        super().__init__(
            message=message,
            code="INTEL_TIMEOUT_ERROR",
            details=full_details,
        )
        self.operation = operation
        self.timeout_seconds = timeout_seconds


class IntelCircuitOpenError(IntelError):
    """
    Raised when circuit breaker is open and operation is rejected.
    
    The circuit breaker pattern prevents cascading failures by
    temporarily rejecting operations when a service is unhealthy.
    """
    
    def __init__(
        self,
        message: str,
        service: str,
        open_until: Optional[str] = None,
        failure_count: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize circuit open error.
        
        Args:
            message: Description of why circuit is open
            service: The service that's protected by the circuit breaker
            open_until: When the circuit will attempt to close (ISO format)
            failure_count: Number of consecutive failures that opened the circuit
            details: Additional context
        """
        full_details = details or {}
        full_details["service"] = service
        if open_until:
            full_details["open_until"] = open_until
        if failure_count is not None:
            full_details["failure_count"] = failure_count
        
        super().__init__(
            message=message,
            code="INTEL_CIRCUIT_OPEN",
            details=full_details,
        )
        self.service = service
        self.open_until = open_until
        self.failure_count = failure_count


class IntelAnalysisError(IntelError):
    """
    Raised when analysis fails for a specific category.
    
    Examples:
        - Insufficient data for analysis
        - Analysis algorithm failure
        - Invalid analysis parameters
    """
    
    def __init__(
        self,
        message: str,
        analyzer_name: str,
        category_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize analysis error.
        
        Args:
            message: Description of the analysis failure
            analyzer_name: Name of the analyzer that failed
            category_key: The category being analyzed
            details: Additional context
        """
        full_details = details or {}
        full_details["analyzer"] = analyzer_name
        if category_key:
            full_details["category_key"] = category_key
        
        super().__init__(
            message=message,
            code="INTEL_ANALYSIS_ERROR",
            details=full_details,
        )
        self.analyzer_name = analyzer_name
        self.category_key = category_key


class IntelStorageError(IntelError):
    """
    Raised when storage operations fail.
    
    Examples:
        - Redis connection failure
        - PostgreSQL write failure
        - S3 upload failure
    """
    
    def __init__(
        self,
        message: str,
        storage_type: str,
        operation: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize storage error.
        
        Args:
            message: Description of the storage failure
            storage_type: Type of storage (e.g., "redis", "postgresql", "s3")
            operation: The operation that failed (e.g., "read", "write", "delete")
            details: Additional context
        """
        full_details = details or {}
        full_details["storage_type"] = storage_type
        full_details["operation"] = operation
        
        super().__init__(
            message=message,
            code="INTEL_STORAGE_ERROR",
            details=full_details,
        )
        self.storage_type = storage_type
        self.operation = operation
