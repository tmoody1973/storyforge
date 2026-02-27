"""WorkflowAgent — Production manager, routing, and cross-station coordination.

Handles status transitions, overlap detection, and notification triggers
using Claude for intelligent analysis.
"""

import json
import logging
import os

import httpx
from gradient_adk import trace_llm

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GRADIENT_MODEL_ACCESS_KEY = os.environ.get("GRADIENT_MODEL_ACCESS_KEY", "")

WORKFLOW_SYSTEM_PROMPT = """You are a radio production workflow manager. Analyze story status changes and organizational context to:

1. Suggest next actions for the producer
2. Detect topic overlaps with other stories in the organization
3. Flag potential scheduling conflicts

Return ONLY valid JSON with keys:
- "actions": list of { "type": string, "description": string, "priority": "high"|"medium"|"low" }
- "overlaps": list of { "story_title": string, "overlap_reason": string }
- "message": brief summary string"""


@trace_llm("workflow_analyze")
async def analyze_workflow_event(event: str, story: dict, org_stories: list) -> dict:
    """Analyze a workflow event and determine required actions."""

    user_message = f"""Workflow event: {event}

Current story: {json.dumps(story, default=str)[:2000]}

Other stories in organization ({len(org_stories)} total):
{json.dumps(org_stories[:10], default=str)[:3000]}

Analyze this event and return JSON with: actions, overlaps, message"""

    headers = {}
    url = ""
    body = {}

    if GRADIENT_MODEL_ACCESS_KEY:
        url = "https://api.gradient.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GRADIENT_MODEL_ACCESS_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "anthropic-claude-4.5-sonnet",
            "messages": [
                {"role": "system", "content": WORKFLOW_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 2048,
        }
    elif ANTHROPIC_API_KEY:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        body = {
            "model": "claude-sonnet-4-5-20241022",
            "max_tokens": 2048,
            "system": WORKFLOW_SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}],
        }
    else:
        logger.warning("No API key configured — returning stub workflow")
        return {
            "actions": [
                {"type": "review", "description": "Review transcript for accuracy", "priority": "high"},
                {"type": "assign", "description": "Assign to producer for editing", "priority": "medium"},
            ],
            "overlaps": [],
            "message": f"Processed event: {event}. Transcript ready for review.",
        }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()

    if GRADIENT_MODEL_ACCESS_KEY:
        text = data["choices"][0]["message"]["content"]
    else:
        text = data["content"][0]["text"]

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse workflow JSON: {text[:200]}")
        return {
            "actions": [],
            "overlaps": [],
            "message": f"Processed event: {event}",
        }


async def workflow_agent(input_data: dict, context: dict) -> dict:
    """Process workflow state changes and coordination."""
    event = input_data.get("event", "")
    story = input_data.get("story", {})
    org_stories = input_data.get("org_stories", [])

    return await analyze_workflow_event(event, story, org_stories)
