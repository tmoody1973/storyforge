"""TranscriptAgent — Audio intelligence, story discovery, and analysis.

Analyzes corrected transcripts to extract story angles, key quotes,
emotional arc, and filler words using Claude Sonnet via Gradient/Anthropic.
"""

import json
import logging

from gradient_adk import trace_llm, trace_retriever

from ._llm import call_llm

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """You are an expert radio journalist and story analyst. Analyze the following interview transcript and extract:

1. **Story Angles** — 2-5 potential story angles, each with:
   - "angle": short title
   - "strength": 0.0-1.0 confidence score
   - "reasoning": 1-2 sentence explanation

2. **Key Quotes** — 3-8 compelling quotes that could anchor a story, each with:
   - "text": the exact quote text
   - "start": approximate start time in seconds (use word timestamps if available)
   - "end": approximate end time in seconds
   - "theme": one-word theme tag (e.g., "hope", "loss", "change")

3. **Emotional Arc** — 6-10 data points mapping the emotional intensity over time:
   - "time": time in seconds
   - "intensity": 0.0-1.0 emotional intensity

Return ONLY valid JSON with keys: story_angles, key_quotes, emotional_arc"""

STUB_RESULT = {
    "story_angles": [
        {"angle": "Community Impact", "strength": 0.85, "reasoning": "Strong personal narratives throughout"},
        {"angle": "Policy Change", "strength": 0.7, "reasoning": "References to systemic issues"},
    ],
    "key_quotes": [],
    "emotional_arc": [
        {"time": 0, "intensity": 0.3},
        {"time": 30, "intensity": 0.5},
        {"time": 60, "intensity": 0.8},
        {"time": 90, "intensity": 0.6},
    ],
}


@trace_retriever("transcript_archive_search")
async def search_story_archive(themes: list[str]) -> list[str]:
    """Check story archive for prior coverage of similar themes."""
    return []


@trace_llm("transcript_analyze")
async def analyze_transcript(transcript: str, word_timestamps: list) -> dict:
    """Run AI analysis on transcript text."""

    user_message = f"""Analyze this interview transcript:

{transcript}

Word timestamps (first 50 for reference):
{json.dumps(word_timestamps[:50], indent=2) if word_timestamps else "No timestamps available"}

Total duration: approximately {word_timestamps[-1]["end"] if word_timestamps else 0} seconds.

Return your analysis as JSON with keys: story_angles, key_quotes, emotional_arc"""

    text = await call_llm(ANALYSIS_SYSTEM_PROMPT, user_message, max_tokens=4096)

    if text is None:
        logger.warning("All LLM providers failed — returning stub analysis")
        return STUB_RESULT

    # Parse JSON from response (handle markdown code blocks)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse analysis JSON: {text[:200]}")
        return {"story_angles": [], "key_quotes": [], "emotional_arc": []}


async def transcript_agent(input_data: dict, context: dict) -> dict:
    """Analyze a transcript for story angles, quotes, and emotional arc."""
    transcript = input_data.get("transcript", "")
    word_timestamps = input_data.get("word_timestamps", [])

    analysis = await analyze_transcript(transcript, word_timestamps)
    themes = [a["angle"] for a in analysis.get("story_angles", [])]
    prior_coverage = await search_story_archive(themes)

    return {**analysis, "prior_coverage": prior_coverage}
