# ARCHITECTURE.md — SupportOS Technical Blueprint

> Living document. Updated as the system evolves.
> Last updated: MVP Phase

---

## System Overview

SupportOS is a monorepo web application with a React frontend and a Node.js/Express backend. It connects to Zendesk as the primary helpdesk data source and uses the Anthropic Claude API for all AI agent logic.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                      │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Ticket   │  │ Investigator │  │   Coach Panel     │ │
│  │ Workspace│  │ Panel        │  │   (live sidebar)  │ │
│  └──────────┘  └──────────────┘  └───────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────┐
│                  Express API Server                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Planner │  │  Reply   │  │Investigat│  │ Coach  │ │
│  │  Agent   │  │  Agent   │  │or Agent  │  │ Agent  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       └─────────────┴──────────────┴─────────────┘      │
│                         │                                │
│              ┌──────────▼──────────┐                    │
│              │   Anthropic Claude  │                    │
│              │      API            │                    │
│              └─────────────────────┘                    │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────────────┐   │
│  │  Zendesk Client  │   │  Connector Registry       │   │
│  │  (tickets/users) │   │  └─ WordPress Connector   │   │
│  └──────────────────┘   └──────────────────────────┘   │
└──────────────────────────────────┬──────────────────────┘
                                   │
              ┌────────────────────▼──────────────────┐
              │         PostgreSQL + pgvector          │
              └───────────────────────────────────────┘
```

---

## Data Flow: A Typical Conversation

1. Engineer opens a Zendesk ticket in SupportOS
2. Frontend fetches ticket + conversation history from `/api/tickets/:id`
3. Backend fetches full ticket data from Zendesk API
4. **Planner Agent** analyzes conversation, infers intent and product area
5. Planner triggers **Investigator Agent** if a diagnostic workflow is appropriate
6. Investigator calls **WordPress Connector** methods to gather evidence
7. Investigator returns a structured Investigation Report to the frontend
8. **Reply Agent** drafts a suggested response using ticket context + investigation findings
9. **Coach Agent** monitors the live conversation and surfaces non-intrusive suggestions
10. Engineer reviews, edits, and sends the reply via Zendesk API
11. End of conversation: Coach Agent generates debrief, saved to PostgreSQL

---

## Database Schema (MVP)

### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_ticket_id BIGINT UNIQUE NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  subject TEXT,
  status TEXT,              -- open | pending | solved | closed
  channel TEXT,             -- chat | email | api
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### investigations
```sql
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  triggered_by TEXT,        -- planner | manual
  connector TEXT,           -- wordpress | gravity-forms | etc
  status TEXT,              -- running | complete | failed
  evidence JSONB,           -- raw data collected from connector
  report JSONB,             -- structured findings and hypotheses
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### coaching_sessions
```sql
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  engineer_id TEXT,         -- ZD agent ID
  suggestions JSONB,        -- all suggestions surfaced during conversation
  accepted_count INT DEFAULT 0,
  ignored_count INT DEFAULT 0,
  debrief JSONB,            -- end-of-chat debrief object
  quality_score INT,        -- 0-100
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### reply_drafts
```sql
CREATE TABLE reply_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  draft_text TEXT,
  accepted BOOLEAN,
  edited BOOLEAN,           -- was the draft modified before sending?
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Routes (MVP)

### Tickets
```
GET    /api/tickets                  List recent ZD tickets
GET    /api/tickets/:id              Get ticket + conversation
GET    /api/tickets/:id/comments     Get all comments/messages
```

### Agents
```
POST   /api/agents/reply             Generate reply draft
POST   /api/agents/investigate       Trigger investigation
GET    /api/agents/investigate/:id   Poll investigation status
POST   /api/agents/coach/suggestion  Get live coaching suggestion
POST   /api/agents/coach/debrief     Generate end-of-chat debrief
```

### Connectors
```
GET    /api/connectors               List available connectors
POST   /api/connectors/wordpress/diagnose   Run WP diagnostic
```

---

## Agent Architecture

Each agent follows the same pattern:

```
/server/src/agents/<name>/
  ├── index.ts          ← Main agent function (exported)
  ├── prompt.ts         ← Prompt templates
  ├── schema.ts         ← Input/output TypeScript types
  └── README.md         ← What this agent does and why
```

### Planner Agent Logic

```
Input:  conversation history + available connector capabilities
Output: { intent, product_area, recommended_workflows: string[] }

Prompt instructs Claude to:
1. Read the conversation
2. Identify the most likely product area (WordPress, Gravity Forms, etc.)
3. Identify the customer's core problem
4. Return JSON with intent classification and recommended agent workflows
```

### Reply Agent Logic

```
Input:  conversation history + investigation report (if available) + tone guidelines
Output: { draft: string, confidence: number, reasoning: string }

Prompt instructs Claude to:
1. Read full conversation history
2. Incorporate any investigation findings
3. Draft a reply that matches the company's support tone
4. Explain briefly why it chose this approach
```

### Investigator Agent Logic

```
Input:  intent + connector capabilities + conversation context
Output: { evidence: object, findings: string[], hypothesis: string, confidence: number }

Flow:
1. Planner selects which connector methods to call
2. Investigator calls them in sequence
3. Collects evidence into structured format
4. Sends evidence to Claude for analysis
5. Returns structured report

Claude's role: analyze the evidence, NOT decide how to fetch it
```

### Coach Agent Logic

```
Live suggestions (called every N messages):
Input:  conversation so far + engineer actions taken
Output: { suggestion: string | null, type: 'empathy'|'efficiency'|'positive'|null }

Only surfaces a suggestion if confidence is high enough (threshold TBD).
Returns null if no suggestion warranted — silence is the default.

End-of-chat debrief:
Input:  full conversation + investigation report + reply history
Output: {
  quality_score: number,        // 0-100
  resolution_time: number,      // minutes
  mood_start: number,           // estimated 0-100
  mood_end: number,
  strengths: string[],
  improvements: string[],
  key_moment: string            // the turning point in the conversation
}
```

