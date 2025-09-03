# OMR Sheet Checker Backend

An AI-powered backend service for processing OMR (Optical Mark Recognition) sheets using computer vision. This service can automatically extract marked answers from scanned OMR sheets and return structured results.

## Features

- **Image Processing**: Supports JPG, PNG, and BMP image formats
- **Flexible Configuration**: Configurable number of questions and options
- **Enhanced Validation**: File format and size validation
- **Result Storage**: Temporary storage with automatic expiration
- **Comprehensive Logging**: Request/response logging with performance metrics
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Health Monitoring**: Built-in health check endpoint
- **Security Features**: Rate limiting, input sanitization, security headers
- **File Security**: Malicious file detection and validation

## Technology Stack

- **Python 3.9+**
- **FastAPI** - Modern, fast web framework
- **OpenCV** - Computer vision processing
- **NumPy** - Numerical operations
- **imutils** - Image processing utilities
- **PIL/Pillow** - Image validation
- **python-magic** - File type detection

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Starting the Server

**Option 1: Using the startup script**
```bash
python run.py
```

**Option 2: Using uvicorn directly**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Option 3: Using environment variables**
```bash
HOST=127.0.0.1 PORT=8080 python run.py
```

### API Endpoints

#### 1. Process OMR Sheet
- **URL**: `POST /process_omr`
- **Description**: Process an OMR sheet image and extract answers
- **Content-Type**: `multipart/form-data`

**Parameters**:
- `file` (required): Image file (JPG, PNG, BMP) - max 10MB
- `num_questions` (required): Total number of questions
- `num_options` (required): Number of options per question
- `min_pixel_threshold` (optional): Bubble detection threshold (default: 500)

**Example Request**:
```bash
curl -X POST "http://localhost:8000/process_omr" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@omr_sheet.jpg" \
  -F "num_questions=20" \
  -F "num_options=4"
```

**Example Response**:
```json
{
  "status": "success",
  "result_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "omr_sheet.jpg",
  "timestamp": "2024-01-15T10:30:00",
  "responses": {
    "1": "A",
    "2": "B",
    "3": "No Response",
    "4": "D"
  },
  "metadata": {
    "processing_time_seconds": 0.245,
    "image_dimensions": {"width": 800, "height": 600},
    "bubbles_found": 80,
    "bubbles_expected": 80,
    "questions_processed": 20,
    "confidence_scores": {
      "1": 0.95,
      "2": 0.87,
      "3": 0.0,
      "4": 0.92
    },
    "min_pixel_threshold_used": 500
  }
}
```

#### 2. Health Check
- **URL**: `GET /health`
- **Description**: Check service health and status

**Example Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "service": "OMR Sheet Checker API",
  "version": "1.0.0",
  "uptime": "running",
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
  "expired_results_cleaned": 2
}
```

#### 3. Retrieve Result
- **URL**: `GET /results/{result_id}`
- **Description**: Retrieve a stored processing result

#### 4. Delete Result
- **URL**: `DELETE /results/{result_id}`
- **Description**: Delete a stored processing result

#### 5. Rate Limit Information
- **URL**: `GET /security/limits`
- **Description**: Get current rate limit status and usage

#### 6. Performance Metrics
- **URL**: `GET /metrics`
- **Description**: Detailed performance metrics and statistics

#### 7. Simplified Statistics
- **URL**: `GET /stats`
- **Description**: Key performance indicators for monitoring dashboards

#### 8. API Documentation
- **URL**: `GET /docs`
- **Description**: Interactive API documentation (Swagger UI)

- **URL**: `GET /redoc`
- **Description**: Alternative API documentation (ReDoc)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host address |
| `PORT` | `8000` | Server port |
| `RELOAD` | `true` | Enable auto-reload for development |
| `LOG_LEVEL` | `info` | Logging level |

### File Validation

- **Maximum file size**: 10MB
- **Supported formats**: JPG, PNG, BMP
- **Image validation**: Automatic format and integrity checking
- **Security validation**: Malicious file detection and path traversal prevention

### Security Features

- **Rate Limiting**: 60 requests per minute, 1000 requests per hour per IP
- **Security Headers**: XSS protection, content type options, frame options
- **Input Sanitization**: Automatic cleaning of user inputs
- **File Validation**: Comprehensive file type and content validation

## Error Handling

The API provides detailed error messages for various scenarios:

- **400 Bad Request**: Invalid file format, size, or missing parameters
- **413 Payload Too Large**: Request exceeds size limits
- **422 Unprocessable Entity**: OMR processing errors (sheet not detected, insufficient bubbles)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server errors

## Logging & Monitoring

### Logging
The application uses structured logging with multiple outputs:
- **Console**: Real-time logging during development
- **File**: `logs/omr_checker.log` for all logs
- **Errors**: `logs/errors.log` for error tracking
- **Access**: `logs/access.log` for request/response logging

### Monitoring
- **Health Checks**: Comprehensive service health monitoring
- **Performance Metrics**: Detailed request and processing statistics
- **System Metrics**: CPU, memory, and disk usage tracking
- **Real-time Monitoring**: Background system monitoring every minute

### Log Rotation
- **Maximum file size**: 10MB per log file
- **Backup count**: 5 rotated files
- **Automatic cleanup**: Old logs are automatically rotated

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application with all endpoints
│   ├── omr_processor.py     # Enhanced OMR processing with validation
│   ├── result_store.py      # Result storage with expiration
│   ├── rate_limiter.py      # Rate limiting middleware
│   ├── security.py          # Security middleware
│   ├── logging_config.py    # Structured logging configuration
│   ├── monitoring.py        # Performance monitoring system
│   └── docs.py              # Enhanced API documentation
├── requirements.txt         # All dependencies
├── run.py                  # Startup script
├── README.md              # Comprehensive documentation
└── .gitignore             # Git ignore rules
```

### Adding New Features

1. **New Endpoints**: Add to `app/main.py`
2. **Processing Logic**: Modify `app/omr_processor.py`
3. **Storage**: Extend `app/result_store.py`

## Troubleshooting

### Common Issues

1. **"Could not find the OMR sheet outline"**
   - Ensure the image shows the complete OMR sheet
   - Check image quality and lighting
   - Verify the sheet has clear borders

2. **"Found X bubbles, but expected Y"**
   - Verify `num_questions` and `num_options` parameters
   - Check image resolution and bubble clarity
   - Ensure bubbles are properly aligned

3. **File upload errors**
   - Check file format (JPG, PNG, BMP only)
   - Verify file size (max 10MB)
   - Ensure file is not corrupted

### Performance Tips

- Use high-quality images (300+ DPI)
- Ensure good lighting when scanning
- Keep OMR sheets flat and aligned
- Use consistent bubble sizes and spacing

## License

This project is part of the OMR Checker application.

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.
