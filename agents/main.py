"""StoryForge Agent Router — Gradient ADK entry point.

Uses the @entrypoint decorator to register with the Gradient platform.
Dispatches to specialist agents based on the 'agent' field in the payload.
"""

import logging
import os
from dotenv import load_dotenv
from gradient_adk import entrypoint

from agents import coach_agent, transcript_agent, content_agent, workflow_agent

load_dotenv()

logger = logging.getLogger(__name__)

AGENT_MAP = {
    "coach": coach_agent,
    "transcript": transcript_agent,
    "content": content_agent,
    "workflow": workflow_agent,
}


@entrypoint
async def main(input: dict, context: dict) -> dict:
    """Route an incoming request to the appropriate specialist agent.

    Args:
        input: Must contain 'agent' (str) and 'prompt' or agent-specific fields.
        context: Gradient platform context (trace IDs, metadata).

    Returns:
        Dict with agent name and result.
    """
    agent_name = input.get("agent", "")
    agent_input = input.get("input", input)

    logger.info(f"Routing to agent: {agent_name}")

    if agent_name not in AGENT_MAP:
        return {
            "error": f"Unknown agent: {agent_name}. Available: {list(AGENT_MAP.keys())}",
        }

    agent_fn = AGENT_MAP[agent_name]
    result = await agent_fn(agent_input, context)
    return {"agent": agent_name, "result": result}
