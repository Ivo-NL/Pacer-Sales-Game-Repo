"""
scoring.py - Contains JSON schema, evaluation parsing, and scoring helper functions for PACER AI Service.
"""

import json
import logging
logger = logging.getLogger(__name__)

def parse_evaluation_json(response_text):
    """Parse the JSON evaluation response from the AI."""
    try:
        # Clean up any potential markdown formatting
        if response_text.startswith("```json"):
            response_text = response_text.split("```json", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]
        evaluation = json.loads(response_text.strip())
        return evaluation
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}. Original response: {response_text}")
        raise ValueError("Response not in valid JSON format")

def calculate_total_score(evaluation):
    """Calculate the total score from the evaluation object."""
    return sum([
        evaluation.get("methodology_score", 50),
        evaluation.get("rapport_score", 50),
        evaluation.get("progress_score", 50),
        evaluation.get("outcome_score", 50)
    ]) / 4 