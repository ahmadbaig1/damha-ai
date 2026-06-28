# CLAUDE.md — SupportOS Project Instructions

> This file is read at the start of every Claude Code session.
> It defines the project vision, architecture, conventions, and rules.
> Do not modify without explicit instruction from the project owner.

> **IMPORTANT:** Also read `Progress.md` at the start of every session.
> It contains the current build state, what's done, what's next, key technical decisions, credentials config, and file map. Do not skip it.

---

## What This Project Is

**SupportOS** is an AI-powered intelligence platform for customer support teams.

It is NOT a chatbot or a simple reply generator.

It is a full support operations layer that helps:
- **Support Engineers** investigate and resolve issues faster with AI assistance
- **Team Leads** monitor conversation health and coach their teams in real time
- **Organizations** detect systemic patterns across thousands of conversations

The MVP focuses on:
- A **standalone web interface** connected to Zendesk via API (not a ZD sidebar app)
- **WordPress ecosystem** as the first investigation domain (themes, plugins, Gravity Forms, hosting)
- **Reply Agent** and **Investigator Agent** as the first two AI agents
- **Coach Agent** as the third (live coaching + post-conversation debrief)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) | Component-based UI |
| Backend | Node.js + Express | REST API |
| Database | PostgreSQL + pgvector | Relational data + AI embeddings |
| AI | Anthropic Claude API | claude-sonnet-4-6 for all agents |
| Helpdesk | Zendesk REST API | Tickets, users, orgs, live chat |
| Auth | JWT | Simple token-based auth for MVP |
| Monorepo | Single repo | `/client` for frontend, `/server` for backend |

---

## Monorepo Structure

```
supportos/
│
├── CLAUDE.md                  ← You are here
├── ARCHITECTURE.md            ← Full system design
├── README.md
├── .env.example
│
├── client/                    ← React frontend (Vite)
│   ├── src/
│   │   ├── components/        ← Reusable UI components
│   │   ├── pages/             ← Route-level pages
│   │   ├── agents/            ← Agent UI panels (Reply, Investigator, Coach)
│   │   ├── hooks/             ← Custom React hooks
│   │   ├── store/             ← State management (Zustand)
│   │   ├── api/               ← API client (axios)
│   │   └── styles/            ← Global styles, design tokens
│   └── package.json
│
├── server/                    ← Node.js + Express backend
│   ├── src/
│   │   ├── routes/            ← Express route handlers
│   │   ├── agents/            ← AI agent logic
│   │   │   ├── reply/
│   │   │   ├── investigator/
│   │   │   ├── coach/
│   │   │   └── planner/
│   │   ├── connectors/        ← Data source connectors
│   │   │   ├── base/          ← SupportProvider interface
│   │   │   └── wordpress/     ← WordPress connector (MVP)
│   │   ├── zendesk/           ← Zendesk API client
│   │   ├── db/                ← PostgreSQL client + migrations
│   │   ├── prompts/           ← All LLM prompt templates
│   │   └── utils/
│   └── package.json
│
├── docs/                      ← Product documentation
│   ├── PRD.md
│   ├── UI-Spec.md
│   └── Roadmap.md
│
└── packages/                  ← Shared types/utilities (future)
```

---

## The Five AI Agents

These are the core of SupportOS. Each agent is a distinct module with its own prompt templates, logic, and API routes.

### 1. Planner Agent
- Reads the incoming conversation
- Infers intent and product area
- Decides which other agents to invoke and in what order
- Does NOT write replies or do investigations itself

### 2. Reply Agent
- Drafts suggested replies for the support engineer
- Considers: conversation history, customer mood, prior context, tone guidelines
- Engineer always reviews and edits before sending — AI never sends directly

### 3. Investigator Agent
- Orchestrates diagnostic workflows
- Calls Connector methods to gather evidence
- Produces a structured "Investigation Report" with findings and hypotheses
- Does NOT decide HOW to retrieve data — that is the Connector's job

### 4. Knowledge Agent (Phase 2)
- Semantic search over internal docs, past tickets, known issues
- Uses pgvector for embeddings
- Not in MVP — placeholder structure only

