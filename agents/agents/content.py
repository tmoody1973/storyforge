"""ContentAgent — Multi-format content generator with station voice switching."""


async def content_agent(input_data: dict) -> dict:
    """Generate all six content formats from a single interview.

    Args:
        input_data: Contains 'transcript', 'selected_tape' (timestamps),
                    'steering' (angle, tone, themes), 'station' (voice guide),
                    'style_profile' (DJ's writing style).

    Returns:
        Dict with 'air_break', 'podcast_segment', 'social_thread',
        'web_article', 'newsletter_copy', 'press_release'.
    """
    station = input_data.get("station", {})
    steering = input_data.get("steering", {})

    # TODO: Call anthropic-claude-4.5-sonnet with station voice and DJ style
    # TODO: Retrieve from personal-style Knowledge Base

    return {
        "air_break": {"script": "[ContentAgent stub] Air break script...", "estimated_seconds": 90},
        "podcast_segment": {"script": "[ContentAgent stub] Podcast segment...", "estimated_seconds": 480},
        "social_thread": {"posts": ["[ContentAgent stub] Social post 1"]},
        "web_article": {"html": "<p>[ContentAgent stub] Web article...</p>"},
        "newsletter_copy": {"text": "[ContentAgent stub] Newsletter copy..."},
        "press_release": {"text": "[ContentAgent stub] Press release..."},
    }
