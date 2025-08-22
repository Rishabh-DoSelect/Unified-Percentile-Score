
---

# 📘 API Documentation – FastAPI & Django (Dual Approach)

This project provides **three APIs** implemented in **both FastAPI and Django**.
You can choose either framework depending on your project needs.

---

## 🚀 1. PDF Reader API

### Purpose

Upload a **PDF file** and extract its plain text content.

### FastAPI Endpoint

```http
POST /pdf/extract_text
```

#### Example cURL

```bash
curl -X POST "http://127.0.0.1:8000/pdf/extract_text" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.pdf"
```

#### Response

```json
{
  "filename": "sample.pdf",
  "content": "Extracted text content..."
}
```

---

### Django Endpoint

```http
POST /pdf/extract_text/
```

#### Example cURL

```bash
curl -X POST "http://127.0.0.1:8000/pdf/extract_text/" \
  -F "file=@sample.pdf"
```

#### Response

```json
{
  "filename": "sample.pdf",
  "content": "Extracted text content..."
}
```

---

## 🚀 2. Solutions Dump API

### Purpose

Fetch all **submitted solutions** for a given test.

### FastAPI Endpoint

```http
GET /test/get_solutions/{test_slug}
```

#### Example

```bash
curl http://127.0.0.1:8000/test/get_solutions/sample-test
```

#### Response

```json
[
  {
    "problem_name": "Array Rotation",
    "code": "def solve(): ...",
    "run_details": {...},
    "jupyter_data": null,
    "email": "candidate@example.com",
    "full_name": "John Doe",
    "mcq_choice": "A",
    "plagiarism": false,
    "proctor_verdict": "Clean"
  }
]
```

---

### Django Endpoint

```http
GET /test/get_solutions/{test_slug}/
```

#### Example

```bash
curl http://127.0.0.1:8000/test/get_solutions/sample-test/
```

Response format is the same ✅

---

## 🚀 3. Test Dump API

### Purpose

Fetch **problems of a test** along with cleaned description, tags, options, etc.

### FastAPI Endpoint

```http
GET /test/get_test/{test_slug}
```

#### Example

```bash
curl http://127.0.0.1:8000/test/get_test/sample-test
```

#### Response

```json
[
  {
    "problem_slug": "array-rotation",
    "problem_name": "Array Rotation",
    "problem_description": "Rotate an array by K positions...",
    "correct_answer": 2,
    "level": "Easy",
    "problem_type": "MCQ",
    "problem_score": 10,
    "penalty": 0,
    "tags": "arrays, basics",
    "private_tags": "",
    "insight_tags": "",
    "sample_solution": "Use slicing in Python...",
    "option_1": "Rotate left",
    "option_2": "Rotate right",
    "option_3": "No rotation",
    "option_4": "Reverse array"
  }
]
```

---

### Django Endpoint

```http
GET /test/get_test/{test_slug}/
```

#### Example

```bash
curl http://127.0.0.1:8000/test/get_test/sample-test/
```

Response format is the same ✅

---

## 🛠️ Running the APIs

### ▶️ Run with FastAPI

```bash
uvicorn fastapi_app.main:app --reload
```

* Visit API docs at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### ▶️ Run with Django

```bash
python manage.py runserver
```

* Visit endpoints directly (e.g., `http://127.0.0.1:8000/pdf/extract_text/`)

---

## 📑 Summary

* **PDF Reader API** → Upload a PDF and extract text.
* **Solutions Dump API** → Get all solutions submitted for a test.
* **Test Dump API** → Get test problems with cleaned details.
* All APIs work in **both FastAPI & Django** (interchangeable).

---
