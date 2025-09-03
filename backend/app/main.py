import logging
import time
from typing import Dict, Any
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime

from .omr_processor import process_omr_sheet, validate_image_file, OMRProcessingError, FileValidationError
from .result_store import result_store
from .rate_limiter import rate_limiter
from .security import security
from .logging_config import setup_logging
from .monitoring import performance_monitor
from .docs import TAGS_METADATA, ENDPOINT_DESCRIPTIONS

# Configure enhanced logging
setup_logging(log_level="INFO", log_dir="logs")
logger = logging.getLogger(__name__)

# Create FastAPI app with enhanced documentation
app = FastAPI(
    title="OMR Sheet Checker API",
    description="""
    # OMR Sheet Checker API
    
    An AI-powered backend service for processing OMR (Optical Mark Recognition) sheets using computer vision.
    
    ## Features
    
    - **Image Processing**: Supports JPG, PNG, and BMP image formats
    - **Flexible Configuration**: Configurable number of questions and options
    - **Enhanced Validation**: File format and size validation
    - **Result Storage**: Temporary storage with automatic expiration
    - **Comprehensive Logging**: Request/response logging with performance metrics
    - **Security Features**: Rate limiting, input sanitization, security headers
    - **File Security**: Malicious file detection and validation
    
    ## Quick Start
    
    1. **Process an OMR sheet**: `POST /process_omr`
    2. **Check service health**: `GET /health`
    3. **View metrics**: `GET /metrics`
    4. **API Documentation**: `GET /docs`
    
    ## Image Requirements
    
    - Clear, well-lit image of the complete OMR sheet
    - Bubbles should be clearly visible and properly aligned
    - Sheet should have distinct borders for detection
    - Recommended resolution: 300+ DPI for best results
    - Maximum file size: 10MB
    
    ## Rate Limits
    
    - 60 requests per minute per IP
    - 1000 requests per hour per IP
    
    For more information, see the detailed endpoint documentation below.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=TAGS_METADATA
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging and security middleware
@app.middleware("http")
async def log_requests_and_security(request: Request, call_next):
    start_time = time.time()
    
    # Rate limiting check
    is_allowed, limits_info = rate_limiter.is_allowed(request)
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for {request.client.host}")
        return JSONResponse(
            status_code=429,
            content={
                "status": "error",
                "message": "Rate limit exceeded. Please try again later.",
                "limits": limits_info,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    # Request size validation
    content_length = request.headers.get("content-length")
    if content_length and not security.check_request_size(int(content_length)):
        logger.warning(f"Request too large from {request.client.host}")
        return JSONResponse(
            status_code=413,
            content={
                "status": "error",
                "message": "Request too large. Maximum file size is 10MB.",
                "timestamp": datetime.now().isoformat()
            }
        )
    
    # Log request with structured data
    logger.info(
        f"Request: {request.method} {request.url}",
        extra={
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "content_length": content_length
        }
    )
    
    response = await call_next(request)
    
    # Add basic security headers (simplified to avoid StreamingResponse issues)
    try:
        if "/docs" in str(request.url) or "/redoc" in str(request.url) or "/openapi.json" in str(request.url):
            # More permissive CSP for documentation endpoints
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' https://fastapi.tiangolo.com; "
                "font-src 'self' https://cdn.jsdelivr.net; "
                "connect-src 'self'"
            )
        else:
            # Basic security headers for API endpoints
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
    except Exception as e:
        # If there's any issue with headers, just continue
        logger.warning(f"Could not add security headers: {e}")
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Record metrics
    performance_monitor.record_request(
        endpoint=str(request.url.path),
        method=request.method,
        status_code=response.status_code,
        response_time=process_time
    )
    
    # Log response with structured data
    logger.info(
        f"Response: {response.status_code} - Process time: {process_time:.3f}s",
        extra={
            "status_code": response.status_code,
            "process_time": process_time,
            "client_ip": request.client.host
        }
    )
    
    return response


@app.get("/", tags=["API Information"])
async def root():
    """Root endpoint with comprehensive API information"""
    return {
        "message": "OMR Sheet Checker API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "description": "AI-powered OMR sheet processing service with computer vision",
        "features": [
            "Image Processing (JPG, PNG, BMP)",
            "Flexible Configuration",
            "Enhanced Validation",
            "Result Storage",
            "Comprehensive Logging",
            "Security Features",
            "File Security"
        ],
        "security": {
            "rate_limiting": "enabled",
            "file_validation": "enabled",
            "security_headers": "enabled",
            "input_sanitization": "enabled"
        },
        "endpoints": {
            "omr_processing": {
                "process_omr": "/process_omr"
            },
            "results": {
                "get_result": "/results/{result_id}",
                "delete_result": "/results/{result_id}"
            },
            "monitoring": {
                "health": "/health",
                "metrics": "/metrics",
                "stats": "/stats"
            },
            "security": {
                "rate_limits": "/security/limits"
            },
            "documentation": {
                "swagger_ui": "/docs",
                "redoc": "/redoc"
            }
        },
        "rate_limits": {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "file_size_limit": "10MB"
        },
        "supported_formats": ["JPG", "PNG", "BMP"]
    }


@app.post("/process_omr", tags=["OMR Processing"])
async def process_omr(
    file: UploadFile = File(..., description="OMR sheet image file (JPG, PNG, BMP)"),
    num_questions: int = Form(..., description="Total number of questions on the sheet", gt=0),
    num_options: int = Form(..., description="Number of options per question (e.g., 4 for A-D)", gt=0),
    min_pixel_threshold: int = Form(500, description="Minimum pixels to count a bubble as marked", gt=0),
    debug_mode: bool = Form(False, description="Enable debug mode for detailed processing information")
):
    """
    Process an OMR sheet image and extract marked answers.
    
    This endpoint accepts an image file of a filled OMR sheet and uses computer vision
    to detect and analyze marked bubbles, returning structured results with confidence scores.
    
    **Features:**
    - Supports JPG, PNG, and BMP image formats
    - Automatic sheet detection and perspective correction
    - Configurable number of questions and options
    - Confidence scoring for each answer
    - Processing time and metadata tracking
    
    **Image Requirements:**
    - Clear, well-lit image of the complete OMR sheet
    - Bubbles should be clearly visible and properly aligned
    - Sheet should have distinct borders for detection
    - Recommended resolution: 300+ DPI for best results
    
    **Processing Steps:**
    1. Image preprocessing and noise reduction
    2. Sheet outline detection and perspective correction
    3. Bubble detection and filtering
    4. Answer extraction with confidence scoring
    5. Result validation and metadata generation
    """
    try:
        # Validate filename
        if not security.validate_filename(file.filename):
            raise HTTPException(status_code=400, detail="Invalid filename detected")
        
        # Validate content type
        if not security.validate_content_type(file.content_type):
            raise HTTPException(status_code=400, detail="Invalid content type")
        
        # Read file content
        file_content = await file.read()
        
        # Validate file
        is_valid, error_message = validate_image_file(file_content)
        if not is_valid:
            logger.warning(f"File validation failed: {error_message}")
            raise HTTPException(status_code=400, detail=error_message)
        
        # Process OMR sheet
        logger.info(
            f"Processing OMR sheet: {file.filename}",
            extra={
                "file_name": file.filename,
                "num_questions": num_questions,
                "num_options": num_options,
                "file_size": len(file_content)
            }
        )
        
        result = process_omr_sheet(
            image_bytes=file_content,
            num_questions=num_questions,
            num_options=num_options,
            min_pixel_threshold=min_pixel_threshold,
            debug_mode=debug_mode
        )
        
        # Record file processing metrics
        processing_time = result["metadata"]["processing_time_seconds"]
        performance_monitor.record_file_processing(processing_time)
        
        # Store result and get ID
        result_id = result_store.store_result({
            "filename": file.filename,
            "timestamp": datetime.now().isoformat(),
            **result
        })
        
        # Prepare success response
        response_data = {
            "status": "success",
            "result_id": result_id,
            "filename": file.filename,
            "timestamp": datetime.now().isoformat(),
            **result
        }
        
        logger.info(f"Successfully processed OMR sheet: {file.filename} with result ID: {result_id}")
        return JSONResponse(content=response_data, status_code=200)
        
    except FileValidationError as e:
        logger.error(f"File validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except OMRProcessingError as e:
        logger.error(f"OMR processing error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
        
    except Exception as e:
        logger.error(f"Unexpected error processing OMR sheet: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during OMR processing")


@app.get("/health", tags=["Monitoring"])
async def health_check():
    """
    Check the health and status of the OMR Sheet Checker service.
    
    This endpoint provides comprehensive health information including:
    - Service status and uptime
    - System performance metrics
    - Dependency availability
    - Result store statistics
    - Health issues and warnings
    
    **Health Status Levels:**
    - **healthy**: All systems operating normally
    - **degraded**: Some issues detected but service is functional
    - **unhealthy**: Critical issues affecting service operation
    
    **Performance Metrics:**
    - Request success rate
    - Average response times
    - Files processed count
    - System resource usage
    """
    try:
        # Clean up expired results
        expired_count = result_store.cleanup_expired()
        
        # Get performance metrics
        health_status = performance_monitor.get_health_status()
        
        # Basic health check
        health_data = {
            "status": health_status["status"],
            "timestamp": datetime.now().isoformat(),
            "service": "OMR Sheet Checker API",
            "version": "1.0.0",
            "uptime_seconds": health_status["metrics"]["uptime_seconds"],
            "dependencies": {
                "opencv": "available",
                "numpy": "available",
                "imutils": "available"
            },
            "result_store": result_store.get_stats(),
            "expired_results_cleaned": expired_count,
            "health_issues": health_status["issues"],
            "performance": {
                "requests_total": health_status["metrics"]["requests"]["total"],
                "success_rate": round(health_status["metrics"]["requests"]["success_rate"], 2),
                "avg_response_time": round(health_status["metrics"]["response_times"]["avg"], 3),
                "files_processed": health_status["metrics"]["file_processing"]["files_processed"]
            }
        }
        
        logger.info("Health check requested", extra={"health_status": health_status["status"]})
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """
    Get detailed performance metrics and statistics.
    
    This endpoint provides comprehensive metrics for monitoring and analysis:
    - Request statistics and success rates
    - Response time analysis
    - Endpoint-specific performance
    - File processing statistics
    - System resource metrics
    
    **Use Cases:**
    - Performance monitoring dashboards
    - Capacity planning and scaling decisions
    - Troubleshooting performance issues
    - SLA monitoring and reporting
    """
    try:
        metrics = performance_monitor.get_metrics()
        
        logger.info("Metrics requested")
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving metrics")


@app.get("/stats", tags=["Monitoring"])
async def get_stats():
    """
    Get simplified statistics for monitoring dashboards.
    
    This endpoint provides key performance indicators and system status
    in a simplified format suitable for monitoring dashboards and alerts.
    
    **Key Metrics:**
    - Uptime and service availability
    - Request rate and success rate
    - Average response times
    - File processing statistics
    - System resource usage
    """
    try:
        metrics = performance_monitor.get_metrics()
        
        # Extract key statistics
        stats = {
            "uptime_seconds": metrics["uptime_seconds"],
            "requests_per_minute": metrics["requests"]["total"] / max(metrics["uptime_seconds"] / 60, 1),
            "success_rate": round(metrics["requests"]["success_rate"], 2),
            "avg_response_time": round(metrics["response_times"]["avg"], 3),
            "files_processed": metrics["file_processing"]["files_processed"],
            "avg_processing_time": round(metrics["file_processing"]["avg_processing_time"], 3),
            "system": metrics.get("system", {})
        }
        
        logger.info("Statistics requested")
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving statistics")


@app.get("/results/{result_id}", tags=["Results"])
async def get_result(result_id: str):
    """
    Retrieve a stored OMR processing result by ID.
    
    Results are stored temporarily and expire after 24 hours.
    
    **Parameters:**
    - **result_id**: The unique ID returned from the /process_omr endpoint
    
    **Returns:**
    - The complete processing result including responses and metadata
    
    **Storage Details:**
    - Results are stored in memory with automatic cleanup
    - Expiration time: 24 hours from creation
    - Automatic cleanup of expired results
    """
    try:
        result = result_store.get_result(result_id)
        
        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Result with ID '{result_id}' not found or has expired"
            )
        
        logger.info(f"Retrieved result with ID: {result_id}")
        return {
            "status": "success",
            "result_id": result_id,
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving result {result_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving result")


@app.delete("/results/{result_id}", tags=["Results"])
async def delete_result(result_id: str):
    """
    Delete a stored OMR processing result by ID.
    
    **Parameters:**
    - **result_id**: The unique ID of the result to delete
    
    **Returns:**
    - Success message if deleted, 404 if not found
    
    **Usage:**
    - Manually remove results before expiration
    - Free up memory resources
    - Clean up sensitive data
    """
    try:
        deleted = result_store.delete_result(result_id)
        
        if not deleted:
            raise HTTPException(
                status_code=404, 
                detail=f"Result with ID '{result_id}' not found"
            )
        
        logger.info(f"Deleted result with ID: {result_id}")
        return {
            "status": "success",
            "message": f"Result with ID '{result_id}' deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting result {result_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting result")


@app.get("/security/limits", tags=["Security"])
async def get_rate_limits(request: Request):
    """
    Get current rate limit information for the requesting client.
    
    **Returns:**
    - Current rate limit status and usage
    
    **Rate Limits:**
    - 60 requests per minute per IP address
    - 1000 requests per hour per IP address
    - Automatic cleanup of old request records
    
    **Usage:**
    - Monitor your current rate limit usage
    - Plan request patterns to avoid limits
    - Debug rate limiting issues
    """
    try:
        client_ip = request.client.host if request.client else "unknown"
        is_allowed, limits_info = rate_limiter.is_allowed(request)
        
        return {
            "status": "success",
            "client_ip": client_ip,
            "rate_limit_status": "allowed" if is_allowed else "exceeded",
            "limits": limits_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting rate limits: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving rate limit information")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging"""
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
