# Proxy API MCP Server Design

## Overview

An MCP (Model Context Protocol) server for Proxy API would give AI agents a standardized way to interact with virtual card infrastructure—creating intents, accessing card details, checking balances, and managing transactions.

## Core Challenge: Two Personas

| Persona | Operations | When |
|---------|-----------|------|
| **Developer/Admin** | Create users, create agents, set policies, generate API keys | Setup/config time |
| **Agent (runtime)** | Get card details, create intents, check balance, list transactions | Execution time |

An existing agent cannot create another agent. Dev/admin operations are setup tasks, not runtime operations.

---

## Architecture Options

### Option 1: Two Separate MCP Servers

Cleanest separation of concerns. Different servers for different personas.

**`proxy-admin`** (for developers)
```
Tools:
- create_user
- get_user / list_users
- initiate_kyc / get_kyc_status
- create_agent / list_agents / suspend_agent
- create_policy / list_policies
- generate_api_key / revoke_api_key
- create_card
- list_transactions (all)
- list_disputes (all)
```
Auth: Org API key (`Api-Key` header) or dashboard token

**`proxy-agent`** (for AI agents at runtime)
```
Tools:
- get_my_card
- get_card_details (raw PAN for checkout)
- create_intent (REQUIRED before any purchase)
- get_balance
- list_my_transactions
- get_transaction
- upload_receipt
```
Auth: Agent-scoped token

**Pros:**
- Clear separation
- Can't accidentally expose admin tools to agents
- Different rate limits per server

**Cons:**
- Two packages to maintain
- Developers need to install/configure both

---

### Option 2: Single Server, Scoped Credentials

One MCP server. The credential type determines which tools are available.

```typescript
// Config with org API key - sees all tools
{
  "mcpServers": {
    "proxy": {
      "command": "proxy-mcp",
      "env": {
        "PROXY_API_KEY": "lk_live_xxxxx"
      }
    }
  }
}

// Config with agent token - scoped tools only
{
  "mcpServers": {
    "proxy": {
      "command": "proxy-mcp",
      "env": {
        "PROXY_AGENT_TOKEN": "at_live_xxxxx",
        "PROXY_AGENT_ID": "agent_abc123"
      }
    }
  }
}
```

Server introspects auth at startup and only registers relevant tools.

**Pros:**
- Single package
- Flexible deployment

**Cons:**
- More complex server logic
- Risk of misconfiguration exposing admin tools

---

### Option 3: Agent-Scoped Identity (Recommended)

The MCP server is **pre-configured** with the agent's identity. The agent doesn't "log in"—it just *is* that agent.

```json
{
  "mcpServers": {
    "proxy": {
      "command": "proxy-mcp",
      "env": {
        "PROXY_AGENT_ID": "agent_abc123",
        "PROXY_AGENT_SECRET": "as_xxxxx"
      }
    }
  }
}
```

All tools are implicitly scoped to this agent:

| Tool | Behavior |
|------|----------|
| `get_card()` | Returns THIS agent's card |
| `get_card_details()` | Returns PAN/CVV for THIS agent's card |
| `create_intent(amount, merchant)` | Creates intent for THIS agent's card |
| `get_balance()` | Returns THIS agent's user's balance |
| `list_transactions()` | Returns THIS agent's transactions only |

No `agent_id` parameter needed anywhere. **No way to access other agents' resources.**

Developers use REST API or a separate admin CLI for setup tasks.

**Pros:**
- Simplest mental model for agent developers
- Impossible to accidentally access wrong resources
- Clean tool signatures (no auth params)

**Cons:**
- Requires new auth primitive (agent-scoped tokens)
- Separate tooling needed for admin operations

---

## Authentication & Tokens

### Current State

| Token Type | Scope | Used By |
|------------|-------|---------|
| `DASHBOARD_SERVICE_TOKEN` | Full admin access | Dashboard backend |
| Org API Key (`lk_live_xxx`) | All org resources | Developers, integrations |

### Proposed: Agent-Scoped Tokens

New token type for agent runtime:

```
at_live_xxxxxxxxxxxx
```

**Properties:**
- Tied to a specific `agent_id`
- Can only access that agent's card(s)
- Can only access that agent's user's balance
- Can create intents only for its own card
- Cannot create users, agents, policies, or other admin operations
- Separate rate limits (more restrictive)

**Generation:**
```bash
POST /v1/agents/:agentId/tokens
Authorization: Api-Key lk_live_xxx

Response:
{
  "token": "at_live_xxxxxxxxxxxx",
  "agent_id": "agent_abc123",
  "created_at": "2025-01-06T...",
  "expires_at": null  // or set expiry
}
```

