"""CoachAgent — Storytelling mentor with RAG from station knowledge base.

Uses Gradient Knowledge Bases for retrieval and Claude Sonnet
via Gradient SDK or Anthropic API for generation.
"""

import logging
import os

import httpx
from gradient_adk import trace_retriever, trace_llm

logger = logging.getLogger(__name__)

STATION_KB_ID = os.environ.get("STATION_KNOWLEDGE_KB_UUID", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GRADIENT_MODEL_ACCESS_KEY = os.environ.get("GRADIENT_MODEL_ACCESS_KEY", "")

COACHING_SYSTEM_PROMPT = """You are an expert radio storytelling coach, drawing on techniques from:
- This American Life (narrative structure, personal storytelling)
- Radiolab (sound design, pacing, wonder)
- Radio Milwaukee / 88Nine (community connection, local voice, music integration)

You help radio producers and DJs craft compelling stories from raw interviews. Your guidance is:
- Specific and actionable (not generic advice)
- Focused on the current production stage
- Encouraging but honest about what needs work
- Rooted in radio craft (sound, pacing, narrative arc)

When reviewing transcripts, identify:
- The strongest narrative thread
- Key emotional moments that could anchor segments
- Quotes that would work well on air
- Pacing suggestions (where to speed up, slow down, add music beds)
- How to open and close the piece

Keep responses concise (2-4 paragraphs). Use radio production terminology naturally."""


@trace_retriever("coach_kb_search")
async def search_station_knowledge(query: str) -> list[str]:
    """Retrieve relevant coaching context from station knowledge base."""
    if not STATION_KB_ID:
        return []

    # TODO: Wire up Gradient Knowledge Base retrieval when deployed
    # from gradient import Gradient
    # client = Gradient()
    # response = client.retrieve.documents(
    #     knowledge_base_id=STATION_KB_ID,
    #     num_results=5,
    #     query=query,
    # )
    # return [r.content for r in response.results] if response else []
    return []


@trace_llm("coach_generate")
async def generate_coaching(query: str, context_docs: list[str], production_state: dict) -> str:
    """Generate coaching response using Claude."""
    current_step = production_state.get("step", "editing")
    transcript_context = production_state.get("transcript_context", "")

    context_section = ""
    if context_docs:
        context_section = f"\n\nRelevant station guidelines:\n" + "\n".join(f"- {doc}" for doc in context_docs)

    transcript_section = ""
    if transcript_context:
        # Truncate to first 3000 chars to stay within limits
        truncated = transcript_context[:3000]
        transcript_section = f"\n\nCurrent transcript (excerpt):\n{truncated}"

    user_message = f"""Production stage: {current_step}
{context_section}
{transcript_section}

Producer's question: {query}"""

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
                {"role": "system", "content": COACHING_SYSTEM_PROMPT},
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
            "system": COACHING_SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}],
        }
    else:
        logger.warning("No API key configured — returning stub coaching")
        return (
            f"Great question about '{query}'. As you're in the {current_step} stage, "
            "focus on finding the strongest emotional thread in your transcript. "
            "Look for the moment where your subject's voice changes — that's usually "
            "where the real story lives. Lead with that moment, then build context around it."
        )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()

    if GRADIENT_MODEL_ACCESS_KEY:
        return data["choices"][0]["message"]["content"]
    else:
        return data["content"][0]["text"]


async def coach_agent(input_data: dict, context: dict) -> dict:
    """Process a coaching request."""
    query = input_data.get("query", "")
    production_state = input_data.get("production_state", {})

    # Include transcript context in production state for the LLM
    if "transcript_context" in input_data:
        production_state["transcript_context"] = input_data["transcript_context"]

    context_docs = await search_station_knowledge(query)
    coaching = await generate_coaching(query, context_docs, production_state)

    return {"coaching": coaching}
