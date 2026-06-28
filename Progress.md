# Auxly — Build Progress

> Last updated: 2026-06-29
> Read this at the start of every session to resume without re-deriving context.
> **Project renamed from SupportOS → Auxly. Tagline: "The intelligence layer for support teams."**

---

## Current Status: MVP + Phase 2 Complete

### Done

| Area | Detail |
|---|---|
| Monorepo scaffold | `/client` (React + Vite), `/server` (Express + TypeScript), root `npm run dev` via concurrently |
| Environment | `.env` at project root, `dotenv` resolves via `path.resolve(__dirname, '../../.env')` on server |
| PostgreSQL | Installed via Homebrew (`postgresql@16`), running as a brew service on port 5432, database: `supportos` |
| DB migrations | `server/src/db/migrations/` — `001_initial_schema.sql` (conversations, investigations, coaching_sessions, reply_drafts), `002_users.sql` |
| DB client | `server/src/db/client.ts` — `pg` pool + typed `query()` helper |
| Zendesk integration | Support API (tickets) + Sunshine Conversations API (Smooch) both working. Client at `server/src/zendesk/client.ts` |
| Live chat flow | Web Widget on test site → Sunshine Conversations → ticket created → Auxly reads messages via Smooch API |
| Multi-chat workspace | Sidebar tab list of live chats, conversation thread (message bubbles), reply composer, 10s polling |
| Reply Agent | `server/src/agents/reply/` — HE personality prompt, last 6 messages, `max_tokens: 300`, `claude-sonnet-4-6`. **✦ AI Draft** button populates composer |
| Coach Agent | `server/src/agents/coach/` — watches conversation, returns `{suggestion, type}` or null. Fires on: initial load, new customer message (via poll), after engineer sends a reply. Shown as dismissible banner above composer |
| Persistence | Conversations upserted on fetch. Reply drafts logged. Coach suggestions appended to coaching_sessions |
| Auth | JWT (24h expiry), bcrypt passwords, `users` table, `requireAuth` middleware. Login page at `/login`, token in localStorage, axios interceptors attach token + redirect on 401. Sign out in header |
| Investigator Agent | `server/src/agents/investigator/` — two-step Claude flow: (1) extract context (site URL, plugins, issue type), (2) call WordPress connector, (3) analyze evidence → structured report `{summary, findings, hypothesis, confidence, recommended_steps}` |
| WordPress Connector | `server/src/connectors/wordpress/` — 7 checks: `checkFrontend`, `checkSSL`, `checkWpAdmin`, `checkSpecificPage`, `getSite`, `getPluginInfo`, `checkKnownConflicts` (10-entry conflict table). All parallel, all with timeouts + graceful fallback |
| Verify before assuming | Investigator checks live site first (checkFrontend) before forming hypothesis. If site loads fine, report leads with that fact |
| Investigation-aware drafts | Reply Agent accepts `investigationReport`. Frontend passes it from Zustand store. Prompt translates findings into customer-facing language |
| Auto-investigate | Fires automatically when customer message > 50 chars. Tracked per-ticket via `investigatedRef`, fires once. Checks on initial load too |
| Auto-greeting | Composer pre-populates with warm opener when ticket opens with no agent replies. Stored in `ticketStore.pendingDrafts`, consumed by ReplyComposer |
| Mood Agent | `POST /api/agents/mood` → `{ score: 0-100, label }`. Updates on initial load + every new customer message |
| MoodWidget | Tinted glass widget. Whole widget changes color (red→orange→indigo) based on score. No bar — just a large score number. Smooth 0.6s CSS transitions |
| Right Sidebar | 280px sidebar: MoodWidget (top) + InvestigatorPanel (below). Appears when ticket is active |
| Close Ticket | Dropdown button top-right of centre panel. Options: Close as Pending / Close as Solved. Calls `PUT /api/v2/tickets/{id}.json` via Zendesk API. Refreshes sidebar on success |
| Smart Compose | `POST /api/agents/compose` — classifies engineer input as direct message or instruction, always returns polished draft. Direct + already warm → sends immediately. Direct + broken/rude → `✦ polished` badge, shows rewrite for review. Instruction → `✦ AI draft` badge, shows drafted reply for review |
| Tone filter | All outgoing messages pass through compose layer. Rude, blunt, or grammatically broken messages are silently rewritten to be warm and professional. Engineer always reviews before sending |
| Glass UI | ElevenLabs-style white/glass aesthetic. `tokens.css` + `global.css`. Inter + JetBrains Mono fonts. Frosted glass sidebars, cards, header. Radial gradient background |
| Branding | Renamed to **Auxly**. Tagline: *The intelligence layer for support teams.* Appears on login card and app header |

---

## Credentials & Config (all in `.env`)

- **Zendesk subdomain:** `currentlyworkingformyself.zendesk.com`
- **Zendesk email:** `ahmadbaig.007@gmail.com`
- **Sunshine Conversations App ID:** `6a3fff158818b3a2aba8aaae`
- **Anthropic model:** `claude-sonnet-4-6` (never change this per CLAUDE.md)
- **DB:** `postgresql://ahmad@localhost:5432/supportos`
- **Engineer login:** `ahmadbaig.007@gmail.com` / `changeme` (change via `.env` → `npm run db:seed`)

