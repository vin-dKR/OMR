import logging
import logging.handlers
import os
from datetime import datetime
from typing import Dict, Any
import json

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Create structured log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry)

def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    max_file_size: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> None:
    """Setup comprehensive logging configuration"""
    
    # Create logs directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler with colored output
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler for all logs
    all_logs_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "omr_checker.log"),
        maxBytes=max_file_size,
        backupCount=backup_count
    )
    all_logs_handler.setLevel(logging.DEBUG)
    all_logs_formatter = StructuredFormatter()
    all_logs_handler.setFormatter(all_logs_formatter)
    root_logger.addHandler(all_logs_handler)
    
    # Error logs handler
    error_logs_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "errors.log"),
        maxBytes=max_file_size,
        backupCount=backup_count
    )
    error_logs_handler.setLevel(logging.ERROR)
    error_logs_formatter = StructuredFormatter()
    error_logs_handler.setFormatter(error_logs_formatter)
    root_logger.addHandler(error_logs_handler)
    
    # Access logs handler
    access_logs_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "access.log"),
        maxBytes=max_file_size,
        backupCount=backup_count
    )
    access_logs_handler.setLevel(logging.INFO)
    access_logs_formatter = StructuredFormatter()
    access_logs_handler.setFormatter(access_logs_formatter)
    root_logger.addHandler(access_logs_handler)

class LoggerMixin:
    """Mixin class to add structured logging capabilities"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def log_info(self, message: str, **extra_fields):
        """Log info message with extra fields"""
        record = self.logger.makeRecord(
            self.logger.name, logging.INFO, "", 0, message, (), None
        )
        record.extra_fields = extra_fields
        self.logger.handle(record)
    
    def log_error(self, message: str, **extra_fields):
        """Log error message with extra fields"""
        record = self.logger.makeRecord(
            self.logger.name, logging.ERROR, "", 0, message, (), None
        )
        record.extra_fields = extra_fields
        self.logger.handle(record)
    
    def log_warning(self, message: str, **extra_fields):
        """Log warning message with extra fields"""
        record = self.logger.makeRecord(
            self.logger.name, logging.WARNING, "", 0, message, (), None
        )
        record.extra_fields = extra_fields
        self.logger.handle(record)
