"""StoryForge Agent Router — Gradient ADK entry point.

Dispatches requests to the appropriate specialist agent based on
the 'agent' field in the input payload.
"""

import asyncio
import json
import os
from dotenv import load_dotenv

from agents import coach_agent, transcript_agent, content_agent, workflow_agent

load_dotenv()

AGENT_MAP = {
    "coach": coach_agent,
    "transcript": transcript_agent,
    "content": content_agent,
    "workflow": workflow_agent,
}


async def route_request(payload: dict) -> dict:
    """Route an incoming request to the appropriate agent."""
    agent_name = payload.get("agent", "")
    agent_input = payload.get("input", {})

    if agent_name not in AGENT_MAP:
        return {"error": f"Unknown agent: {agent_name}. Available: {list(AGENT_MAP.keys())}"}

    agent_fn = AGENT_MAP[agent_name]
    result = await agent_fn(agent_input)
    return {"agent": agent_name, "result": result}


# For local testing
if __name__ == "__main__":
    test_payload = {
        "agent": "coach",
        "input": {
            "query": "How should I open this story?",
            "production_state": {"step": "producing"},
        },
    }
    result = asyncio.run(route_request(test_payload))
    print(json.dumps(result, indent=2))
