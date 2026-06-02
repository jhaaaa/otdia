# On This Day in Art — Project Notes & Next Steps

## What this project is

A hands-on exploration of the tools you'd document at Postman:
- **MCP server** wrapping the Met Museum Open Access API
- **Postman collection** with AI requests, test scripts, and chained workflow
- **Single-page website** — "On This Day in Art" — pulling Met data + Claude-generated poetic blurbs

Built the day before the Postman interview to demonstrate:
1. You use the tools you write about
2. You understand MCP servers from the inside (having built xmtp-docs-mcp previously)
3. You work fluidly with AI as a development partner (VS Code + Claude Code)

---

## What's built so far

```
on-this-day-in-art/
├── server/
│   └── met_mcp_server.py          # MCP server — needs TypeScript rewrite
├── website/
│   └── index.html                 # Complete — open in browser, works as-is
├── postman/
│   └── On-This-Day-in-Art.postman_collection.json   # Import into Postman
├── interview-prep/
│   └── INTERVIEW-PREP.md          # Full interview notes
└── README.md                      # Project overview
```

---

## Immediate next steps in VS Code + Claude Code

### 1. Rewrite MCP server in TypeScript

The current server is Python. Rewrite in TypeScript because:
- The official MCP SDK is TypeScript-first
- Postman's own MCP server (what you'd document) is Node.js/TypeScript
- Matches your existing XMTP MCP server toolchain

**Prompt to give Claude Code:**
> "Rewrite met_mcp_server.py as a TypeScript MCP server using the official @modelcontextprotocol/sdk package. Keep the same four tools: get_artworks_for_today, get_artwork_detail, get_departments, search_artworks. Use node-fetch or the built-in fetch for HTTP requests. Include a package.json with a build script."

Expected output:
```
server/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
└── build/
    └── index.js   (after npm run build)
```

### 2. Add package.json scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

### 3. Connect to Claude Desktop to test

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "on-this-day-in-art": {
      "command": "node",
      "args": ["/path/to/on-this-day-in-art/server/build/index.js"]
    }
  }
}
```

Restart Claude Desktop, then test with:
- *"What artworks are in the Met from June?"*
- *"Get me the details for object ID 45734"*
- *"List all the Met departments"*
- *"Search for artworks tagged with flowers in European Paintings"*

### 4. Connect to Postman Agent Mode

1. Open Postman → Agent Mode (chat icon, bottom left)
2. Configure MCP server → local/stdio option
3. Test the same prompts
4. Screenshot or record this — it's the demo

### 5. Import the Postman collection

1. Postman → Import → upload `On-This-Day-in-Art.postman_collection.json`
2. Set collection variable `anthropic_api_key` to your key
3. Run the **Full Workflow** folder in Collection Runner
4. Watch Steps 1→2→3 chain automatically

### 6. Open the website

Just open `website/index.html` in a browser:
- Add your Anthropic API key in the field
- Click "Discover Today's Art"
- Watch it fetch artworks and generate poetic blurbs

---

## The Met Museum API

- **Base URL:** `https://collectionapi.metmuseum.org/public/collection/v1`
- **No auth required** — fully public
- **Rate limit:** ~80 req/sec
- **License:** CC0 (open access)

### Key endpoints

| Endpoint | Description |
|---|---|
| `GET /search?q={term}&hasImages=true` | Search by keyword, returns object IDs |
| `GET /objects/{id}` | Full artwork metadata |
| `GET /departments` | All department IDs and names |
| `GET /search?q={term}&departmentId={id}` | Filter by department |

### Useful department IDs

| ID | Department |
|---|---|
| 6 | Asian Art |
| 9 | Drawings and Prints |
| 10 | Egyptian Art |
| 11 | European Paintings |
| 13 | Greek and Roman Art |
| 17 | Medieval Art |
| 19 | Photographs |
| 21 | Modern Art |

---

## MCP architecture overview

