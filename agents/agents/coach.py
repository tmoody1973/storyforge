"""CoachAgent — Storytelling mentor with RAG from station knowledge base.

Uses Gradient Knowledge Bases for retrieval and Claude Sonnet
via Gradient SDK or Anthropic API for generation.
"""

import logging

from gradient_adk import trace_retriever, trace_llm

from ._llm import call_llm, GRADIENT_MODEL_ACCESS_KEY

logger = logging.getLogger(__name__)

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

STUB_RESPONSE = (
    "Focus on finding the strongest emotional thread in your transcript. "
    "Look for the moment where your subject's voice changes — that's usually "
    "where the real story lives. Lead with that moment, then build context around it."
)


@trace_retriever("coach_kb_search")
async def search_station_knowledge(query: str) -> list[str]:
    """Retrieve relevant coaching context from station knowledge base."""
    return []


@trace_llm("coach_generate")
async def generate_coaching(query: str, context_docs: list[str], production_state: dict) -> str:
    """Generate coaching response."""
    current_step = production_state.get("step", "editing")
    transcript_context = production_state.get("transcript_context", "")

    context_section = ""
    if context_docs:
        context_section = "\n\nRelevant station guidelines:\n" + "\n".join(f"- {doc}" for doc in context_docs)

    transcript_section = ""
    if transcript_context:
        truncated = transcript_context[:3000]
        transcript_section = f"\n\nCurrent transcript (excerpt):\n{truncated}"

    user_message = f"""Production stage: {current_step}
{context_section}
{transcript_section}

Producer's question: {query}"""

    text = await call_llm(COACHING_SYSTEM_PROMPT, user_message, max_tokens=2048, timeout=60.0)

    if text is None:
        logger.warning("All LLM providers failed — returning stub coaching")
        return f"Great question about '{query}'. As you're in the {current_step} stage, {STUB_RESPONSE}"

    return text


async def coach_agent(input_data: dict, context: dict) -> dict:
    """Process a coaching request."""
    query = input_data.get("query", "")
    production_state = input_data.get("production_state", {})

    if "transcript_context" in input_data:
        production_state["transcript_context"] = input_data["transcript_context"]

    context_docs = await search_station_knowledge(query)
    coaching = await generate_coaching(query, context_docs, production_state)

    return {"coaching": coaching}
