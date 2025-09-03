# Quick Start Guide - OMR Sheet Checker Backend

This guide will help you get the OMR Sheet Checker backend up and running in minutes.

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)
- Git (optional, for cloning)

## Installation

### 1. Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd omr-checker/backend

# Or simply navigate to the backend directory
cd backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

## Running the Application

### Start the Server
```bash
python run.py
```

The server will start on `http://localhost:8000` by default.

### Environment Variables (Optional)
You can customize the server configuration:

```bash
# Set custom host and port
HOST=127.0.0.1 PORT=8080 python run.py

# Disable auto-reload for production
RELOAD=false python run.py

# Set log level
LOG_LEVEL=DEBUG python run.py
```

## Testing the API

### 1. Check Service Health
```bash
curl http://localhost:8000/health
```

### 2. View API Documentation
Open your browser and go to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 3. Test OMR Processing
```bash
# Using curl
curl -X POST "http://localhost:8000/process_omr" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your_omr_sheet.jpg" \
  -F "num_questions=20" \
  -F "num_options=4"
```

### 4. Using Python
```python
import requests

url = "http://localhost:8000/process_omr"
files = {"file": open("your_omr_sheet.jpg", "rb")}
data = {
    "num_questions": 20,
    "num_options": 4,
    "min_pixel_threshold": 500
}

response = requests.post(url, files=files, data=data)
result = response.json()
print(result)
```

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and status |
| `/process_omr` | POST | Process OMR sheet |
| `/health` | GET | Service health check |
| `/metrics` | GET | Performance metrics |
| `/stats` | GET | Simplified statistics |
| `/results/{id}` | GET | Retrieve stored result |
| `/results/{id}` | DELETE | Delete stored result |
| `/security/limits` | GET | Rate limit information |
| `/docs` | GET | Interactive API docs |

## Configuration

### File Requirements
- **Supported formats**: JPG, PNG, BMP
- **Maximum size**: 10MB
- **Recommended resolution**: 300+ DPI

### Rate Limits
- **Per minute**: 60 requests
- **Per hour**: 1000 requests

### Processing Parameters
- **num_questions**: Total questions on sheet
- **num_options**: Options per question (typically 4-5)
- **min_pixel_threshold**: Bubble detection threshold (default: 500)

## Monitoring

### Logs
Logs are stored in the `logs/` directory:
- `omr_checker.log` - All application logs
- `errors.log` - Error logs only
- `access.log` - Request/response logs

### Health Monitoring
```bash
# Check service health
curl http://localhost:8000/health

# Get performance metrics
curl http://localhost:8000/metrics

# Get simplified stats
curl http://localhost:8000/stats
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Use a different port
   PORT=8080 python run.py
   ```

2. **Missing dependencies**
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt
   ```

3. **Permission errors (Linux/Mac)**
   ```bash
   # Make run.py executable
   chmod +x run.py
   ```

4. **Virtual environment not activated**
   ```bash
   # Check if venv is activated
   which python
   # Should show path to venv/bin/python
   ```

### Getting Help

- Check the logs in `logs/` directory
- Use the health endpoint: `GET /health`
- View detailed API docs: `GET /docs`
- Check rate limits: `GET /security/limits`

## Next Steps

1. **Test with your OMR sheets**
2. **Integrate with your frontend**
3. **Set up monitoring dashboards**
4. **Configure for production deployment**

For more detailed information, see the main [README.md](README.md) file.
