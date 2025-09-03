"""
Enhanced API Documentation for OMR Sheet Checker

This module provides detailed documentation, examples, and schemas for the API.
"""

from typing import Dict, Any

# API Tags for organization
TAGS_METADATA = [
    {
        "name": "OMR Processing",
        "description": "Core OMR sheet processing operations",
    },
    {
        "name": "Results",
        "description": "Result storage and retrieval operations",
    },
    {
        "name": "Monitoring",
        "description": "Health checks, metrics, and system monitoring",
    },
    {
        "name": "Security",
        "description": "Security and rate limiting information",
    },
]

# Detailed endpoint descriptions
ENDPOINT_DESCRIPTIONS = {
    "process_omr": {
        "summary": "Process OMR Sheet",
        "description": """
        Process an OMR (Optical Mark Recognition) sheet image and extract marked answers.
        
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
        """,
        "responses": {
            200: {
                "description": "Successful OMR processing",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "success",
                            "result_id": "550e8400-e29b-41d4-a716-446655440000",
                            "filename": "omr_sheet.jpg",
                            "timestamp": "2024-01-15T10:30:00",
                            "responses": {
                                "1": "A",
                                "2": "B",
                                "3": "No Response",
                                "4": "D",
                                "5": "C"
                            },
                            "metadata": {
                                "processing_time_seconds": 0.245,
                                "image_dimensions": {"width": 800, "height": 600},
                                "bubbles_found": 20,
                                "bubbles_expected": 20,
                                "questions_processed": 5,
                                "confidence_scores": {
                                    "1": 0.95,
                                    "2": 0.87,
                                    "3": 0.0,
                                    "4": 0.92,
                                    "5": 0.78
                                },
                                "min_pixel_threshold_used": 500
                            }
                        }
                    }
                }
            },
            400: {
                "description": "Bad Request - Invalid file or parameters",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "error",
                            "message": "Unsupported file type: application/pdf. Allowed types: image/jpeg, image/jpg, image/png, image/bmp",
                            "timestamp": "2024-01-15T10:30:00"
                        }
                    }
                }
            },
            422: {
                "description": "Unprocessable Entity - OMR processing failed",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "error",
                            "message": "Could not find the OMR sheet outline in the image",
                            "timestamp": "2024-01-15T10:30:00"
                        }
                    }
                }
            },
            429: {
                "description": "Too Many Requests - Rate limit exceeded",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "error",
                            "message": "Rate limit exceeded. Please try again later.",
                            "limits": {
                                "minute_requests": 60,
                                "minute_limit": 60,
                                "hour_requests": 1000,
                                "hour_limit": 1000
                            },
                            "timestamp": "2024-01-15T10:30:00"
                        }
                    }
                }
            }
        }
    },
    "health": {
        "summary": "Health Check",
        "description": """
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
        """,
        "responses": {
            200: {
                "description": "Service health information",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "healthy",
                            "timestamp": "2024-01-15T10:30:00",
                            "service": "OMR Sheet Checker API",
                            "version": "1.0.0",
                            "uptime_seconds": 3600.5,
                            "dependencies": {
                                "opencv": "available",
                                "numpy": "available",
                                "imutils": "available"
                            },
                            "result_store": {
                                "total_results": 5,
                                "active_results": 3,
                                "expired_results": 2,
                                "expiration_hours": 24
                            },
                            "expired_results_cleaned": 2,
                            "health_issues": [],
                            "performance": {
                                "requests_total": 150,
                                "success_rate": 98.67,
                                "avg_response_time": 0.245,
                                "files_processed": 25
                            }
                        }
                    }
                }
            },
            503: {
                "description": "Service Unavailable",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "error",
                            "message": "Service unhealthy",
                            "timestamp": "2024-01-15T10:30:00"
                        }
                    }
                }
            }
        }
    },
    "metrics": {
        "summary": "Performance Metrics",
        "description": """
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
        """,
        "responses": {
            200: {
                "description": "Detailed performance metrics",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "success",
                            "timestamp": "2024-01-15T10:30:00",
                            "metrics": {
                                "uptime_seconds": 3600.5,
                                "start_time": "2024-01-15T09:30:00",
                                "requests": {
                                    "total": 150,
                                    "success": 148,
                                    "errors": 2,
                                    "success_rate": 98.67
                                },
                                "response_times": {
                                    "avg": 0.245,
                                    "min": 0.123,
                                    "max": 1.234,
                                    "recent_count": 100
                                },
                                "endpoints": {
                                    "/process_omr": {
                                        "count": 25,
                                        "avg_time": 0.456,
                                        "min_time": 0.234,
                                        "max_time": 1.123
                                    }
                                },
                                "file_processing": {
                                    "files_processed": 25,
                                    "total_processing_time": 11.4,
                                    "avg_processing_time": 0.456
                                },
                                "system": {
                                    "timestamp": "2024-01-15T10:30:00",
                                    "cpu_percent": 15.2,
                                    "memory_percent": 45.8,
                                    "memory_available": 8589934592,
                                    "memory_total": 17179869184,
                                    "disk_percent": 67.3,
                                    "disk_free": 107374182400,
                                    "disk_total": 1073741824000
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

# Example request bodies
EXAMPLE_REQUESTS = {
    "process_omr": {
        "description": "Example OMR processing request",
        "curl": """
curl -X POST "http://localhost:8000/process_omr" \\
  -H "accept: application/json" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@omr_sheet.jpg" \\
  -F "num_questions=20" \\
  -F "num_options=4" \\
  -F "min_pixel_threshold=500"
        """,
        "python": """
import requests

url = "http://localhost:8000/process_omr"
files = {"file": open("omr_sheet.jpg", "rb")}
data = {
    "num_questions": 20,
    "num_options": 4,
    "min_pixel_threshold": 500
}

response = requests.post(url, files=files, data=data)
result = response.json()
print(result)
        """,
        "javascript": """
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('num_questions', '20');
formData.append('num_options', '4');
formData.append('min_pixel_threshold', '500');

fetch('http://localhost:8000/process_omr', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => console.log(data));
        """
    }
}

# Error codes and descriptions
ERROR_CODES = {
    400: "Bad Request - Invalid request parameters or file format",
    413: "Payload Too Large - File size exceeds 10MB limit",
    422: "Unprocessable Entity - OMR processing failed",
    429: "Too Many Requests - Rate limit exceeded",
    500: "Internal Server Error - Unexpected server error",
    503: "Service Unavailable - Service is unhealthy or unavailable"
}

# Configuration options
CONFIGURATION_OPTIONS = {
    "file_requirements": {
        "max_size": "10MB",
        "supported_formats": ["JPG", "PNG", "BMP"],
        "recommended_resolution": "300+ DPI",
        "lighting": "Good, even lighting",
        "alignment": "Sheet should be flat and aligned"
    },
    "processing_parameters": {
        "num_questions": "Total number of questions on the sheet (positive integer)",
        "num_options": "Number of options per question (typically 4 or 5)",
        "min_pixel_threshold": "Minimum pixels to count a bubble as marked (default: 500)"
    },
    "rate_limits": {
        "requests_per_minute": 60,
        "requests_per_hour": 1000,
        "file_size_limit": "10MB"
    }
}
