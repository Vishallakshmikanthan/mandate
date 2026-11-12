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
    model_name: str = "unknown"

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
    model_name: str = "mock"

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        model_name = response_model.__name__

        # Extract untrusted context or payload if present
        untrusted_text = user_prompt.lower()
        if "<<<begin_untrusted_context>>>" in untrusted_text:
            parts = untrusted_text.split("<<<begin_untrusted_context>>>")
            if len(parts) > 1:
                untrusted_text = parts[1].split("<<<end_untrusted_context>>>")[0]
        elif "<<<begin_deliverable_payload>>>" in untrusted_text:
            parts = untrusted_text.split("<<<begin_deliverable_payload>>>")
            if len(parts) > 1:
                untrusted_text = parts[1].split("<<<end_deliverable_payload>>>")[0]

        # Handle RiskScorer output
        if "risk" in model_name.lower():
            attack_indicators = [
                "ignore", "system update", "override", "wire", "urgent",
                "emergency", "bypass", "transfer to account", "new instructions",
                "directive", "disregard", "subpoena", "developer mode"
            ]
            if any(term in untrusted_text for term in attack_indicators):
                data = {
                    "risk_score": 0.95,
                    "flags": ["instruction_override_detected", "adversarial_prompt_injection", "fake_urgency"],
                    "recommendation": "BLOCK",
                    "reasoning": "Adversarial prompt injection attempt detected: text commands agent to override rules and transfer money."
                }
            elif "expensive" in untrusted_text or "5000" in untrusted_text:
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
            combined_eval_text = untrusted_text.lower()
            if any(term in combined_eval_text for term in ["blurry", "low-effort", "single concept", "substandard", "missing"]):
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
            elif "partial" in combined_eval_text:
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
        self.model_name = model
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
        self.model_name = model
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


class AnthropicLLMProvider(LLMProvider):
    """Anthropic Claude API Provider with JSON parsing."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.model = model
        self.model_name = model
        self.url = "https://api.anthropic.com/v1/messages"

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        prompt_with_instruction = f"{user_prompt}\n\nIMPORTANT: Respond with valid, raw JSON ONLY. No markdown, no triple backticks."
        payload = {
            "model": self.model,
            "max_tokens": 2048,
            "temperature": 0.0,
            "system": system_prompt,
            "messages": [{"role": "user", "content": prompt_with_instruction}]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["content"][0]["text"].strip()
            # Strip markdown codeblocks if model added them
            if raw_text.startswith("```"):
                lines = raw_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_text = "\n".join(lines).strip()
            parsed_json = json.loads(raw_text)
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
    elif provider_type == "anthropic":
        return AnthropicLLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)

    return MockLLMProvider()
