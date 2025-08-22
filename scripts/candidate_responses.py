"""QB Dump of assessments"""

import re
from django.utils.html import strip_tags
from unidecode import unidecode
from nucleus.models import SolutionHistory, Test


REPLACE_CHAR = {
    '&nbsp;': ' ',
    '&#x26;': '&',
    '&#x27;': "\'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '\"',
    '&amp;': '&'
}

def replace_html_entities(text):
    """ Helper function to replace HTML entities in a text """
    for key, value in REPLACE_CHAR.items():
        text = text.replace(key, value)
    return text

def get_test_chunks(tests, size):
    test_ids = []
    for index in range(0, tests.count(), size):
        test_ids.append(tests[index:index + size])
    return test_ids

def run(test_slug):
    """ """
    test = Test.objects.get(slug=test_slug)
    data = []
    # for test_solution_set in TestSolutionSet.objects.filter()
    for solution in SolutionHistory.objects.get(test=test, is_submitted=True).iterator():
        tss = solution.test_solution_set
        report = tss.report_recruiter_history
        record = {
            "solution_slug": solution.slug,
            "problem_slug": solution.problem.slug,
            "problem_name" : solution.problem.name,
            "code": solution.code if solution.solution_type in ['SCR', 'UIX', 'DBA', 'DSC'] else '',
            "run_details": solution.run_details,
            "analysis_details": solution.analysis_details,
            "jupyter_data": solution.datascience_jupyter_data,
            "email": solution.creator.email,
            "full_name": solution.creator.get_full_name(),
            "mcq_choice": solution.choice,
            "plagiarism": tss.settings,
            "proctor_verdict": report.proctor_data.get('verdict_result').capitalize(),
            "problem_wise_duration": report.proctor_data.get('problem_wise_duration', {})            
        }

        data.append(record)

    return data
