"""ContentAgent — Multi-format content generator with station voice switching.

Generates all six content formats from a single interview using
Claude Sonnet via Gradient SDK or Anthropic API.
"""

import json
import logging

from gradient_adk import trace_llm, trace_retriever

from ._llm import call_llm

logger = logging.getLogger(__name__)

CONTENT_SYSTEM_PROMPT = """You are an expert radio content producer who transforms interview transcripts into multiple formats. Generate ALL six formats from the provided transcript.

For each format, match the station's voice and the DJ's personal style.

Return ONLY valid JSON with these keys:

1. "air_break" — { "script": "60-90 second on-air script with cues", "estimated_seconds": number }
2. "podcast_segment" — { "script": "5-8 minute podcast script with transitions", "estimated_seconds": number }
3. "social_thread" — { "posts": ["post1", "post2", "post3"] } — 3-5 social media posts
4. "web_article" — { "html": "<p>...</p>" } — 300-500 word web article in HTML
5. "newsletter_copy" — { "text": "..." } — 150-200 word newsletter blurb
6. "press_release" — { "text": "..." } — Formal press release format

Guidelines:
- Air break: Punchy, conversational, includes best quote
- Podcast: Narrative arc, uses multiple quotes, includes music cue suggestions
- Social: Platform-native, engaging, include hashtag suggestions
- Web article: SEO-friendly, includes quotes with attribution
- Newsletter: Concise hook + key takeaway
- Press release: Professional, newsworthy framing"""

STUB_CONTENT = {
    "air_break": {"script": "[Stub] Air break script based on transcript.", "estimated_seconds": 90},
    "podcast_segment": {"script": "[Stub] Podcast segment with narrative arc.", "estimated_seconds": 480},
    "social_thread": {"posts": ["[Stub] Compelling social post #1", "[Stub] Follow-up post #2", "[Stub] Call to action #3"]},
    "web_article": {"html": "<p>[Stub] Web article based on interview highlights.</p>"},
    "newsletter_copy": {"text": "[Stub] Newsletter copy with key takeaway."},
    "press_release": {"text": "[Stub] Press release with newsworthy framing."},
}

FAIL_CONTENT = {
    "air_break": {"script": "Generation failed — please retry.", "estimated_seconds": 0},
    "podcast_segment": {"script": "Generation failed.", "estimated_seconds": 0},
    "social_thread": {"posts": ["Generation failed."]},
    "web_article": {"html": "<p>Generation failed.</p>"},
    "newsletter_copy": {"text": "Generation failed."},
    "press_release": {"text": "Generation failed."},
}


@trace_retriever("content_style_search")
async def get_style_profile(style_profile_id: str) -> dict:
    """Retrieve DJ's personal writing style from knowledge base."""
    return {"tone": "conversational", "vocabulary": "accessible", "sentence_length": "short"}


@trace_llm("content_generate")
async def generate_formats(transcript: str, steering: dict, voice_guide: str, style: dict) -> dict:
    """Generate all six content formats."""

    angle = steering.get("selectedAngle", steering.get("selected_angle", ""))
    tone = steering.get("emotionalTone", steering.get("emotional_tone", ""))
    direction = steering.get("narrativeDirection", steering.get("narrative_direction", ""))

    user_message = f"""Transform this interview transcript into all six content formats.

Transcript:
{transcript[:6000]}

Steering:
- Selected angle: {angle or "Choose the strongest angle"}
- Emotional tone: {tone or "Match the transcript's natural tone"}
- Narrative direction: {direction or "Find the most compelling narrative"}

Style: {json.dumps(style)}
Voice guide: {voice_guide or "Conversational, community-focused, authentic"}

Return ONLY valid JSON with keys: air_break, podcast_segment, social_thread, web_article, newsletter_copy, press_release"""

    text = await call_llm(CONTENT_SYSTEM_PROMPT, user_message, max_tokens=8192)

    if text is None:
        logger.warning("All LLM providers failed — returning stub content")
        return STUB_CONTENT

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse content JSON: {text[:200]}")
        return FAIL_CONTENT


async def content_agent(input_data: dict, context: dict) -> dict:
    """Generate all six content formats from a single interview."""
    transcript = input_data.get("transcript", "")
    steering = input_data.get("steering", {})
    station = input_data.get("station", {})
    style_profile_id = input_data.get("style_profile", "")

    voice_guide = station.get("voice_guide", "")
    style = await get_style_profile(style_profile_id)

    return await generate_formats(transcript, steering, voice_guide, style)
