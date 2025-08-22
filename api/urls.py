from django.urls import path
from api.get_solution_dump import SolutionDumpView
from api.get_test_dump import TestDumpView
from api.extract_resume_text import PDFExtractView

urlpatterns = [
    path("test/get_test/<slug:test_slug>/", TestDumpView.as_view(), name="get_test"),
    path("test/get_solutions/<slug:test_slug>/", SolutionDumpView.as_view(), name="get_solutions"),
    path("pdf/extract_text/", PDFExtractView.as_view(), name="extract_pdf_text"),
]
