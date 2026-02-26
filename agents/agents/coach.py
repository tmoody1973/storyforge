"""CoachAgent — Storytelling mentor with RAG from station knowledge base.

Uses Gradient Knowledge Bases for retrieval and Claude Sonnet 4.5
via DO Serverless Inference for generation.
"""

import logging
import os
from gradient_adk import trace_retriever, trace_llm

logger = logging.getLogger(__name__)

# Knowledge base ID for station best practices
STATION_KB_ID = os.environ.get("STATION_KNOWLEDGE_KB_UUID", "")


@trace_retriever("coach_kb_search")
async def search_station_knowledge(query: str) -> list[str]:
    """Retrieve relevant coaching context from station knowledge base."""
    if not STATION_KB_ID:
        return ["[STUB] No knowledge base configured. Using default coaching patterns."]

    # TODO: Wire up real KB retrieval
    # from gradient import Gradient
    # client = Gradient()
    # response = client.retrieve.documents(
    #     knowledge_base_id=STATION_KB_ID,
    #     num_results=5,
    #     query=query,
    # )
    # return [r.content for r in response.results] if response else []
    return ["[STUB] Knowledge base retrieval not yet implemented."]


@trace_llm("coach_generate")
async def generate_coaching(query: str, context_docs: list[str], production_state: dict) -> str:
    """Generate coaching response using Claude Sonnet 4.5."""
    current_step = production_state.get("step", "unknown")

    # TODO: Call anthropic-claude-4.5-sonnet via DO Serverless Inference
    # from gradient import AsyncGradient
    # client = AsyncGradient()
    # response = await client.chat.completions.create(
    #     model="anthropic-claude-4.5-sonnet",
    #     messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
    # )

    return (
        f"[CoachAgent stub] Responding to: '{query}' "
        f"(current step: {current_step}). "
        "In production, this will provide craft guidance from "
        "This American Life, Radiolab, and Radio Milwaukee best practices."
    )


async def coach_agent(input_data: dict, context: dict) -> dict:
    """Process a coaching request.

    Args:
        input_data: Contains 'production_state' and 'query'.
        context: Gradient platform context for tracing.

    Returns:
        Dict with 'coaching' text.
    """
    query = input_data.get("query", "")
    production_state = input_data.get("production_state", {})

    context_docs = await search_station_knowledge(query)
    coaching = await generate_coaching(query, context_docs, production_state)

    return {"coaching": coaching}
