"""Shared LLM call helper with automatic model fallback.

Tries Claude 4.6 Sonnet via Gradient → llama3.3-70b → Anthropic API → stub.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

GRADIENT_MODEL_ACCESS_KEY = os.environ.get("GRADIENT_MODEL_ACCESS_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

GRADIENT_URL = "https://inference.do-ai.run/v1/chat/completions"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

# Ordered preference: Claude 4.6 Sonnet, llama3.3 fallback
GRADIENT_MODELS = ["anthropic-claude-4.6-sonnet", "llama3.3-70b-instruct"]


async def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    timeout: float = 120.0,
) -> str | None:
    """Call LLM with automatic fallback chain.

    Returns the text response, or None if all methods fail.
    """

    # --- Try Gradient inference (with model fallback) ---
    if GRADIENT_MODEL_ACCESS_KEY:
        headers = {
            "Authorization": f"Bearer {GRADIENT_MODEL_ACCESS_KEY}",
            "Content-Type": "application/json",
        }
        for model in GRADIENT_MODELS:
            body = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": max_tokens,
            }
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(GRADIENT_URL, headers=headers, json=body)
                    if response.status_code == 401:
                        logger.info(f"Model {model} not available on tier, trying next...")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                logger.warning(f"Gradient {model} failed: {e}")
                continue
            except Exception as e:
                logger.warning(f"Gradient {model} error: {e}")
                continue

    # --- Try Anthropic API directly ---
    if ANTHROPIC_API_KEY:
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        body = {
            "model": "claude-sonnet-4-6-20250514",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(ANTHROPIC_URL, headers=headers, json=body)
                response.raise_for_status()
                data = response.json()
                return data["content"][0]["text"]
        except Exception as e:
            logger.warning(f"Anthropic API failed: {e}")

    return None
