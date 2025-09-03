# **Project Brief: AI-Powered OMR Sheet Checker Backend**

## **1\. Objective**

The primary objective of this project is to build a fast, reliable, and scalable backend service that can automatically process an image of a filled-out OMR (Optical Mark Recognition) sheet, extract the marked answers for each question, and return the results in a structured JSON format.

## **2\. Core Functionality**

The backend will expose an API endpoint that accepts an image file (e.g., JPG, PNG). It will then use a computer vision pipeline to analyze the image, identify the marked bubbles, and map them to their corresponding questions and options. The service should be able to handle sheets with varying numbers of questions and options, making it configurable.

## **3\. Technology Stack**

* **Language:** Python 3.9+  
* **Web Framework:** **Flask** or **FastAPI**. FastAPI is preferred for its modern async capabilities and automatic OpenAPI (Swagger) documentation.  
* **Core CV Library:** **OpenCV-Python** (opencv-python-headless) for all image processing tasks.  
* **Numerical Operations:** **NumPy** for efficient array manipulation.  
* **Image Handling Utilities:** **imutils** for convenience functions in sorting contours and perspective transforms.

## **4\. API Endpoint Definition**

The service must provide at least one primary API endpoint.

### **Endpoint: /process\_omr**

* **Method:** POST  
* **Description:** Processes a single OMR sheet image and returns the extracted answers.  
* **Request Type:** multipart/form-data  
* **Form Fields:**  
  * file: The image file of the OMR sheet (required).  
  * num\_questions: The total number of questions on the sheet (integer, required).  
  * num\_options: The number of options per question (e.g., 4 for A-D, 5 for A-E) (integer, required).  
  * min\_pixel\_threshold: An integer threshold to determine if a bubble is "filled". A good default is 500\. (integer, optional).  
* **Success Response (200 OK):**  
  {  
    "status": "success",  
    "filename": "uploaded\_omr.jpg",  
    "responses": {  
      "1": "B",  
      "2": "D",  
      "3": "No Response",  
      "4": "A",  
      "...": "..."  
    }  
  }

* **Error Responses:**  
  * **400 Bad Request:** If required form fields are missing or invalid.  
    {  
      "status": "error",  
      "message": "Missing required form fields: file, num\_questions, num\_options."  
    }

  * **500 Internal Server Error:** If the CV pipeline fails (e.g., cannot detect the sheet).  
    {  
      "status": "error",  
      "message": "Failed to process image. Could not detect OMR sheet outline."  
    }

## **5\. Detailed OMR Processing Pipeline Logic**

The core logic for processing the OMR sheet should be implemented as a modular function. This function will be called by the API endpoint.

Input: An image file buffer and configuration parameters (num\_questions, num\_options, threshold).  
Output: A dictionary containing the responses.

### **Step 1: Image Loading and Pre-processing**

1. Read the image from the input file buffer.  
2. Convert the image to grayscale.  
3. Apply a GaussianBlur to reduce noise.  
4. Use Canny edge detection to find the outlines of objects in the image.

### **Step 2: Find and Isolate the OMR Sheet**

1. Use cv2.findContours on the edged image to get all outlines.  
2. Sort the contours by area in descending order.  
3. Iterate through the sorted contours and find the first one that has exactly four corner points. This is assumed to be the OMR sheet itself.  
4. If no 4-point contour is found, raise an error.  
5. Apply a four\_point\_transform using the four corner points to get a flat, top-down, bird's-eye view of the sheet. This corrects for any perspective distortion.

### **Step 3: Identify and Filter Answer Bubbles**

1. Take the warped, top-down image and apply **Otsu's thresholding**. This will create a pure black-and-white (binary) image, making the filled-in marks stand out.  
2. Run cv2.findContours again on this binary image to find all the bubble outlines.  
3. Filter these contours to keep only the ones that are actual bubbles. A good filter is to check their width, height, and aspect ratio (which should be close to 1.0 for a circle).

### **Step 4: Sort Bubbles and Extract Responses**

1. Sort the filtered bubble contours from **top-to-bottom**. This arranges them into rows.  
2. Iterate through the sorted contours in chunks, where each chunk size is num\_options. Each chunk represents one question.  
3. For each chunk (question):  
   a. Sort the contours within the chunk from left-to-right.  
   b. Initialize variables to track the marked bubble for the current question.  
   c. Loop through each of the sorted bubbles for the question.  
   d. Create a mask for the current bubble and count the number of non-zero (white) pixels within it on the thresh image.  
   e. The bubble with the highest pixel count is the one the user has marked.  
   f. Check if this highest pixel count exceeds the min\_pixel\_threshold.  
   g. If it does, record the answer (e.g., 'A', 'B'). If not, record it as "No Response".  
4. Store the result for each question number in a dictionary.

## **6\. Core Logic Implementation (Python Code)**

Here is a complete, self-contained Python script that implements the OMR processing logic. This should be used as the core of the backend service.

\# filename: omr\_processor.py

import cv2  
import numpy as np  
from imutils.perspective import four\_point\_transform  
from imutils import contours

