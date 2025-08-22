from fastapi import FastAPI
from api import get_test_dump, get_solution_dump, extract_resume_text

app = FastAPI(title="Assessment Service API")

# Include routers
app.include_router(get_test_dump.router)
app.include_router(get_solution_dump.router)
app.include_router(extract_resume_text.router)