### 5. Coach Agent
- Watches the conversation in real time
- Surfaces non-intrusive suggestions (like GitHub Copilot)
- Generates end-of-conversation debrief with scores, strengths, and improvements
- Learns which suggestions the engineer accepts or ignores over time

---

## The Connector System

Every data source is accessed through a **Connector** that implements the `SupportProvider` interface.

SupportOS never directly queries a company's internal systems.
Instead, the Connector abstracts all authentication and data fetching.

### SupportProvider Interface (TypeScript)

```typescript
interface SupportProvider {
  authenticate(): Promise<void>;
  getCustomer(id: string): Promise<Customer>;
  getSite(url: string): Promise<SiteInfo>;
  getTickets(customerId: string): Promise<Ticket[]>;
  getSubscriptions(customerId: string): Promise<Subscription[]>;
  getDiagnostics(siteUrl: string): Promise<DiagnosticResult>;
  runDiagnostic(type: string, params: object): Promise<DiagnosticResult>;
  searchKnowledge(query: string): Promise<KnowledgeResult[]>;
  searchLogs(query: string): Promise<LogEntry[]>;
  searchIncidents(query: string): Promise<Incident[]>;
}
```

### MVP Connector: WordPress
The first connector targets the WordPress ecosystem:
- Plugin/theme version checks
- Known conflict lookups
- PHP version compatibility
- Gravity Forms license and entry data (via GF API)
- Hosting environment info (where available via API)

---

## Coding Conventions

### General
- Use **TypeScript** throughout (both client and server)
- Prefer `async/await` over promise chains
- Never hardcode API keys or secrets — always use `.env`
- All environment variables must be documented in `.env.example`

### Backend
- Each route file handles one resource (e.g., `tickets.ts`, `investigations.ts`)
- Agent logic lives in `/server/src/agents/` — never inline in routes
- All prompts live in `/server/src/prompts/` as template strings — never inline in agent logic
- Database queries use parameterized statements — no raw string interpolation

### Frontend
- Components are functional with hooks — no class components
- State management via **Zustand** (not Redux)
- API calls go through `/client/src/api/` — never fetch directly from components
- Design tokens defined in `/client/src/styles/tokens.css`

### AI Calls
- Always use model: `claude-sonnet-4-6`
- Always set a system prompt that defines the agent's role and constraints
- Responses that need structured data must ask for JSON explicitly
- Strip markdown fences before parsing JSON responses
- Wrap all AI calls in try/catch with graceful fallback

---

## Key Design Principles

1. **AI assists, humans decide.** The engineer always reviews before sending. AI never acts autonomously on customer conversations.

2. **Connectors own data access.** The Investigator Agent never calls external APIs directly. It calls Connector methods. This keeps investigation logic portable.

3. **Prompts are first-class code.** Prompt templates are versioned, named, and stored separately. They are not strings buried in logic files.

4. **The Coach is non-intrusive.** Suggestions appear as quiet notifications. The engineer can ignore them. The system notes this and learns.

5. **Privacy by design.** Customer data is never stored longer than the session unless explicitly configured. PII handling must be documented for every data flow.

---

## Environment Variables

```bash
# Anthropic
ANTHROPIC_API_KEY=

# Zendesk
ZENDESK_SUBDOMAIN=
ZENDESK_EMAIL=
ZENDESK_API_TOKEN=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/supportos

# App
PORT=3001
JWT_SECRET=
NODE_ENV=development
```

---

## What NOT to Do

- Do not add features outside the current phase without explicit instruction
- Do not use any AI model other than `claude-sonnet-4-6`
- Do not send customer data to any third-party service not listed in this file
- Do not implement the Knowledge Agent in MVP (structure only)
- Do not build a Zendesk sidebar app — this is a standalone interface
- Do not use Redux — use Zustand
- Do not inline prompts in agent logic files

---

## Current Phase: MVP

**In scope:**
- Zendesk integration (read tickets, conversations, user info)
- Reply Agent
- Investigator Agent (WordPress connector)
- Coach Agent (basic live suggestions + end-of-chat debrief)
- Engineer workspace UI
- PostgreSQL schema (conversations, investigations, coaching scores)

**Out of scope for MVP:**
- Manager dashboard
- Knowledge Agent
- Org-level analytics
- Multi-connector support
- Billing / auth beyond JWT
