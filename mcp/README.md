# Mandate Model Context Protocol (MCP) Server

Connects LLM agent frameworks (Claude Desktop, Antigravity, Cursor, LangChain, AutoGen, CrewAI) directly to **MANDATE**.

---

## 🔒 Security Invariant
> **The MCP Server Never Holds PayPal Credentials.**
> It communicates with the Mandate Gateway strictly using a scoped agent API key. PayPal OAuth tokens, webhook verification, and payment authorizations remain isolated on the Mandate gateway.

---

## Exposed Tools

1. `mandate_request_payment`: Request commercial payment against a mandate. Evaluates deterministic rules (R1–R10) and AI risk scorer.
2. `mandate_get_intent_status`: Check decision and reasons for an existing payment intent.
3. `mandate_get_balance`: Check spent, remaining, and velocity limits for a mandate.
4. `mandate_submit_deliverable`: Submit work deliverables for automated AI arbitration.

---

## Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "mandate": {
      "command": "python",
      "args": ["-m", "mcp.server"],
      "env": {
        "MANDATE_BASE_URL": "http://localhost:8000",
        "MANDATE_API_KEY": "mnd_agent_alpha_key"
      }
    }
  }
}
```

---

## Running Standalone

```bash
export MANDATE_BASE_URL="http://localhost:8000"
export MANDATE_API_KEY="mnd_agent_alpha_key"
python -m mcp.server
```

