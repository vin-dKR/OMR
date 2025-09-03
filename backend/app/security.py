import re
import os
from typing import Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Try to import python-magic, fallback to mimetypes if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    import mimetypes
    MAGIC_AVAILABLE = False
    logger.warning("python-magic not available, using mimetypes fallback")

class SecurityMiddleware:
    """Security middleware for additional protection"""
    
    def __init__(self):
        # Malicious file patterns
        self.malicious_patterns = [
            r'\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$',
            r'<script',
            r'javascript:',
            r'vbscript:',
            r'data:text/html',
            r'data:application/x-javascript'
        ]
        
        # Compile patterns for efficiency
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.malicious_patterns]
    
    def add_security_headers(self, response: Response) -> Response:
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Add basic security headers for all responses
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
    
    def validate_filename(self, filename: str) -> bool:
        """Validate filename for malicious patterns"""
        if not filename:
            return False
        
        # Check for malicious patterns
        for pattern in self.compiled_patterns:
            if pattern.search(filename):
                logger.warning(f"Malicious filename detected: {filename}")
                return False
        
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            logger.warning(f"Path traversal attempt in filename: {filename}")
            return False
        
        return True
    
    def sanitize_input(self, text: str) -> str:
        """Basic input sanitization"""
        if not text:
            return ""
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Remove control characters (except newlines and tabs)
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        return text.strip()
    
    def validate_content_type(self, content_type: str) -> bool:
        """Validate content type for file uploads"""
        allowed_types = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/bmp',
            'multipart/form-data'
        ]
        
        return content_type.lower() in allowed_types
    
    def validate_file_type(self, file_bytes: bytes) -> bool:
        """Validate file type using magic numbers or mimetypes"""
        if MAGIC_AVAILABLE:
            try:
                file_type = magic.from_buffer(file_bytes, mime=True)
                allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
                return file_type in allowed_types
            except Exception as e:
                logger.warning(f"Error using python-magic: {e}")
                return self._fallback_file_validation(file_bytes)
        else:
            return self._fallback_file_validation(file_bytes)
    
    def _fallback_file_validation(self, file_bytes: bytes) -> bool:
        """Fallback file validation using file signatures"""
        if len(file_bytes) < 4:
            return False
        
        # Check file signatures (magic numbers)
        signatures = {
            b'\xff\xd8\xff': 'JPEG',
            b'\x89PNG\r\n\x1a\n': 'PNG',
            b'BM': 'BMP'
        }
        
        for signature, format_name in signatures.items():
            if file_bytes.startswith(signature):
                logger.info(f"Detected {format_name} file using signature")
                return True
        
        logger.warning("Unknown file type detected")
        return False
    
    def check_request_size(self, content_length: Optional[int], max_size: int = 10 * 1024 * 1024) -> bool:
        """Check if request size is within limits"""
        if content_length is None:
            return True  # Allow if no content length header
        
        return content_length <= max_size


# Global security instance
security = SecurityMiddleware()
