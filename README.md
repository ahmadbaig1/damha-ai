# Damha AI (SupportOS)

An AI-powered support operations platform that connects to Zendesk and uses Claude AI agents to assist support engineers — drafting replies, running diagnostic investigations, and coaching in real time.

## How It Works

A support engineer opens a Zendesk ticket inside SupportOS. Four AI agents collaborate behind the scenes:

1. **Planner Agent** — reads the ticket, infers intent and product area, decides which agents to trigger
2. **Investigator Agent** — runs diagnostic workflows, pulls evidence via the WordPress Connector, and returns a structured Investigation Report
3. **Reply Agent** — drafts a suggested reply using the ticket context and investigation findings
4. **Coach Agent** — monitors the live conversation and surfaces non-intrusive suggestions in a sidebar

The engineer reviews, edits, and sends — the AI handles the heavy lifting.

## Architecture

```
Browser (React)
  └── Ticket Workspace · Investigator Panel · Coach Sidebar
          │
    Express API Server
          │
    ┌─────┴──────────────────────┐
    │  Planner · Reply ·         │
    │  Investigator · Coach      │──── Anthropic Claude API
    └─────┬──────────────────────┘
          │
    ┌─────┴──────────────────┐
    │  Zendesk Client        │
    │  WordPress Connector   │
    └────────────────────────┘
          │
    PostgreSQL + pgvector
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React |
| Backend | Node.js / Express |
| AI | Anthropic Claude API |
| Database | PostgreSQL + pgvector |
| Integrations | Zendesk API, WordPress |
| Real-time | WebSocket |

## Getting Started

```bash
git clone https://github.com/ahmadbaig1/damha-ai.git
cd damha-ai
cp .env.example .env   # add your API keys
npm install
npm run dev
```

Required environment variables (see `.env.example`):
- `ANTHROPIC_API_KEY`
- `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN`
- `DATABASE_URL`

## Author

**Ahmad Baig** — [linkedin.com/in/ahmad-baig-4b425ba8](https://linkedin.com/in/ahmad-baig-4b425ba8) · [github.com/ahmadbaig1](https://github.com/ahmadbaig1)

## License

MIT
