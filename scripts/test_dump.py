"""QB Dump of assessments"""

import re
from datetime import datetime
from django.utils.html import strip_tags
import tablib
from unidecode import unidecode
from nucleus.models import Problem, Test


REPLACE_CHAR = {
    '&nbsp;': ' ',
    '&#x26;': '&',
    '&#x27;': "\'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '\"',
    '&amp;': '&'
}

def prepare_options(obj):
    """Return cleaned MCQ options (no padding)."""
    mcq_options = obj.mcq_options or []
    options = []

    for option in mcq_options:
        option = strip_tags(option.values()[0])
        for key, value in REPLACE_CHAR.items():
            option = unidecode(option.replace(key, value))
        options.append(option)

    return options   # no fixed length

def replace_html_entities(text):
    """ Helper function to replace HTML entities in a text """
    for key, value in REPLACE_CHAR.items():
        text = text.replace(key, value)
    return text

def prepare_description(problem):
    """ Prepare problem description by stripping HTML while preserving formatting. """
    description = problem.description
    description = re.sub(r'(<br\s*/?>)', '\n', description, flags=re.IGNORECASE)
    description = strip_tags(description)
    description = replace_html_entities(description)
    description = re.sub(r'\n\s*\n', '\n\n', description)
    return description.strip() or ''

def prepare_tags(tags):
    try:
        all_tags = []
        for tag in tags:
            try:
                tag = tag.name
            except AttributeError:
                tag = tag
            for key, value in REPLACE_CHAR.items():
                tag = tag.replace(key, value)
            all_tags.append(tag)
        return ', '.join(all_tags)
    except UnicodeEncodeError as e:
        print("UnicodeEncodeError:", e)
        return ''

def get_test_chunks(tests, size):
    """
        It takes 'tests' and 'size' as arguments to generate chunk of test ids.
        Args:
            tests(queryset): Queryset of test ids
            size(int): Chunk size
        Return: test_ids(list): Chunk of test ids
    """
    test_ids = []
    for index in range(0, tests.count(), size):
        test_ids.append(tests[index:index + size])
    return test_ids


def run(test_slug):
    """
    python manage.py runscript export_test_mcq_problems --script-args test_slug
    """
    test = Test.objects.get(slug=test_slug)
    data = []
    for problem in test.problems.all().iterator():
        options = prepare_options(problem)

        record = {
            "problem_slug": problem.slug,
            "problem_name" : problem.name,
            "problem_decription": prepare_description(problem),
            "correct_answer" : problem.mcq_options_correct,
            "level": problem.level,
            "problem_score": problem.score,
            "penalty": problem.penalty,
            "tags": prepare_tags(problem.tags.all()),
            "private_tags": prepare_tags(problem.private_tags.all()),
            "insight_tags": prepare_tags(problem.insight_tags.all()),
            "sample_solution": problem.sample_solutions
        }
        for idx, option in enumerate(options, start=1):
            record["option_{}".format(idx)] = option

        data.append(record)

    return data
