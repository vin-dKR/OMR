import cv2
import numpy as np
import time
from typing import Dict, Tuple, Optional
from imutils.perspective import four_point_transform
from imutils import contours
from PIL import Image
import io

# Try to import python-magic, fallback to mimetypes if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    import mimetypes
    MAGIC_AVAILABLE = False


class OMRProcessingError(Exception):
    """Custom exception for OMR processing errors"""
    pass


class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass


def validate_image_file(file_bytes: bytes, max_size_mb: int = 10) -> Tuple[bool, str]:
    """
    Validate uploaded image file for format and size.
    
    Args:
        file_bytes: The uploaded file bytes
        max_size_mb: Maximum file size in MB
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file size
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"File size ({file_size_mb:.2f}MB) exceeds maximum allowed size ({max_size_mb}MB)"
    
    # Check file format using python-magic or fallback
    if MAGIC_AVAILABLE:
        try:
            file_type = magic.from_buffer(file_bytes, mime=True)
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
            
            if file_type not in allowed_types:
                return False, f"Unsupported file type: {file_type}. Allowed types: {', '.join(allowed_types)}"
        except Exception as e:
            return False, f"Error detecting file type: {str(e)}"
    else:
        # Fallback validation using file signatures
        if not _validate_file_signature(file_bytes):
            return False, "Unsupported file type. Allowed types: JPG, PNG, BMP"
    
    # Additional validation using PIL
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"
    
    return True, ""


def _validate_file_signature(file_bytes: bytes) -> bool:
    """Validate file type using file signatures (magic numbers)"""
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
            return True
    
    return False


def detect_bubbles_with_threshold(thresh_image, min_size: int, max_size: int = None, aspect_ratio_range: tuple = (0.5, 1.5), debug_mode: bool = False):
    """
    Detect bubbles using specific size and aspect ratio thresholds
    
    Args:
        thresh_image: Binary thresholded image
        min_size: Minimum bubble size (width/height)
        max_size: Maximum bubble size (if None, no upper limit)
        aspect_ratio_range: Tuple of (min_ar, max_ar) for aspect ratio filtering
        debug_mode: Enable debug output
    
    Returns:
        List of bubble contours
    """
    cnts, _ = cv2.findContours(thresh_image.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if debug_mode:
        print(f"    Found {len(cnts)} total contours")
    
    bubble_contours = []
    for c in cnts:
        (x, y, w, h) = cv2.boundingRect(c)
        ar = w / float(h)
        
        # Size filtering
        size_ok = w >= min_size and h >= min_size
        if max_size:
            size_ok = size_ok and w <= max_size and h <= max_size
        
        # Aspect ratio filtering
        ar_ok = aspect_ratio_range[0] <= ar <= aspect_ratio_range[1]
        
        if size_ok and ar_ok:
            bubble_contours.append(c)
    
    if debug_mode and len(bubble_contours) == 0 and len(cnts) > 0:
        # Show some sample contours that were rejected
        sample_cnts = cnts[:5]  # Show first 5 contours
        print(f"    Sample rejected contours (showing first 5):")
        for i, c in enumerate(sample_cnts):
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            print(f"      Contour {i}: size={w}x{h}, AR={ar:.2f}, min_size={min_size}, max_size={max_size}, AR_range={aspect_ratio_range}")
    
    return bubble_contours


def calculate_proximity_score(found_count: int, expected_count: int) -> float:
    """
    Calculate how close the found bubble count is to expected count
    
    Args:
        found_count: Number of bubbles found
        expected_count: Expected number of bubbles
    
    Returns:
        Score between 0 and 1 (1 = perfect match)
    """
    if expected_count == 0:
        return 0.0
    
    # Calculate percentage difference
    percentage_diff = abs(found_count - expected_count) / expected_count
    
    # Convert to score (0 = no match, 1 = perfect match)
    score = max(0, 1 - percentage_diff)
    
    # Bonus for being close to expected count
    if 0.8 <= found_count / expected_count <= 1.2:
        score += 0.1
    
    return min(1.0, score)


def multi_scale_bubble_detection(thresh_image, expected_count: int, debug_mode: bool = False) -> dict:
    """
    Find optimal bubble detection parameters using multi-scale approach
    
    Args:
        thresh_image: Binary thresholded image
        expected_count: Expected number of bubbles
        debug_mode: Enable debug output
    
    Returns:
        Dictionary with optimal detection parameters and results
    """
    best_result = None
    best_score = 0
    
    if debug_mode:
        print(f"Multi-scale detection: Testing for {expected_count} expected bubbles")
        print(f"Input image shape: {thresh_image.shape}")
        print(f"Input image type: {thresh_image.dtype}")
        print(f"Input image min/max: {thresh_image.min()}/{thresh_image.max()}")
    
    # Test different size ranges - adjusted for high-resolution dense OMR sheets
    size_ranges = [
        (4, 12),    # Very small bubbles (for dense sheets)
        (6, 15),    # Small bubbles
        (8, 18),    # Medium-small bubbles
        (10, 22),   # Medium bubbles
        (12, 25),   # Medium-large bubbles
        (15, 30),   # Large bubbles
        (18, 35),   # Very large bubbles
    ]
    
    aspect_ratio_ranges = [
        (0.5, 1.5),   # Very flexible
        (0.7, 1.3),   # Flexible
        (0.8, 1.2),   # Moderate
        (0.9, 1.1),   # Strict
    ]
    
    if debug_mode:
        print(f"Multi-scale detection: Expected {expected_count} bubbles")
    
    for min_size, max_size in size_ranges:
        for min_ar, max_ar in aspect_ratio_ranges:
            # Detect bubbles with current parameters
            bubbles = detect_bubbles_with_threshold(
                thresh_image, 
                min_size, 
                max_size, 
                (min_ar, max_ar),
                debug_mode
            )
            
            # Calculate score
            score = calculate_proximity_score(len(bubbles), expected_count)
            
            if debug_mode:
                print(f"  Size: {min_size}-{max_size}, AR: {min_ar}-{max_ar}, "
                      f"Found: {len(bubbles)}, Score: {score:.3f}")
            
            # Update best result
            if score > best_score:
                best_score = score
                best_result = {
                    'bubbles': bubbles,
                    'count': len(bubbles),
                    'score': score,
                    'min_size': min_size,
                    'max_size': max_size,
                    'aspect_ratio_range': (min_ar, max_ar)
                }
    
    if best_result is None:
        # If no bubbles found, return a default result
        best_result = {
            'bubbles': [],
            'count': 0,
            'score': 0.0,
            'min_size': 10,
            'max_size': 25,
            'aspect_ratio_range': (0.5, 1.5)
        }
        if debug_mode:
            print("No bubbles found in any combination, returning default result")
    else:
        if debug_mode:
            print(f"Best result: {best_result['count']} bubbles, score: {best_result['score']:.3f}")
            print(f"Parameters: size={best_result['min_size']}-{best_result['max_size']}, "
                  f"AR={best_result['aspect_ratio_range']}")
    
    return best_result


def process_omr_sheet(
    image_bytes: bytes, 
    num_questions: int, 
    num_options: int, 
    min_pixel_threshold: int = 500,
    debug_mode: bool = False
) -> Dict:
    """
    Enhanced OMR sheet processing with validation and metadata.
    
    Args:
        image_bytes: The image file in bytes
        num_questions: The total number of questions on the sheet
        num_options: The number of options per question
        min_pixel_threshold: The minimum number of pixels to count a bubble as "marked"
        
    Returns:
        Dictionary containing responses and processing metadata
    """
    start_time = time.time()
    
    # Validate input parameters
    if num_questions <= 0 or num_options <= 0:
        raise OMRProcessingError("num_questions and num_options must be positive integers")
    
    if min_pixel_threshold <= 0:
        raise OMRProcessingError("min_pixel_threshold must be a positive integer")
    
    # Convert bytes to a NumPy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise OMRProcessingError("Could not decode image bytes")
    
    # Get image dimensions for metadata
    height, width = image.shape[:2]
    
    # 1. Pre-processing for sheet detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)
    
    # 2. Find and Isolate the Sheet
    cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    doc_cnt = None
    
    if len(cnts) > 0:
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                doc_cnt = approx
                break
    
    if doc_cnt is None:
        raise OMRProcessingError("Could not find the OMR sheet outline in the image")
    
    # Apply perspective transform but preserve reasonable size
    paper = four_point_transform(image, doc_cnt.reshape(4, 2))
    
    # Resize to a larger size for better bubble detection
    # For dense OMR sheets, we need higher resolution
    target_width = max(1200, paper.shape[1])
    target_height = max(1200, paper.shape[0])
    
    scale_x = target_width / paper.shape[1]
    scale_y = target_height / paper.shape[0]
    scale = min(scale_x, scale_y)
    
    new_width = int(paper.shape[1] * scale)
    new_height = int(paper.shape[0] * scale)
    paper = cv2.resize(paper, (new_width, new_height))
    
    if debug_mode:
        print(f"Resized paper from {paper.shape} to {new_width}x{new_height} (scale: {scale:.2f})")
    
    warped = cv2.cvtColor(paper, cv2.COLOR_BGR2GRAY)
    
    # 3. Preprocessing for bubble detection
    if debug_mode:
        print("Preprocessing for bubble detection...")
    
    # Apply adaptive histogram equalization to improve contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(warped)
    
    # Apply slight blur to reduce noise while preserving bubble edges
    enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
    
    if debug_mode:
        print(f"Enhanced image shape: {enhanced.shape}")
    
    # 4. Binarize and Identify Bubbles
    # Try different thresholding approaches
    thresh_inv = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    thresh_normal = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    
    if debug_mode:
        print(f"Normal threshold - white pixels: {np.sum(thresh_normal == 255)}")
        print(f"Inverted threshold - white pixels: {np.sum(thresh_inv == 255)}")
    
    # Use the one with more white pixels (likely to have more bubble content)
    if np.sum(thresh_normal == 255) > np.sum(thresh_inv == 255):
        thresh = thresh_normal
        if debug_mode:
            print("Using normal threshold (bubbles are white)")
    else:
        thresh = thresh_inv
        if debug_mode:
            print("Using inverted threshold (bubbles are black)")
    
    # Apply morphological operations to separate connected bubbles
    if debug_mode:
        print("Applying morphological operations to separate bubbles...")
    
    # Create a smaller kernel for more precise operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    
    # Apply opening operation to separate connected bubbles (more gently)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Apply closing operation to fill small holes in bubbles
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Try additional erosion to better separate bubbles
    if debug_mode:
        print("Applying additional erosion to better separate bubbles...")
    
    # Use a very small kernel for erosion
    erosion_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
    thresh = cv2.erode(thresh, erosion_kernel, iterations=1)
    
    if debug_mode:
        print(f"After morphological operations:")
        print(f"  White pixels (255): {np.sum(thresh == 255)}")
        print(f"  Black pixels (0): {np.sum(thresh == 0)}")
    
    if debug_mode:
        print(f"Thresholded image shape: {thresh.shape}")
        print(f"Thresholded image unique values: {np.unique(thresh)}")
        print(f"White pixels (255): {np.sum(thresh == 255)}")
        print(f"Black pixels (0): {np.sum(thresh == 0)}")
    
    expected_bubbles = num_questions * num_options
    
    # Use multi-scale bubble detection
    if debug_mode:
        print(f"Starting multi-scale detection for {expected_bubbles} expected bubbles")
        print(f"Image dimensions: {thresh.shape}")
    
    detection_result = multi_scale_bubble_detection(thresh, expected_bubbles, debug_mode)
    
    if detection_result is None:
        if debug_mode:
            print("Multi-scale detection returned None, using fallback method")
        detection_result = {'score': 0}  # Ensure it's not None for the next check
    
    if detection_result['score'] < 0.3:
        # Fallback to original method if multi-scale detection fails
        if debug_mode:
            print(f"Multi-scale detection failed (score: {detection_result['score'] if detection_result else 'None'}), using fallback method")
        
        cnts, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if debug_mode:
            print(f"Fallback: Found {len(cnts)} total contours")
        
        question_cnts = []
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            if w >= 4 and h >= 4 and 0.5 <= ar <= 1.5:
                question_cnts.append(c)
        
        if debug_mode:
            print(f"Fallback: After size filtering: {len(question_cnts)} bubbles")
        
        # If still not enough, try aggressive filtering
        if len(question_cnts) < expected_bubbles * 0.5:
            if debug_mode:
                print("Fallback: Trying aggressive filtering")
            question_cnts = []
            for c in cnts:
                (x, y, w, h) = cv2.boundingRect(c)
                ar = w / float(h)
                if w >= 3 and h >= 3 and 0.3 <= ar <= 2.0:
                    question_cnts.append(c)
            
            if debug_mode:
                print(f"Fallback: After aggressive filtering: {len(question_cnts)} bubbles")
    else:
        # Use the best result from multi-scale detection
        question_cnts = detection_result['bubbles']
        if debug_mode:
            print(f"Multi-scale detection successful: {detection_result['count']} bubbles found")
    
    found_bubbles = len(question_cnts)
    
    # Debug information
    if debug_mode:
        print(f"Debug: Found {found_bubbles} bubbles, expected {expected_bubbles}")
        print(f"Debug: Image dimensions: {width}x{height}")
        print(f"Debug: Total contours found: {len(cnts)}")
        print(f"Debug: Bubble size range: min_w={min([cv2.boundingRect(c)[2] for c in question_cnts]) if question_cnts else 0}, max_w={max([cv2.boundingRect(c)[2] for c in question_cnts]) if question_cnts else 0}")
    
    if found_bubbles < expected_bubbles:
        # More informative error message
        error_msg = (
            f"Found {found_bubbles} bubbles, but expected {expected_bubbles}. "
            f"Image dimensions: {width}x{height}. "
            "This might be due to: "
            "1) Different bubble sizes than expected "
            "2) Image quality or lighting issues "
            "3) Different OMR sheet format "
            "Please check the image quality or adjust parameters."
        )
        raise OMRProcessingError(error_msg)
    
    # 4. Sort Bubbles into Rows and Extract Responses
    question_cnts = contours.sort_contours(question_cnts, method="top-to-bottom")[0]
    
    responses = {}
    confidence_scores = {}
    total_rows_to_process = min(num_questions, found_bubbles // num_options)
    
    for q_idx in range(total_rows_to_process):
        i = q_idx * num_options
        # Sort the contours for the current question from left to right
        cnts = contours.sort_contours(question_cnts[i:i + num_options])[0]
        
        bubbled_pixel_count = -1
        marked_index = -1
        all_pixel_counts = []
        
        for opt_idx, c in enumerate(cnts):
            mask = np.zeros(thresh.shape, dtype="uint8")
            cv2.drawContours(mask, [c], -1, 255, -1)
            mask = cv2.bitwise_and(thresh, thresh, mask=mask)
            total_pixels = cv2.countNonZero(mask)
            all_pixel_counts.append(total_pixels)
            
            if total_pixels > bubbled_pixel_count:
                bubbled_pixel_count = total_pixels
                marked_index = opt_idx
        
        # Calculate confidence score
        if len(all_pixel_counts) > 1:
            sorted_counts = sorted(all_pixel_counts, reverse=True)
            if sorted_counts[0] > 0:
                confidence = (sorted_counts[0] - sorted_counts[1]) / sorted_counts[0]
                confidence_scores[str(q_idx + 1)] = round(confidence, 3)
            else:
                confidence_scores[str(q_idx + 1)] = 0.0
        else:
            confidence_scores[str(q_idx + 1)] = 1.0
        
        answer = "No Response"
        if bubbled_pixel_count > min_pixel_threshold:
            answer = chr(ord('A') + marked_index)
        
        responses[str(q_idx + 1)] = answer
    
    processing_time = round(time.time() - start_time, 3)
    
    # Prepare response with metadata
    result = {
        "responses": responses,
        "metadata": {
            "processing_time_seconds": processing_time,
            "image_dimensions": {"width": width, "height": height},
            "bubbles_found": found_bubbles,
            "bubbles_expected": expected_bubbles,
            "questions_processed": total_rows_to_process,
            "confidence_scores": confidence_scores,
            "min_pixel_threshold_used": min_pixel_threshold
        }
    }
    
    return result