def process\_omr\_sheet(image\_bytes, num\_questions: int, num\_options: int, min\_pixel\_threshold: int \= 500):  
    """  
    Analyzes an OMR sheet image from bytes and extracts marked responses.

    Args:  
        image\_bytes: The image file in bytes.  
        num\_questions (int): The total number of questions on the sheet.  
        num\_options (int): The number of options per question.  
        min\_pixel\_threshold (int): The minimum number of pixels to count a bubble as "marked".

    Returns:  
        A dictionary of responses, or raises a ValueError on failure.  
    """  
    \# Convert bytes to a NumPy array  
    nparr \= np.frombuffer(image\_bytes, np.uint8)  
    image \= cv2.imdecode(nparr, cv2.IMREAD\_COLOR)

    if image is None:  
        raise ValueError("Could not decode image bytes.")

    \# 1\. Pre-processing  
    gray \= cv2.cvtColor(image, cv2.COLOR\_BGR2GRAY)  
    blurred \= cv2.GaussianBlur(gray, (5, 5), 0\)  
    edged \= cv2.Canny(blurred, 75, 200\)

    \# 2\. Find and Isolate the Sheet  
    cnts, \_ \= cv2.findContours(edged.copy(), cv2.RETR\_EXTERNAL, cv2.CHAIN\_APPROX\_SIMPLE)  
    doc\_cnt \= None  
    if len(cnts) \> 0:  
        cnts \= sorted(cnts, key=cv2.contourArea, reverse=True)  
        for c in cnts:  
            peri \= cv2.arcLength(c, True)  
            approx \= cv2.approxPolyDP(c, 0.02 \* peri, True)  
            if len(approx) \== 4:  
                doc\_cnt \= approx  
                break  
      
    if doc\_cnt is None:  
        raise ValueError("Could not find the OMR sheet outline in the image.")

    paper \= four\_point\_transform(image, doc\_cnt.reshape(4, 2))  
    warped \= cv2.cvtColor(paper, cv2.COLOR\_BGR2GRAY)

    \# 3\. Binarize and Identify Bubbles  
    thresh \= cv2.threshold(warped, 0, 255, cv2.THRESH\_BINARY\_INV | cv2.THRESH\_OTSU)\[1\]  
    cnts, \_ \= cv2.findContours(thresh.copy(), cv2.RETR\_EXTERNAL, cv2.CHAIN\_APPROX\_SIMPLE)

    question\_cnts \= \[\]  
    for c in cnts:  
        (x, y, w, h) \= cv2.boundingRect(c)  
        ar \= w / float(h)  
        \# Filter based on size and aspect ratio to find bubbles  
        if w \>= 20 and h \>= 20 and 0.9 \<= ar \<= 1.1:  
            question\_cnts.append(c)

    if len(question\_cnts) \< num\_questions \* num\_options:  
         print(f"Warning: Found {len(question\_cnts)} bubbles, but expected {num\_questions \* num\_options}. Results may be inaccurate.")

    \# 4\. Sort Bubbles into Rows and Extract Responses  
    question\_cnts \= contours.sort\_contours(question\_cnts, method="top-to-bottom")\[0\]  
      
    responses \= {}  
    total\_rows\_to\_process \= min(num\_questions, len(question\_cnts) // num\_options)

    for q\_idx in range(total\_rows\_to\_process):  
        i \= q\_idx \* num\_options  
        \# Sort the contours for the current question from left to right  
        cnts \= contours.sort\_contours(question\_cnts\[i:i \+ num\_options\])\[0\]  
          
        bubbled\_pixel\_count \= \-1  
        marked\_index \= \-1

        for opt\_idx, c in enumerate(cnts):  
            mask \= np.zeros(thresh.shape, dtype="uint8")  
            cv2.drawContours(mask, \[c\], \-1, 255, \-1)  
            mask \= cv2.bitwise\_and(thresh, thresh, mask=mask)  
            total\_pixels \= cv2.countNonZero(mask)

            if total\_pixels \> bubbled\_pixel\_count:  
                bubbled\_pixel\_count \= total\_pixels  
                marked\_index \= opt\_idx  
          
        answer \= "No Response"  
        if bubbled\_pixel\_count \> min\_pixel\_threshold:  
            answer \= chr(ord('A') \+ marked\_index)  
              
        responses\[str(q\_idx \+ 1)\] \= answer  
      
    return responses

## **7\. Suggested Project Structure**

/omr-checker-backend  
|-- /app  
|   |-- \_\_init\_\_.py  
|   |-- main.py             \# FastAPI/Flask app initialization and route definitions  
|   |-- omr\_processor.py    \# The core CV logic from section 6  
|-- requirements.txt      \# Project dependencies  
|-- Dockerfile            \# For containerization  
|-- .gitignore  
|-- README.md

## **8\. Final Instructions for AI**

Please generate a backend application using **FastAPI** and the provided omr\_processor.py logic.

* The main application file (main.py) should define the /process\_omr endpoint as specified.  
* The endpoint should handle file uploads and form data for configuration.  
* It should call the process\_omr\_sheet function and wrap its output or errors in the specified JSON response format.  
* Ensure proper error handling for file I/O and exceptions raised by the processor function.  
* Include a requirements.txt file with all necessary libraries (fastapi, uvicorn, python-multipart, opencv-python-headless, numpy, imutils).