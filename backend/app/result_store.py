import time
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

class ResultStore:
    """Simple in-memory result store with expiration"""
    
    def __init__(self, expiration_hours: int = 24):
        self.results: Dict[str, Dict[str, Any]] = {}
        self.expiration_hours = expiration_hours
    
    def store_result(self, result_data: Dict[str, Any]) -> str:
        """Store a result and return its ID"""
        result_id = str(uuid.uuid4())
        
        self.results[result_id] = {
            "data": result_data,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=self.expiration_hours)
        }
        
        logger.info(f"Stored result with ID: {result_id}")
        return result_id
    
    def get_result(self, result_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a result by ID"""
        if result_id not in self.results:
            return None
        
        result = self.results[result_id]
        
        # Check if expired
        if datetime.now() > result["expires_at"]:
            del self.results[result_id]
            logger.info(f"Result {result_id} expired and was removed")
            return None
        
        logger.info(f"Retrieved result with ID: {result_id}")
        return result["data"]
    
    def delete_result(self, result_id: str) -> bool:
        """Delete a result by ID"""
        if result_id in self.results:
            del self.results[result_id]
            logger.info(f"Deleted result with ID: {result_id}")
            return True
        return False
    
    def cleanup_expired(self) -> int:
        """Remove expired results and return count of removed items"""
        current_time = datetime.now()
        expired_ids = [
            result_id for result_id, result in self.results.items()
            if current_time > result["expires_at"]
        ]
        
        for result_id in expired_ids:
            del self.results[result_id]
        
        if expired_ids:
            logger.info(f"Cleaned up {len(expired_ids)} expired results")
        
        return len(expired_ids)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get store statistics"""
        current_time = datetime.now()
        active_results = len(self.results)
        expired_results = sum(
            1 for result in self.results.values()
            if current_time > result["expires_at"]
        )
        
        return {
            "total_results": active_results + expired_results,
            "active_results": active_results,
            "expired_results": expired_results,
            "expiration_hours": self.expiration_hours
        }


# Global result store instance
result_store = ResultStore()
