# import json, ast
# from fastapi import APIRouter
# from typing import List, Dict

# router = APIRouter(prefix="/test", tags=["test_dump"])

# @router.get("/get_test/{test_slug}")
# def export_test(test_slug: str) -> List[Dict]:
#     with open('./data/test_dump.json', 'r') as file:
#         data = json.load(file)
#     return data
    

import re
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from django.utils.html import strip_tags
from unidecode import unidecode

from nucleus.models import Test
from nucleus.models.choices import PROBLEM_TYPES

import re
from django.http import JsonResponse, Http404
from django.views import View

# --------------Helper functions--------------------------
problem_types = dict(PROBLEM_TYPES)

REPLACE_CHAR = {
    '&nbsp;': ' ',
    '&#x26;': '&',
    '&#x27;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"',
    '&amp;': '&'
}


def replace_html_entities(text: str) -> str:
    """Replace HTML entities in a text."""
    for key, value in REPLACE_CHAR.items():
        text = text.replace(key, value)
    return text


def prepare_options(obj):
    """Return cleaned MCQ options (no padding)."""
    mcq_options = obj.mcq_options or []
    options = []

    for option in mcq_options:
        option = strip_tags(option.values()[0])
        for key, value in REPLACE_CHAR.items():
            option = unidecode(option.replace(key, value))
        options.append(option)

    return options


def prepare_description(problem):
    """ Prepare problem description by stripping HTML while preserving formatting. """
    description = problem.description or ""
    description = re.sub(r'(<br\s*/?>)', '\n', description, flags=re.IGNORECASE)
    description = strip_tags(description)
    description = replace_html_entities(description)
    description = re.sub(r'\n\s*\n', '\n\n', description)
    return description.strip()


def prepare_tags(tags):
    all_tags = []
    for tag in tags:
        tag = getattr(tag, "name", tag)
        for key, value in REPLACE_CHAR.items():
            tag = tag.replace(key, value)
        all_tags.append(tag)
    return ", ".join(all_tags)
# ------------------helper function ends---------------------------



# FastAPI + Django approach

router = APIRouter(prefix="/test", tags=["test_dump"])
@router.get("/get_test/{test_slug}")
def export_test(test_slug: str) -> List[Dict]:
    """
    API endpoint to fetch test problems and return as JSON response
    """
    try:
        test = Test.objects.get(slug=test_slug)
    except Test.DoesNotExist:
        raise HTTPException(status_code=404, detail="Test not found")

    data = []
    for problem in test.problems.all().iterator():
        options = prepare_options(problem)

        record = {
            "problem_slug": problem.slug,
            "problem_name": problem.name,
            "problem_description": prepare_description(problem),
            "correct_answer": problem.mcq_options_correct,
            "level": problem.level,
            "problem_type": problem_types.get(problem.problem_type),
            "problem_score": problem.score,
            "penalty": problem.penalty,
            "tags": prepare_tags(problem.tags.all()),
            "private_tags": prepare_tags(problem.private_tags.all()),
            "insight_tags": prepare_tags(problem.insight_tags.all()),
            "sample_solution": problem.sample_solutions,
        }

        for idx, option in enumerate(options, start=1):
            record["option_{}".format(idx)] = option

        data.append(record)

    return data




# Django view
class TestDumpView(View):
    def get(self, request, test_slug):
        try:
            test = Test.objects.get(slug=test_slug)
        except Test.DoesNotExist:
            raise Http404("Test not found")

        data = []
        for problem in test.problems.all().iterator():
            options = prepare_options(problem)

            record = {
                "problem_slug": problem.slug,
                "problem_name": problem.name,
                "problem_description": prepare_description(problem),
                "correct_answer": problem.mcq_options_correct,
                "level": problem.level,
                "problem_type": problem_types.get(problem.problem_type),
                "problem_score": problem.score,
                "penalty": problem.penalty,
                "tags": prepare_tags(problem.tags.all()),
                "private_tags": prepare_tags(problem.private_tags.all()),
                "insight_tags": prepare_tags(problem.insight_tags.all()),
                "sample_solution": problem.sample_solutions,
            }

            for idx, option in enumerate(options, start=1):
                record[f"option_{idx}"] = option

            data.append(record)

        return JsonResponse(data, safe=False, json_dumps_params={"indent": 2, "ensure_ascii": False})
