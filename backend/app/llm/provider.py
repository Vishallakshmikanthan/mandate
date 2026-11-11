import json
import logging
from typing import Type, TypeVar, Optional, Any, Dict
from pydantic import BaseModel
import httpx
from app.config import settings

logger = logging.getLogger("mandate.llm")

T = TypeVar("T", bound=BaseModel)


class LLMProvider:
    """Base LLM Provider Interface."""

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        raise NotImplementedError


class MockLLMProvider(LLMProvider):
    """
    Built-in high-fidelity Mock Provider.
    Enables reliable, zero-latency, zero-cost execution for tests,
    offline demos, and CI without external dependencies.
    """

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        user_lower = user_prompt.lower()
        model_name = response_model.__name__

        # Handle RiskScorer output
        if "risk" in model_name.lower():
            if any(term in user_lower for term in [
                "ignore", "system update", "override", "wire", "urgent",
                "emergency", "bypass", "transfer to account", "new instructions"
            ]):
                data = {
                    "risk_score": 0.95,
                    "flags": ["instruction_override_detected", "adversarial_prompt_injection", "fake_urgency"],
                    "recommendation": "BLOCK",
                    "reasoning": "Adversarial prompt injection attempt detected: text commands agent to override rules and transfer money."
                }
            elif "expensive" in user_lower or "5000" in user_lower:
                data = {
                    "risk_score": 0.65,
                    "flags": ["price_anomaly"],
                    "recommendation": "ESCALATE",
                    "reasoning": "Transaction amount is unusually elevated for this category. Human review recommended."
                }
            else:
                data = {
                    "risk_score": 0.04,
                    "flags": ["clean"],
                    "recommendation": "ALLOW",
                    "reasoning": "Intent description and context are standard, compliant, and free of adversarial patterns."
                }
            return response_model.model_validate(data)

        # Handle Arbiter output
        if "arbiter" in model_name.lower():
            if "low-effort" in user_lower or "blurry" in user_lower or "fail" in user_lower or "single concept" in user_lower:
                data = {
                    "verdict": "FAIL",
                    "confidence": 0.94,
                    "criteria_results": [
                        {"criterion": "Includes 3 logo variants", "met": False, "evidence": "Only 1 low-resolution concept provided."},
                        {"criterion": "Includes scalable vector SVGs", "met": False, "evidence": "No vector assets or SVG files found in deliverable."},
                        {"criterion": "Includes PNG transparent exports", "met": True, "evidence": "One low-res raster image present."}
                    ],
                    "partial_ratio": 0.0,
                    "explanation": "Critical contractual specifications unmet: delivered 1 blurry sample instead of 3 vector logos."
                }
            elif "partial" in user_lower:
                data = {
                    "verdict": "PARTIAL",
                    "confidence": 0.88,
                    "criteria_results": [
                        {"criterion": "Includes 3 logo variants", "met": True, "evidence": "3 concepts provided."},
                        {"criterion": "Includes scalable vector SVGs", "met": False, "evidence": "SVG source files were omitted."}
                    ],
                    "partial_ratio": 0.50,
                    "explanation": "Concepts delivered but source vector files missing. 50% partial release recommended."
                }
            else:
                data = {
                    "verdict": "PASS",
                    "confidence": 0.98,
                    "criteria_results": [
                        {"criterion": "Includes 3 logo variants", "met": True, "evidence": "Verified 3 distinct, professional concepts submitted."},
                        {"criterion": "Includes scalable vector SVGs", "met": True, "evidence": "Source .svg and .ai assets included in package."},
                        {"criterion": "Includes PNG transparent exports", "met": True, "evidence": "High-resolution 300dpi PNGs provided."}
                    ],
                    "partial_ratio": 1.0,
                    "explanation": "All acceptance criteria fully satisfied with high fidelity."
                }
            return response_model.model_validate(data)

        # Generic fallback
        return response_model.model_validate({})


class GeminiLLMProvider(LLMProvider):
    """Google Gemini API Provider with structured JSON output."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "temperature": 0.0,
                "response_mime_type": "application/json"
            }
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.url, json=payload)
            resp.raise_for_status()
            result = resp.json()
            text_content = result["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(text_content)
            return response_model.model_validate(parsed_json)


class OpenAILLMProvider(LLMProvider):
    """OpenAI API Provider with JSON mode."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.url = "https://api.openai.com/v1/chat/completions"

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(content)
            return response_model.model_validate(parsed_json)


def get_llm_provider() -> LLMProvider:
    """Factory function returning the active LLM provider."""
    provider_type = settings.LLM_PROVIDER.lower()
    if settings.DEMO_REPLAY_MODE or not settings.LLM_API_KEY:
        return MockLLMProvider()

    if provider_type == "gemini":
        return GeminiLLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)
    elif provider_type == "openai":
        return OpenAILLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)

    return MockLLMProvider()
