# Interview Prep: Senior Technical Writer @ Postman
**Date:** June 2, 2026
**Interviewer:** Jonathan Konrath, Head of Technical Writing
**Role:** Senior Technical Writer — AI/Agent Mode feature set

---

## The Role

**Job URL:** https://job-boards.greenhouse.io/postman/jobs/7735012003
**Salary range:** $160,000–$190,000 + equity
**Location:** San Francisco (5 days/week in office)

### Feature areas you'd own
- **Agent Mode** — AI-native chat interface; natural language → API actions
- **AI requests** — testing/evaluating AI models (OpenAI, Anthropic, Google) in Postman
- **MCP server documentation** — Postman's own MCP server + creating/testing MCP requests
- **Testing automation** — multi-protocol support (HTTP, GraphQL, gRPC, MCP) in Collection Runner and CI via Postman CLI
- **Collaboration and sharing features**
- **Confluence** — process documentation updates (likely internal team docs)

### What Postman is right now
Postman recently relaunched as "AI-native" with:
- **Agent Mode** — turn words into API actions across the lifecycle
- **MCP request type** — create, test, and evaluate MCP servers inside Postman
- **Postman MCP server** — lets AI agents (Claude, Cursor, VS Code) manage your Postman workspaces/collections via natural language
- **Multi-protocol collections** — HTTP, GraphQL, gRPC, MCP, WebSockets, MQTT in one place
- **Git-native workspaces**

---

## About Jonathan Konrath

**LinkedIn:** https://www.linkedin.com/in/jkonrath/
**Personal site:** https://jonkonrath.com
**GitHub (personal):** https://github.com/jkonrath
**Title:** Head of Technical Writing at Postman

### Background
- Started in tech writing from phone support at Indiana University in the early 90s
- CS background (Unix, C, Scheme) — genuinely technical, not just a writer
- Before Postman: Manager of Technical Communications + Technical Communications Architect at TIBCO Software (cloud orchestration, DITA, MadCap Flare migrations)
- Also: Samsung (Manager, Content), Vendavo (Senior TW, developer docs for J2EE pricing suite)
- Completed an IT Management MBA at Western Governors University
- Has written API docs, edited code, worked directly on development teams

### What he values (from reviews and his own writing)
- Professional development — organized Git training, tool workshops for his team
- Technical depth — "never afraid to ask questions, even in overlooked edge cases"
- Accuracy and conciseness
- Self-directed learners who pick up tools without hand-holding
- People who work on documentation bugs in open source projects to build skills

### How to connect with him
- He's a builder/tinkerer who codes his own tooling
- He'll respond to your blend of technical depth + community work
- Your MCP server project (xmtp-docs-mcp) is directly relevant — you've built the thing he'd be asking you to document
- Don't pretend you didn't use AI to build things — he'll know, and it's how the industry works

---

## Interview Focus

The interview will dig into:
1. **Your background and experience process**
2. **AI usage — how you use it, what your workflow looks like**

### Key talking points

**Hands-on AI as a practitioner**
- Built xmtp-docs-mcp MCP server using Claude Code in VS Code
- Building a creative text generation app (word string → story)
- Explored CMB-as-generative-persona prompt work (temperature variance data as "root words")
- Evaluated Gemini 2.0 Flash vs. OpenRouter for app API use
- Built "On This Day in Art" demo project day-before-interview (see project notes)

**Understanding of MCP as a protocol**
- You've built an MCP server — you can explain what it is, why it matters, the developer experience
- MCP servers expose *tools* (callable functions), *resources* (data), and *prompts* (templates)
- stdio transport vs. HTTP/SSE transport — your XMTP server is stdio; Postman expects HTTP for remote
- This is directly relevant to what you'd document

**Documenting AI features**
- Challenge: AI outputs are non-deterministic — how do you document something where results vary?
- How do you write docs for features that are still evolving rapidly?
- Your approach to learning by doing (building the demo) is the answer in action

**Your workflow**
- VS Code + Claude Code is your primary development toolchain
- You're transparent about using AI to build faster — that's the honest answer and the right one
- "I built this using VS Code and Claude Code, because that's how I actually work" — own it

### Likely questions

| Question | Notes |
|---|---|
| "Walk me through your experience with AI tools." | Show range — MCP server, app development, prompt experimentation, not just chat |
| "How do you document a feature you're still learning?" | Learning by doing — you built a demo the day before |
| "Tell me about a time you worked with engineers to understand a feature." | Collaboration + technical empathy |
| "How do you handle shifting priorities?" | The JD specifically calls this out |
| "What's your experience with docs-as-code?" | Git, Markdown, source control — you have this |
| "Have you used Postman?" | Yes — built a collection, used AI requests, explored Agent Mode |
| "Tell me about a technical project you're proud of." | xmtp-docs-mcp server; the "On This Day in Art" demo |

---

## Your Relevant Background to Highlight

- **20+ years in software industry** — you understand developer workflows from the inside
- **xmtp-docs-mcp** — built an MCP server that makes XMTP documentation queryable by AI agents; hosted at github.com/xmtp/xmtp-docs-mcp; built with Claude Code in VS Code
- **Creative text generation app** — taking a string of words, generating a story; explored Gemini 2.0 Flash and OpenRouter as API backends
- **Poet with two collections** — brings unusual clarity and precision to language; user empathy is built in
- **Kau Kau Chronicles** — community archiving project; shows you understand non-technical users too
- **Marigold Project** — board member; community-facing work
- **Zentoku Foundation** — editorial and web work

### The unique angle
You sit at the intersection of deep technical practice (MCP servers, APIs, AI tooling) and language precision (published poet, award-winning collection). That's rare for a technical writer and worth naming explicitly.

---

## What Postman Is Looking For (from JD)

- **Problem solver** — broad view of docs' role in the organization, comfortable with shifting priorities
- **User empathy** — tech support, community, customer-facing experience, or user feedback on docs
- **Strong communicator** — written technical material before
- **Self-directed learner** — picks up tech skills with minimum support
- **Experience with SaaS products**
- **Distributed team member** — global team, multiple time zones
- Nice to have: docs-as-code, Markdown, Agile, Git

---

## Logistics

- In-office 5 days/week at SF hub
- Comprehensive benefits, flexible PTO, wellness reimbursement, monthly lunch stipend
- Equity package included
