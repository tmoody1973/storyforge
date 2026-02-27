"""WorkflowAgent — Production manager, routing, and cross-station coordination.

Handles status transitions, overlap detection, and notification triggers
using Claude for intelligent analysis.
"""

import json
import logging

from gradient_adk import trace_llm

from ._llm import call_llm

logger = logging.getLogger(__name__)

WORKFLOW_SYSTEM_PROMPT = """You are a radio production workflow manager. Analyze story status changes and organizational context to:

1. Suggest next actions for the producer
2. Detect topic overlaps with other stories in the organization
3. Flag potential scheduling conflicts

Return ONLY valid JSON with keys:
- "actions": list of { "type": string, "description": string, "priority": "high"|"medium"|"low" }
- "overlaps": list of { "story_title": string, "overlap_reason": string }
- "message": brief summary string"""

STUB_RESULT = {
    "actions": [
        {"type": "review", "description": "Review transcript for accuracy", "priority": "high"},
        {"type": "assign", "description": "Assign to producer for editing", "priority": "medium"},
    ],
    "overlaps": [],
    "message": "Transcript ready for review.",
}


@trace_llm("workflow_analyze")
async def analyze_workflow_event(event: str, story: dict, org_stories: list) -> dict:
    """Analyze a workflow event and determine required actions."""

    user_message = f"""Workflow event: {event}

Current story: {json.dumps(story, default=str)[:2000]}

Other stories in organization ({len(org_stories)} total):
{json.dumps(org_stories[:10], default=str)[:3000]}

Analyze this event and return JSON with: actions, overlaps, message"""

    text = await call_llm(WORKFLOW_SYSTEM_PROMPT, user_message, max_tokens=2048, timeout=60.0)

    if text is None:
        logger.warning("All LLM providers failed — returning stub workflow")
        return {**STUB_RESULT, "message": f"Processed event: {event}. {STUB_RESULT['message']}"}

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse workflow JSON: {text[:200]}")
        return {"actions": [], "overlaps": [], "message": f"Processed event: {event}"}


async def workflow_agent(input_data: dict, context: dict) -> dict:
    """Process workflow state changes and coordination."""
    event = input_data.get("event", "")
    story = input_data.get("story", {})
    org_stories = input_data.get("org_stories", [])

    return await analyze_workflow_event(event, story, org_stories)
