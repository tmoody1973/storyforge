"""CoachAgent — Storytelling mentor with RAG from station knowledge base."""

import json


async def coach_agent(input_data: dict) -> dict:
    """Process a coaching request.

    Args:
        input_data: Contains 'production_state' (current step, transcript excerpt,
                    DJ's edits) and 'query' (specific coaching question).

    Returns:
        Dict with 'coaching' text referencing specific timestamps and
        editorial reasoning.
    """
    query = input_data.get("query", "")
    production_state = input_data.get("production_state", {})
    current_step = production_state.get("step", "unknown")

    # TODO: Retrieve from station-knowledge Knowledge Base
    # TODO: Call anthropic-claude-4.5-sonnet via DO Serverless Inference

    return {
        "coaching": (
            f"[CoachAgent stub] Responding to: '{query}' "
            f"(current step: {current_step}). "
            "In production, this will provide craft guidance from "
            "This American Life, Radiolab, and Radio Milwaukee best practices."
        ),
    }
