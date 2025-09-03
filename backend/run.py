#!/usr/bin/env python3
"""
OMR Sheet Checker Backend - Startup Script

This script starts the FastAPI application with proper configuration.
"""

import uvicorn
import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    print(f"Starting OMR Sheet Checker API...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Reload: {reload}")
    print(f"Log Level: {log_level}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Health Check: http://{host}:{port}/health")
    print("-" * 50)
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )
