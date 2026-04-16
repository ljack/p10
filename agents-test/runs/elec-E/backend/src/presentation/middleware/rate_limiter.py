"""Rate limiting middleware."""
from fastapi import Request, HTTPException
from time import time
from collections import defaultdict


class RateLimiter:
    """Simple rate limiter (10 req/s per client)."""
    
    def __init__(self, max_requests: int = 10, window: int = 1) -> None:
        """Initialize rate limiter.
        
        Args:
            max_requests: Max requests per window
            window: Time window in seconds
        """
        self.max_requests = max_requests
        self.window = window
        self._requests: dict = defaultdict(list)
    
    async def __call__(self, request: Request) -> None:
        """Check rate limit.
        
        Args:
            request: FastAPI request
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        client = request.client.host
        now = time()
        
        requests = self._requests[client]
        requests = [r for r in requests if r > now - self.window]
        
        if len(requests) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": 4001,
                    "message": "Rate limit exceeded",
                    "details": {"limit": self.max_requests},
                    "suggestion": "Please wait before making more requests"
                }
            )
        
        requests.append(now)
        self._requests[client] = requests
