# fastapi view
from fastapi import APIRouter, UploadFile, File, HTTPException
from PyPDF2 import PdfReader

router = APIRouter(prefix="/pdf", tags=["pdf"])

@router.post("/extract_text")
async def extract_text_from_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        reader = PdfReader(file.file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        return {"filename": file.filename, "content": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading PDF: {str(e)}")




# Django view 
from django.http import JsonResponse
from django.views import View
from PyPDF2 import PdfReader

class PDFExtractView(View):
    def post(self, request):
        # Check if file is in request
        if "file" not in request.FILES:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        uploaded_file = request.FILES["file"]

        # Validate file extension
        if not uploaded_file.name.lower().endswith(".pdf"):
            return JsonResponse({"error": "Only PDF files are allowed"}, status=400)

        try:
            # Read PDF
            reader = PdfReader(uploaded_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""

            return JsonResponse({
                "filename": uploaded_file.name,
                "content": text.strip()
            }, json_dumps_params={"ensure_ascii": False})

        except Exception as e:
            return JsonResponse({"error": f"Error reading PDF: {str(e)}"}, status=500)