---

## Key Technical Decisions

- **dotenv path:** Server resolves `.env` from project root via `path.resolve(__dirname, '../../.env')`
- **Sunshine Conversations:** Messages live in Smooch API, not Zendesk Support API. Smooch user ID extracted from ticket description (`Web User <id>`)
- **Coach trigger:** Fires on initial load, every new customer message detected by poll, and immediately after engineer sends a reply
- **Token efficiency:** Reply Agent — last 6 messages, max_tokens 300. Coach Agent — last 4 messages, max_tokens 120. Compose — max_tokens 500
- **Persistence strategy:** Fire-and-forget `.catch(() => {})` for DB writes — never let DB errors break the live chat flow
- **Smart Compose flow:** classify + polish in one Claude call → `{ type, draft, polished }` → client decides to send immediately or show for review
- **Mood widget:** No bar. Score number + whole widget tints (rgba background + border) from red (score 0) to indigo (score 100). `tintStrength = Math.max(0, (50 - score) / 50)`
- **Auto-investigate trigger:** `isSubstantive(text): text.trim().length > 50` — no extra Claude call for classification
- **localStorage keys:** `auxly_token`, `auxly_user`

---

## Running the App

```bash
# Start everything
npm run dev          # from project root — starts client (5173) and server (3001)

# Database
cd server
npm run db:migrate   # run pending migrations
npm run db:seed      # create engineer account (idempotent)

# PostgreSQL
brew services start postgresql@16
```

---

## File Structure (key files)

```
server/src/
  index.ts                          — Express entry, mounts routes
  middleware/auth.ts                — JWT verification
  routes/auth.ts                    — POST /api/auth/login
  routes/tickets.ts                 — GET /tickets, GET /tickets/:id/messages,
                                      POST /tickets/:id/reply, PATCH /tickets/:id/status
  routes/agents.ts                  — POST /agents/reply, /agents/mood,
                                      /agents/coach/suggestion, /agents/investigate,
                                      /agents/compose
  zendesk/client.ts                 — Zendesk Support + Smooch API + updateTicketStatus()
  agents/reply/index.ts             — generateReplyDraft(), composeMessage()
  agents/coach/index.ts             — getCoachSuggestion()
  agents/investigator/index.ts      — runInvestigation()
  agents/mood/index.ts              — assessMood()
  prompts/reply.ts                  — REPLY_SYSTEM, COMPOSE_SYSTEM, buildComposePrompt(),
                                      buildGreetingPrompt(), buildReplyUserPrompt()
  prompts/coach.ts                  — Coach system prompt
  prompts/investigator.ts           — INVESTIGATOR_CONTEXT_SYSTEM, INVESTIGATOR_ANALYSIS_SYSTEM
  prompts/mood.ts                   — MOOD_SYSTEM, buildMoodPrompt()
  db/client.ts                      — pg pool + query()
  db/conversations.ts               — upsertConversation, logReplyDraft, coaching helpers
  db/investigations.ts              — saveInvestigation()
  db/migrate.ts                     — migration runner
  db/seed.ts                        — first engineer account seeder
  connectors/base/SupportProvider.ts — shared interfaces
  connectors/wordpress/index.ts     — WordPressConnector (7 checks)

client/src/
  App.tsx                           — BrowserRouter, ProtectedRoute, glass header
  pages/Login.tsx                   — Glass card login with tagline
  pages/Workspace.tsx               — 3-column layout, polling, auto-investigate, auto-greeting
  components/ChatSidebar.tsx        — Live chat list (glass)
  components/ConversationThread.tsx — Message bubbles (white/indigo)
  components/ReplyComposer.tsx      — Smart compose: classify → polish/draft → review or send
  components/CoachPanel.tsx         — Dismissible coach banner (glass strip)
  components/RightSidebar.tsx       — 280px right panel (glass)
  components/MoodWidget.tsx         — Tinted glass mood card, score + color
  components/InvestigatorPanel.tsx  — Glass card: summary, findings, hypothesis, next steps
  components/CloseTicketButton.tsx  — Dropdown: Close as Pending / Close as Solved
  store/authStore.ts                — JWT + user (auxly_token / auxly_user)
  store/ticketStore.ts              — Tickets, conversations, pendingDrafts
  store/coachStore.ts               — Coach suggestions per ticket
  store/investigatorStore.ts        — Investigation reports per ticket
  store/moodStore.ts                — Mood scores per ticket
  api/index.ts                      — Axios instance + auth interceptors
  api/auth.ts                       — login()
  api/tickets.ts                    — fetchLiveChats, fetchMessages, sendReply,
                                      getDraftReply, closeTicket, composeMessage()
  api/investigate.ts                — requestInvestigation()
  api/mood.ts                       — fetchMood()
  styles/tokens.css                 — Design tokens (glass, shadows, radii, type, spacing)
  styles/global.css                 — Body reset, gradient bg, scrollbars, focus ring
```

---

## Out of Scope (next phase)
- Manager / team lead dashboard
- Knowledge Agent (pgvector semantic search)
- Zendesk webhooks (currently polling at 10s)
- Multi-connector support (non-WordPress)
- Billing / org-level analytics
- End-of-conversation debrief panel (Coach Agent phase 2)
- Investigation history for returning customers