**Revocation:**
```bash
DELETE /v1/agents/:agentId/tokens/:tokenId
```

---

## Card Details & Raw PAN

### The Problem

Most web checkouts are HTML forms. An AI agent using browser automation needs to type the actual card number:

```
[Card Number: ________________]
[Expiry: __/__]  [CVV: ___]
```

### Solution: Intent-Gated Access

Even though the agent sees the raw PAN, security comes from the **intent system**:

1. Agent MUST create an intent before any purchase
2. Intent specifies: merchant category, amount, time window
3. Card declines any transaction not matching an active intent
4. PAN access is logged and rate-limited (10/hour per card)

```
Flow:
1. create_intent(merchant="amazon.com", amount=150, currency="USD")
   → intent_id: "int_xxx", expires_at: "..."

2. get_card_details()
   → { pan: "4111...", cvv: "123", exp: "12/27" }

3. Agent completes checkout on amazon.com

4. Transaction arrives, matches intent → APPROVED
   (or no match → DECLINED)
```

### Credential Modes

The `get_card_details` tool respects the card's credential mode:

| Mode | Behavior |
|------|----------|
| `never` | Tool returns error, PAN not available via API |
| `rawPan` | Returns `{ pan, cvv, exp }` |

For future consideration:
- `tokenized` - Returns network token instead of raw PAN (requires merchant support)
- `browserExtension` - Returns reference ID for browser extension auto-fill

---

## Proposed Tool Catalog

### Agent Runtime Tools (Option 3)

```typescript
// Card access
get_card()
  → { card_id, last4, status, type, limits }

get_card_details()
  → { pan, cvv, exp_month, exp_year }
  // Requires active intent, rate-limited

// Spending control (REQUIRED)
create_intent(params: {
  merchant?: string,          // e.g., "amazon.com"
  merchant_category?: string, // e.g., "retail", "travel"
  amount: number,
  currency: string,
  description?: string,
  expires_in?: number         // seconds, default 3600
})
  → { intent_id, expires_at }

list_intents(status?: "pending" | "matched" | "expired")
  → Intent[]

cancel_intent(intent_id: string)
  → { success: true }

// Funds
get_balance()
  → { available, pending, currency }

// Transactions
list_transactions(params?: {
  status?: string,
  limit?: number,
  cursor?: string
})
  → { data: Transaction[], cursor, has_more }

get_transaction(transaction_id: string)
  → Transaction

upload_receipt(transaction_id: string, params: {
  file?: File,
  url?: string
})
  → { receipt_id }
```

### Admin Tools (Separate CLI/API)

Not exposed via agent MCP server:

```
- create_user / update_user / delete_user
- initiate_kyc / get_kyc_status
- create_agent / update_agent / suspend_agent / delete_agent
- create_policy / update_policy / delete_policy
- create_card / freeze_card / close_card
- generate_agent_token / revoke_agent_token
- list_all_transactions / list_all_disputes
- webhook management
```

---

## Example Agent Flow

```python
# AI Agent booking a flight

# 1. Create intent FIRST (required)
intent = proxy.create_intent(
    merchant_category="travel",
    amount=450,
    currency="USD",
    description="Flight to NYC"
)

# 2. Get card details
card = proxy.get_card_details()

# 3. Complete purchase (browser automation)
browser.fill("#card-number", card.pan)
browser.fill("#expiry", f"{card.exp_month}/{card.exp_year}")
browser.fill("#cvv", card.cvv)
browser.click("#pay-now")

# 4. Verify transaction
txns = proxy.list_transactions(status="completed")
flight_txn = next(t for t in txns if t.intent_id == intent.intent_id)

# 5. Upload receipt
proxy.upload_receipt(flight_txn.id, url=browser.current_url)
```

---

## Open Questions

1. **Token expiry** - Should agent tokens expire? Auto-rotate?

2. **Multi-card agents** - If an agent has multiple cards, does `get_card()` return all of them, or is the token scoped to one card?

3. **Intent auto-creation** - Should certain low-risk transactions (under $X, known merchant) auto-create intents?

4. **Webhook delivery to agents** - Can/should agents subscribe to real-time events via MCP resources?

5. **Sandbox mode** - How does test/sandbox work in MCP context? Separate server? Flag in config?

---

## Next Steps

1. Decide on architecture (recommend Option 3)
2. Design agent token schema and endpoints
3. Implement MCP server with agent runtime tools
4. Build admin CLI or separate admin MCP for dev operations
5. Documentation and SDK examples