```
Met Museum API (public HTTP)
        │
        ▼
MCP Server (TypeScript, stdio transport)
  Tools:
  - get_artworks_for_today(month?, day?, department_id?, limit?)
  - get_artwork_detail(object_id)
  - get_departments()
  - search_artworks(query, has_images?, department_id?, limit?)
        │
        ├── Claude Desktop (via claude_desktop_config.json)
        ├── Postman Agent Mode (via local MCP config)
        ├── VS Code (via MCP extension)
        └── Cursor
```

---

## Postman collection structure

**Folder 1: Met Museum API**
- Search artworks by keyword (saves first ID to collection variable)
- Get artwork detail (saves title/artist/medium/etc to variables)
- List all departments
- Search by department example (Asian Art)

**Folder 2: AI Requests (Claude)**
- Generate poetic blurb — uses artwork variables from Folder 1
- Compare models — same artwork, museum guard voice (Haiku vs Sonnet)

**Folder 3: Full Workflow**
- Step 1: Search → saves object ID
- Step 2: Get detail → saves artwork fields
- Step 3: Generate blurb → uses those fields
- Run in Collection Runner for end-to-end demo

---

## What to say in the interview

*"The day before the interview I wanted to actually use the tools I'd be documenting, so I built something. I made a small MCP server wrapping the Met Museum API — four tools for searching and fetching artwork data — and connected it to Postman's Agent Mode. Then I built a Postman collection that chains the Met API requests with an AI request to Claude to generate poetic blurbs about the artworks. The website pulls it all together — 'On This Day in Art.' I built it in VS Code with Claude Code, which is my actual workflow. It gave me real opinions about what the Agent Mode docs are missing and where the MCP request setup could be clearer."*

---

## Possible documentation gaps you noticed

Use these as talking points — shows you were *actually* using the product:

- **MCP server local setup** — the stdio vs HTTP distinction isn't obvious; docs could be clearer on when to use which
- **Variable chaining in collections** — the pattern of saving values from test scripts into collection variables for downstream requests is powerful but not prominently documented
- **Model comparison workflow** — the UI supports comparing models but the docs don't have a clear "how to evaluate models" guide
- **Agent Mode prompting tips** — what kinds of natural language prompts work well? What doesn't? There's room for a guide here
- **Who is Postman AI for?** — the docs don't make it explicit at the top level that Postman AI is about *consuming and building with* existing APIs, not *designing* new ones. The design tools (OpenAPI specs, mock servers) are a separate workflow for a different audience. A landing page or overview that orients users — "are you building an API or using one?" — would reduce confusion
- **Ask AI vs. Agent Mode** — these are two different things and the docs don't clearly distinguish them. Ask AI (right sidebar) is a passive copilot — it answers questions and helps you write. Agent Mode is active — it takes actions inside Postman on your behalf. The difference matters because they have very different capabilities and expectations. A user who thinks Ask AI can "do things" will be confused; a user who doesn't know Agent Mode exists will miss the most powerful feature
- **What can Ask AI actually do?** — the boundaries of Ask AI aren't documented clearly. Can it run requests? Can it read your collection and reason about it? Can it help you build something end-to-end? Right now users have to discover this by trial and error
- **Dotfiles not visible in the Files panel** — Postman's file viewer doesn't show hidden files (anything starting with `.`), so `.gitignore`, `.env`, `.vercel` etc. are invisible. There's no toggle to show them. Users who rely on the Files panel to manage their project will be confused when these files appear to be missing. A "show hidden files" option, or at least a note in the docs that dotfiles are hidden, would prevent this
- **MCP server vs. web backend confusion** — it's not obvious to new users that an MCP server is for AI agents, not for web apps. A user building a website might reasonably wonder if they should use Postman's "Generate MCP server" feature as their backend. The docs could benefit from a clear orientation: "MCP servers are consumed by AI agents; if you're building a web app, you want a regular API or serverless function instead"
