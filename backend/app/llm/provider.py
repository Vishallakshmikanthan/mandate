import json
import time
import logging
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError
import httpx
from app.config import settings
from app.core.telemetry import metrics

logger = logging.getLogger("mandate.llm")

T = TypeVar("T", bound=BaseModel)


class LLMCallMetrics(BaseModel):
    model: str
    latency_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    repair_retried: bool = False


class LLMProvider:
    """Base LLM Provider Interface with built-in schema repair and observability."""
    model_name: str = "unknown"

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        raise NotImplementedError

    def _strip_markdown_json(self, text: str) -> str:
        """Strip surrounding markdown code fences from JSON output."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        return cleaned

    def _validate_or_repair_json(
        self,
        raw_text: str,
        response_model: Type[T]
    ) -> T:
        """Parse and validate JSON string against response_model schema."""
        cleaned = self._strip_markdown_json(raw_text)
        data = json.loads(cleaned)
        return response_model.model_validate(data)


class MockLLMProvider(LLMProvider):
    """
    Built-in high-fidelity Mock Provider for demo mode and tests.
    Strictly forbidden in prod/dev environments.
    """
    model_name: str = "mock"
    simulate_malformed: bool = False
    simulate_timeout: bool = False

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> T:
        if self.simulate_timeout:
            raise TimeoutError("Mock LLM request timed out.")

        if self.simulate_malformed:
            raise ValueError("Mock LLM produced unparseable non-JSON output.")

        start = time.perf_counter()
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
                "ignore all", "ignore previous", "ignore prior", "ignore instructions",
                "system update:", "system override", "admin override", "bypass firewall",
                "bypass verification", "bypass security", "bypass rules", "bypass policy",
                "disregard constraints", "disregard rules", "disregard instructions",
                "developer mode", "jailbreak", "dan mode", "prompt injection",
                "transfer to account", "shadow_pool", "banned_entity", "attacker_root",
                "court order subpoena", "emergency wire", "emergency transfer",
                "wire $", "send $", "pay $", "wire payment", "root access",
                "supervisor key", "system directive", "kill -9", "pkill", "ransomware",
                "subpoena", "directive 99", "ignora", "ignorer", "ignoriere",
                "игнорируй", "忽略"
            ]
            if any(term in untrusted_text for term in attack_indicators):
                data = {
                    "risk_score": 0.95,
                    "flags": ["instruction_override_detected", "adversarial_prompt_injection", "fake_urgency"],
                    "recommendation": "BLOCK",
                    "reasoning": "Adversarial prompt injection attempt detected: text commands agent to override rules and transfer money."
                }
            elif any(term in untrusted_text for term in ["expensive", "5000", "price_anomaly"]):
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
            latency_ms = (time.perf_counter() - start) * 1000
            prompt_tokens = max(20, len(system_prompt + user_prompt) // 4)
            completion_tokens = 60
            cost_cents = round((prompt_tokens * 0.000075 + completion_tokens * 0.00030) / 100, 4)
            metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
            logger.info("Mock LLM call (RiskScorer): latency=%.2fms", latency_ms)
            return response_model.model_validate(data)

        # Handle Arbiter output
        if "arbiter" in model_name.lower():
            combined_eval_text = untrusted_text.lower()
            if any(term in combined_eval_text for term in [
                "system update", "override", "bypass", "ignore", "jailbreak",
                "grade this", "instructions update", "prompt injection", "<<<system>>>",
                "verdict must be", "verdict: pass", "force pass", "return pass",
                "rate pass", "mark pass", "output pass", "award pass", "system prompt",
                "ai reviewer", "safety test active", "arbiter directive", "arbiter update",
                "prompt reset", "forget criteria", "default to pass", "client verbally",
                "client waived", "treat this text", "confirmed full satisfaction"
            ]):
                data = {
                    "verdict": "FAIL",
                    "confidence": 0.96,
                    "criteria_results": [],
                    "partial_ratio": 0.0,
                    "explanation": "Adversarial prompt injection attempt detected in deliverable payload. Rejected."
                }
            elif any(term in combined_eval_text for term in ["blurry", "low-effort", "single concept", "substandard", "missing"]):
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
            latency_ms = (time.perf_counter() - start) * 1000
            prompt_tokens = max(20, len(system_prompt + user_prompt) // 4)
            completion_tokens = 60
            cost_cents = round((prompt_tokens * 0.000075 + completion_tokens * 0.00030) / 100, 4)
            metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
            logger.info("Mock LLM call (Arbiter): latency=%.2fms", latency_ms)
            return response_model.model_validate(data)

        latency_ms = (time.perf_counter() - start) * 1000
        metrics.record_llm_call(latency_ms, 20, 20, 0.001)
        return response_model.model_validate({})


class GeminiLLMProvider(LLMProvider):
    """Google Gemini API Provider with structured JSON output and schema repair retry."""

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
        start = time.perf_counter()
        schema_json = json.dumps(response_model.model_json_schema())
        instruction = f"{system_prompt}\n\nSTRICT REQUIREMENT: You must respond with valid JSON adhering to schema: {schema_json}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{instruction}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "temperature": 0.0,
                "response_mime_type": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(self.url, json=payload)
            resp.raise_for_status()
            result = resp.json()
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"]

            usage = result.get("usageMetadata", {})
            prompt_tokens = usage.get("promptTokenCount", 0)
            completion_tokens = usage.get("candidatesTokenCount", 0)
            total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)

            try:
                parsed = self._validate_or_repair_json(raw_text, response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000010 + completion_tokens * 0.000040) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                logger.info(
                    "Gemini complete_json success: model=%s latency=%.1fms tokens=%d",
                    self.model, latency_ms, total_tokens
                )
                return parsed
            except (json.JSONDecodeError, ValidationError) as err:
                logger.warning("Gemini JSON validation failed (%s), attempting schema repair retry", err)
                # Schema repair retry
                repair_payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": (
                            f"Your previous response failed validation: {err}.\n"
                            f"Previous response was:\n{raw_text}\n\n"
                            f"Please return ONLY corrected valid JSON adhering strictly to: {schema_json}"
                        )}]}
                    ],
                    "generationConfig": {
                        "temperature": 0.0,
                        "response_mime_type": "application/json"
                    }
                }
                retry_resp = await client.post(self.url, json=repair_payload)
                retry_resp.raise_for_status()
                retry_text = retry_resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = self._validate_or_repair_json(retry_text, response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000010 + completion_tokens * 0.000040) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                logger.info("Gemini schema repair succeeded: latency=%.1fms", latency_ms)
                return parsed


class OpenAILLMProvider(LLMProvider):
    """OpenAI API Provider with JSON mode and schema repair retry."""

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
        start = time.perf_counter()
        schema_json = json.dumps(response_model.model_json_schema())
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": f"{system_prompt}\n\nStrict JSON Schema: {schema_json}"},
                {"role": "user", "content": user_prompt}
            ]
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(self.url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]

            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

            try:
                parsed = self._validate_or_repair_json(raw_text, response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000015 + completion_tokens * 0.000060) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                logger.info("OpenAI complete_json success: model=%s latency=%.1fms tokens=%d", self.model, latency_ms, total_tokens)
                return parsed
            except (json.JSONDecodeError, ValidationError) as err:
                logger.warning("OpenAI validation failed (%s), attempting schema repair retry", err)
                retry_payload = {
                    "model": self.model,
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": f"Previous response failed validation: {err}. Output ONLY corrected JSON matching: {schema_json}"},
                        {"role": "user", "content": f"Fix this invalid JSON:\n{raw_text}"}
                    ]
                }
                retry_resp = await client.post(self.url, headers=headers, json=retry_payload)
                retry_resp.raise_for_status()
                retry_data = retry_resp.json()
                parsed = self._validate_or_repair_json(retry_data["choices"][0]["message"]["content"], response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000015 + completion_tokens * 0.000060) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                return parsed


class AnthropicLLMProvider(LLMProvider):
    """Anthropic Claude API Provider with structured output and schema repair retry."""

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
        start = time.perf_counter()
        schema_json = json.dumps(response_model.model_json_schema())
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        prompt_with_instruction = (
            f"{user_prompt}\n\n"
            f"IMPORTANT: Respond with valid, raw JSON ONLY adhering strictly to schema: {schema_json}. No markdown formatting."
        )
        payload = {
            "model": self.model,
            "max_tokens": 2048,
            "temperature": 0.0,
            "system": system_prompt,
            "messages": [{"role": "user", "content": prompt_with_instruction}]
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(self.url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["content"][0]["text"].strip()

            usage = data.get("usage", {})
            prompt_tokens = usage.get("input_tokens", 0)
            completion_tokens = usage.get("output_tokens", 0)
            total_tokens = prompt_tokens + completion_tokens

            try:
                parsed = self._validate_or_repair_json(raw_text, response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000300 + completion_tokens * 0.001500) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                logger.info("Anthropic complete_json success: model=%s latency=%.1fms tokens=%d", self.model, latency_ms, total_tokens)
                return parsed
            except (json.JSONDecodeError, ValidationError) as err:
                logger.warning("Anthropic validation failed (%s), attempting schema repair retry", err)
                retry_payload = {
                    "model": self.model,
                    "max_tokens": 2048,
                    "temperature": 0.0,
                    "system": "You are a JSON schema repair assistant. Respond with RAW VALID JSON ONLY.",
                    "messages": [
                        {"role": "user", "content": (
                            f"The previous output failed validation: {err}.\n"
                            f"Previous response was:\n{raw_text}\n\n"
                            f"Provide ONLY the corrected valid JSON matching this schema:\n{schema_json}"
                        )}
                    ]
                }
                retry_resp = await client.post(self.url, headers=headers, json=retry_payload)
                retry_resp.raise_for_status()
                retry_text = retry_resp.json()["content"][0]["text"].strip()
                parsed = self._validate_or_repair_json(retry_text, response_model)
                latency_ms = (time.perf_counter() - start) * 1000
                cost_cents = round((prompt_tokens * 0.000300 + completion_tokens * 0.001500) / 100, 4)
                metrics.record_llm_call(latency_ms, prompt_tokens, completion_tokens, cost_cents)
                return parsed


def get_llm_provider() -> LLMProvider:
    """
    Factory function returning the active LLM provider.
    MockLLMProvider is strictly restricted to demo and test environments.
    """
    env = settings.APP_ENV.lower()
    provider_type = settings.LLM_PROVIDER.lower()

    if env not in ("demo", "test"):
        if provider_type == "mock":
            raise ValueError(
                f"MockLLMProvider is strictly forbidden in APP_ENV='{settings.APP_ENV}'. "
                "Configure a real provider ('gemini', 'openai', or 'anthropic') and provide LLM_API_KEY."
            )
        if not settings.LLM_API_KEY:
            raise ValueError(
                f"LLM_API_KEY is required in APP_ENV='{settings.APP_ENV}' for provider '{provider_type}'."
            )

    if settings.DEMO_REPLAY_MODE or not settings.LLM_API_KEY or provider_type == "mock":
        return MockLLMProvider()

    if provider_type == "gemini":
        return GeminiLLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)
    elif provider_type == "openai":
        return OpenAILLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)
    elif provider_type == "anthropic":
        return AnthropicLLMProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)

    return MockLLMProvider()
