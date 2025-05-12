"""
client_ai.py - Wrappers around OpenAI REST and Realtime APIs for PACER AI Service.
"""

import openai
import asyncio
import logging
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

api_key = os.environ.get("OPENAI_API_KEY", "")

# Read chat model from environment or use default
default_chat_model = "gpt-4o-mini"
CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", default_chat_model)
logger.info(f"Client AI using Chat Model: {CHAT_MODEL}")

MOCK_MODE = False

# Sync OpenAI call

def chat_completion_sync(messages, model=None, temperature=0.7):
    effective_model = model or CHAT_MODEL
    if MOCK_MODE:
        logger.info("MOCK_MODE enabled - returning mock response for sync call")
        return {"choices": [{"message": {"content": "[MOCK RESPONSE]"}}]}
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=effective_model,
        messages=messages,
        temperature=temperature
    )
    # Ensure we return a dict, not an OpenAI object
    if hasattr(response, "model_dump"):
        return response.model_dump()
    elif hasattr(response, "__dict__"):
        return response.__dict__
    else:
        import json
        return json.loads(str(response))

# Async OpenAI call
async def chat_completion_async(messages, model=None, temperature=0.7):
    effective_model = model or CHAT_MODEL
    if MOCK_MODE:
        logger.info("MOCK_MODE enabled - returning mock response for async call")
        class MockResponse:
            class Choice:
                class Message:
                    content = "[MOCK RESPONSE]"
                message = Message()
            choices = [Choice()]
        return {"choices": [{"message": {"content": "[MOCK RESPONSE]"}}]}
    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=effective_model,
        messages=messages,
        temperature=temperature
    )
    # Ensure we return a dict, not an OpenAI object
    if hasattr(response, "model_dump"):
        return response.model_dump()
    elif hasattr(response, "__dict__"):
        return response.__dict__
    else:
        import json
        return json.loads(str(response)) 