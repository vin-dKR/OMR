import time
import psutil
import threading
from typing import Dict, List, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Performance monitoring and metrics collection"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.start_time = datetime.now()
        
        # Request metrics
        self.request_count = 0
        self.error_count = 0
        self.success_count = 0
        
        # Response time tracking
        self.response_times = deque(maxlen=max_history)
        self.endpoint_times = defaultdict(lambda: deque(maxlen=max_history))
        
        # File processing metrics
        self.files_processed = 0
        self.total_processing_time = 0.0
        self.avg_processing_time = 0.0
        
        # System metrics
        self.system_metrics = deque(maxlen=max_history)
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Start system monitoring
        self._start_system_monitoring()
    
    def _start_system_monitoring(self):
        """Start background system monitoring"""
        def monitor_system():
            while True:
                try:
                    self._collect_system_metrics()
                    time.sleep(60)  # Collect every minute
                except Exception as e:
                    logger.error(f"Error in system monitoring: {e}")
        
        monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        monitor_thread.start()
    
    def _collect_system_metrics(self):
        """Collect current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available": memory.available,
                "memory_total": memory.total,
                "disk_percent": disk.percent,
                "disk_free": disk.free,
                "disk_total": disk.total
            }
            
            with self._lock:
                self.system_metrics.append(metrics)
                
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def record_request(self, endpoint: str, method: str, status_code: int, response_time: float):
        """Record a request and its metrics"""
        with self._lock:
            self.request_count += 1
            
            if 200 <= status_code < 400:
                self.success_count += 1
            else:
                self.error_count += 1
            
            # Record response time
            self.response_times.append(response_time)
            self.endpoint_times[endpoint].append(response_time)
    
    def record_file_processing(self, processing_time: float):
        """Record file processing metrics"""
        with self._lock:
            self.files_processed += 1
            self.total_processing_time += processing_time
            self.avg_processing_time = self.total_processing_time / self.files_processed
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics"""
        with self._lock:
            # Calculate response time statistics
            response_times_list = list(self.response_times)
            avg_response_time = sum(response_times_list) / len(response_times_list) if response_times_list else 0
            min_response_time = min(response_times_list) if response_times_list else 0
            max_response_time = max(response_times_list) if response_times_list else 0
            
            # Calculate endpoint statistics
            endpoint_stats = {}
            for endpoint, times in self.endpoint_times.items():
                times_list = list(times)
                if times_list:
                    endpoint_stats[endpoint] = {
                        "count": len(times_list),
                        "avg_time": sum(times_list) / len(times_list),
                        "min_time": min(times_list),
                        "max_time": max(times_list)
                    }
            
            # Get latest system metrics
            latest_system = self.system_metrics[-1] if self.system_metrics else {}
            
            return {
                "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
                "start_time": self.start_time.isoformat(),
                "requests": {
                    "total": self.request_count,
                    "success": self.success_count,
                    "errors": self.error_count,
                    "success_rate": (self.success_count / self.request_count * 100) if self.request_count > 0 else 0
                },
                "response_times": {
                    "avg": avg_response_time,
                    "min": min_response_time,
                    "max": max_response_time,
                    "recent_count": len(response_times_list)
                },
                "endpoints": endpoint_stats,
                "file_processing": {
                    "files_processed": self.files_processed,
                    "total_processing_time": self.total_processing_time,
                    "avg_processing_time": self.avg_processing_time
                },
                "system": latest_system
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status"""
        metrics = self.get_metrics()
        
        # Define health thresholds
        cpu_threshold = 80  # 80% CPU usage
        memory_threshold = 85  # 85% memory usage
        disk_threshold = 90  # 90% disk usage
        error_rate_threshold = 10  # 10% error rate
        
        system = metrics.get("system", {})
        cpu_percent = system.get("cpu_percent", 0)
        memory_percent = system.get("memory_percent", 0)
        disk_percent = system.get("disk_percent", 0)
        error_rate = metrics["requests"]["success_rate"]
        
        # Determine overall health
        health_issues = []
        
        if cpu_percent > cpu_threshold:
            health_issues.append(f"High CPU usage: {cpu_percent}%")
        
        if memory_percent > memory_threshold:
            health_issues.append(f"High memory usage: {memory_percent}%")
        
        if disk_percent > disk_threshold:
            health_issues.append(f"High disk usage: {disk_percent}%")
        
        if error_rate < (100 - error_rate_threshold):
            health_issues.append(f"High error rate: {100 - error_rate}%")
        
        overall_status = "healthy" if not health_issues else "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "issues": health_issues,
            "metrics": metrics
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()