---

## Connector System

### SupportProvider Interface

```typescript
// /server/src/connectors/base/SupportProvider.ts

export interface Customer {
  id: string;
  name: string;
  email: string;
  plan?: string;
  accountAge?: string;
}

export interface SiteInfo {
  url: string;
  phpVersion?: string;
  wordpressVersion?: string;
  activeTheme?: string;
  activePlugins?: string[];
  hostingProvider?: string;
}

export interface DiagnosticResult {
  type: string;
  status: 'pass' | 'warning' | 'fail' | 'unknown';
  message: string;
  data?: object;
}

export interface SupportProvider {
  name: string;
  capabilities: string[];   // advertised list of what this connector can do

  authenticate(): Promise<void>;
  getCustomer(id: string): Promise<Customer>;
  getSite(url: string): Promise<SiteInfo>;
  getTickets(customerId: string): Promise<object[]>;
  getSubscriptions(customerId: string): Promise<object[]>;
  getDiagnostics(siteUrl: string): Promise<DiagnosticResult[]>;
  runDiagnostic(type: string, params: object): Promise<DiagnosticResult>;
  searchKnowledge(query: string): Promise<object[]>;
  searchLogs(query: string): Promise<object[]>;
  searchIncidents(query: string): Promise<object[]>;
}
```

### WordPress Connector (MVP)

Located at: `/server/src/connectors/wordpress/`

Capabilities (MVP scope):
- `getSite` — WP version, PHP version, active plugins/themes via WP REST API
- `getDiagnostics` — Check for known plugin conflicts, outdated versions
- `searchKnowledge` — Search wordpress.org plugin/theme changelogs and known issues
- `runDiagnostic` — Run specific checks (e.g., "gravity-forms-license", "plugin-conflict")

Data sources used by WordPress Connector:
- WordPress REST API (site-specific, requires site URL)
- wordpress.org API (public plugin/theme data)
- Gravity Forms REST API (if license key provided)
- Internal known-issues JSON (maintained in repo)

---

## Zendesk Integration

### Authentication
- OAuth token or API token (configured in `.env`)
- All calls made server-side — token never exposed to client

### Key Endpoints Used (MVP)
```
GET /api/v2/tickets/{id}                     Ticket details
GET /api/v2/tickets/{id}/comments            Conversation history
GET /api/v2/users/{id}                       Customer/agent info
GET /api/v2/organizations/{id}               Org details
POST /api/v2/tickets/{id}/comments           Post reply (when engineer sends)
GET /api/v2/search?query=...                 Search tickets
```

### Live Updates
- MVP: Polling every 10 seconds for new comments
- Phase 2: Zendesk webhooks for real-time push

---

## Frontend Architecture

### Pages (MVP)
```
/                     → Redirect to /tickets
/tickets              → Ticket list view
/tickets/:id          → Main workspace (ticket + agents + coach)
/settings             → ZD connection, connector config
```

### Main Workspace Layout (`/tickets/:id`)
```
┌─────────────────────────────────────────────────────┐
│  Header: Ticket #ID | Customer Name | Status        │
├───────────────────────────┬─────────────────────────┤
│                           │                         │
│   Conversation Thread     │   Agent Panel           │
│                           │                         │
│   [messages scroll here]  │   [Reply Draft]         │
│                           │   [Investigation]        │
│                           │   [Coach Suggestions]   │
│                           │                         │
├───────────────────────────┴─────────────────────────┤
│   Reply Composer (engineer types here)              │
│   [AI Draft]  [Investigate]  [Send]                 │
└─────────────────────────────────────────────────────┘
```

### State Management (Zustand)
```typescript
// Stores
useTicketStore       // current ticket, comments, loading state
useAgentStore        // reply draft, investigation report, coach suggestions
useCoachStore        // live suggestions, debrief, quality score
useSettingsStore     // ZD config, connector config
```

---

## Security Notes (MVP)

- All API keys stored in `.env`, never committed
- Zendesk API token stored server-side only
- JWT tokens expire in 24 hours
- No customer PII stored beyond what's needed for the session
- Investigation evidence stored in DB but scoped to conversation ID
- No third-party analytics or tracking in MVP

---

## Development Setup

```bash
# Clone repo
git clone https://github.com/yourname/supportos
cd supportos

# Install dependencies
npm install           # root (shared scripts)
cd client && npm install
cd ../server && npm install

# Configure environment
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, ZENDESK_*, DATABASE_URL, JWT_SECRET

# Start database (Docker recommended)
docker run --name supportos-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Run migrations
cd server && npm run db:migrate

# Start development
npm run dev           # starts both client and server concurrently
```

---

## Phase Roadmap

### MVP (Current)
- [ ] Monorepo scaffold
- [ ] Zendesk API client
- [ ] Ticket list + workspace UI
- [ ] Reply Agent
- [ ] Investigator Agent + WordPress Connector
- [ ] Coach Agent (live suggestions + debrief)
- [ ] PostgreSQL schema + migrations

### Phase 2 — Team Intelligence
- [ ] Manager dashboard
- [ ] Live team conversation health view
- [ ] Knowledge Agent (pgvector semantic search)
- [ ] Zendesk webhooks (replace polling)
- [ ] Weekly coaching reports

### Phase 3 — Organization Intelligence
- [ ] Cross-conversation pattern detection
- [ ] Incident detection from conversation trends
- [ ] Executive reporting
- [ ] Connector SDK (for third-party connectors)
