"""ContentAgent — Multi-format content generator with station voice switching.

Generates all six content formats from a single interview using
Claude Sonnet 4.5 with station-specific voice guides and DJ style profiles.
"""

import logging
from gradient_adk import trace_llm, trace_retriever

logger = logging.getLogger(__name__)


@trace_retriever("content_style_search")
async def get_style_profile(style_profile_id: str) -> dict:
    """Retrieve DJ's personal writing style from knowledge base."""
    # TODO: Retrieve from personal-style Knowledge Base
    return {"tone": "conversational", "vocabulary": "accessible", "sentence_length": "short"}


@trace_llm("content_generate")
async def generate_formats(transcript: str, steering: dict, voice_guide: str, style: dict) -> dict:
    """Generate all six content formats using Claude Sonnet 4.5."""
    # TODO: Call anthropic-claude-4.5-sonnet with station voice and DJ style
    return {
        "air_break": {"script": "[ContentAgent stub] Air break script...", "estimated_seconds": 90},
        "podcast_segment": {"script": "[ContentAgent stub] Podcast segment...", "estimated_seconds": 480},
        "social_thread": {"posts": ["[ContentAgent stub] Social post 1"]},
        "web_article": {"html": "<p>[ContentAgent stub] Web article...</p>"},
        "newsletter_copy": {"text": "[ContentAgent stub] Newsletter copy..."},
        "press_release": {"text": "[ContentAgent stub] Press release..."},
    }


async def content_agent(input_data: dict, context: dict) -> dict:
    """Generate all six content formats from a single interview.

    Args:
        input_data: Contains 'transcript', 'selected_tape', 'steering',
                    'station', 'style_profile'.
        context: Gradient platform context for tracing.

    Returns:
        Dict with all six content format outputs.
    """
    transcript = input_data.get("transcript", "")
    steering = input_data.get("steering", {})
    station = input_data.get("station", {})
    style_profile_id = input_data.get("style_profile", "")

    voice_guide = station.get("voice_guide", "")
    style = await get_style_profile(style_profile_id)

    return await generate_formats(transcript, steering, voice_guide, style)
