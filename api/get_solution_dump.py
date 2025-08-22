# import json, ast
# from fastapi import APIRouter, HTTPException
# from typing import List, Dict

# router = APIRouter(prefix="/test", tags=["test_dump"])

# @router.get("/get_solutions/{test_slug}")
# def export_test(test_slug: str) -> List[Dict]:
#     with open('./data/solution_dump.json', 'r') as file:
#         data = json.load(file)

#     return data
    


# fastAPI + Django

from fastapi import APIRouter, HTTPException
from typing import List, Dict
from nucleus.models import SolutionHistory, Test

router = APIRouter(prefix="/test", tags=["solution_dump"])

@router.get("/get_solutions/{test_slug}")
def export_solutions(test_slug: str) -> List[Dict]:
    """
    API endpoint to fetch submitted solutions for a given test
    """
    try:
        test = Test.objects.get(slug=test_slug)
    except Test.DoesNotExist:
        raise HTTPException(status_code=404, detail="Test not found")

    data = []

    for solution in SolutionHistory.objects.filter(test=test, is_submitted=True).iterator():
        tss = solution.test_solution_set
        report = tss.report_recruiter_history

        record = {
            "problem_name": solution.problem.name,
            "code": solution.code if solution.solution_type in ['SCR', 'UIX', 'DBA', 'DSC'] else '',
            "run_details": solution.run_details,
            "jupyter_data": solution.datascience_jupyter_data,
            "email": solution.creator.email,
            "full_name": solution.creator.get_full_name(),
            "mcq_choice": solution.choice,
            "plagiarism": tss.settings.get('plagiarism'),
            "proctor_verdict": (report.proctor_data.get('verdict_result') or "").capitalize(),
        }

        data.append(record)

    return data



# Django View

import json
from django.http import JsonResponse, Http404
from django.views import View
from nucleus.models import SolutionHistory, Test


class SolutionDumpView(View):
    def get(self, request, test_slug):
        try:
            test = Test.objects.get(slug=test_slug)
        except Test.DoesNotExist:
            raise Http404("Test not found")

        data = []

        for solution in SolutionHistory.objects.filter(test=test, is_submitted=True).iterator():
            tss = solution.test_solution_set
            report = tss.report_recruiter_history

            record = {
                "problem_name": solution.problem.name,
                "code": solution.code if solution.solution_type in ['SCR', 'UIX', 'DBA', 'DSC'] else '',
                "run_details": solution.run_details,
                "jupyter_data": solution.datascience_jupyter_data,
                "email": solution.creator.email,
                "full_name": solution.creator.get_full_name(),
                "mcq_choice": solution.choice,
                "plagiarism": tss.settings.get('plagiarism'),
                "proctor_verdict": (report.proctor_data.get('verdict_result') or "").capitalize(),
            }

            data.append(record)

        return JsonResponse(data, safe=False, json_dumps_params={"indent": 2, "ensure_ascii": False})
