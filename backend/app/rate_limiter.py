import time
from typing import Dict, Tuple
from datetime import datetime, timedelta
import logging
from fastapi import Request, HTTPException
from collections import defaultdict

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests: Dict[str, list] = defaultdict(list)
        self.hour_requests: Dict[str, list] = defaultdict(list)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded headers (for proxy/load balancer setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def _cleanup_old_requests(self, client_ip: str):
        """Remove old requests outside the time windows"""
        current_time = time.time()
        
        # Clean minute requests (older than 60 seconds)
        self.minute_requests[client_ip] = [
            req_time for req_time in self.minute_requests[client_ip]
            if current_time - req_time < 60
        ]
        
        # Clean hour requests (older than 3600 seconds)
        self.hour_requests[client_ip] = [
            req_time for req_time in self.hour_requests[client_ip]
            if current_time - req_time < 3600
        ]
    
    def is_allowed(self, request: Request) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed based on rate limits"""
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean up old requests
        self._cleanup_old_requests(client_ip)
        
        # Add current request
        self.minute_requests[client_ip].append(current_time)
        self.hour_requests[client_ip].append(current_time)
        
        # Check limits
        minute_count = len(self.minute_requests[client_ip])
        hour_count = len(self.hour_requests[client_ip])
        
        minute_allowed = minute_count <= self.requests_per_minute
        hour_allowed = hour_count <= self.requests_per_hour
        
        is_allowed = minute_allowed and hour_allowed
        
        limits_info = {
            "minute_requests": minute_count,
            "minute_limit": self.requests_per_minute,
            "hour_requests": hour_count,
            "hour_limit": self.requests_per_hour
        }
        
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for {client_ip}: {limits_info}")
        
        return is_allowed, limits_info


# Global rate limiter instance
rate_limiter = RateLimiter()
