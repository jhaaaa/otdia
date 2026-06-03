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

## How the pieces fit together — MCP server approaches

Two ways to create an MCP server, and when each makes sense:

**1. Generate from a Postman collection (Postman MCP Generator)**
The intended workflow for most projects:
- Design requests in a collection — every endpoint, every permutation a developer would find useful
- Use the MCP Generator to turn those requests into MCP tools automatically
- The collection serves two audiences at once: humans who explore and test it, and AI agents who call the generated tools

```
Design requests in a collection
        │
        ├── Humans use it to explore and test the API
        └── Postman generates an MCP server from it
                │
                └── AI agents call the tools
```

Best for: well-defined REST APIs with discrete endpoints, where each request maps cleanly to a tool.

**2. Build by hand (TypeScript/Python MCP server)**
Necessary when you need composite logic that can't live in a single request — for example, `get_artworks_for_today` which searches the Met API, then loops through up to 50 results fetching details and filtering for ones with images. That's multiple HTTP calls with conditional logic — no single Postman request can express it.

Best for: custom tools that combine multiple API calls, apply filtering or transformation, or encode a specific use case rather than a raw endpoint.

**The OTDIA project illustrates both:**
- The raw Met API endpoints (search, get object, list departments) could be generated from a collection
- `get_artworks_for_today` had to be hand-crafted because it's composite logic

**The broader principle:**
For a large API, the right approach is probably both — generate the server from the collection to cover the full API surface, then extend it by hand for any composite tools that represent specific high-value use cases.

---

## First impressions and open questions from using the product

These are early observations from a single hands-on session — not conclusions. Worth raising as hypotheses in conversation with the team, who will have more context on intent and usage patterns.

- **MCP server local setup** — setting up a local stdio server felt like it required some background knowledge to get right. I wonder if the distinction between stdio and HTTP/SSE transport could be surfaced earlier — maybe with a simple decision guide for when to use which. Could be that more experienced users find this obvious, but it tripped me up initially.

- **Variable chaining in collections** — passing data between requests via collection variables felt like a powerful pattern, but I found it mostly by experimenting rather than following docs. It might be worth exploring whether this workflow deserves more prominent treatment, or whether users are finding it through other paths.

- **Model comparison workflow** — the UI makes it easy to run the same prompt against different models, which felt like a natural evaluation use case. I didn't find a guide specifically for this — curious whether that's intentional (leave it open-ended) or a gap worth filling.

- **Agent Mode prompting tips** — I found myself experimenting with how to phrase requests to get the best results from Agent Mode. I'd be curious whether usage data shows common patterns — if so, a "getting started with prompting" guide might reduce the trial-and-error period for new users.

- **Which Postman AI tool for which job?** — as a first-time user, I wasn't always sure whether to reach for Ask AI, Agent Mode, Collections, or the MCP Generator for a given task. A "which tool for which job" orientation — especially for the AI features — might help users find the right starting point faster. Worth validating whether other new users share this confusion or whether the current docs address it in ways I missed.

- **Collections vs. MCP servers for API exploration** — I noticed that Collections serve the human-driven exploration workflow well (try requests, validate responses, figure out the right params) while MCP servers serve the AI-driven workflow (an agent calls the API directly while building). I'm not sure the docs connect these two explicitly — it might be worth a diagram or guide that shows when each approach fits.

- **Ask AI vs. Agent Mode** — these felt meaningfully different in practice (Ask AI felt more conversational; Agent Mode felt more action-oriented) but I wasn't sure I fully understood the intended distinction from the docs alone. Curious whether users commonly conflate them, and whether a clearer framing upfront would help.

- **Ask AI capabilities** — I was surprised by how much Ask AI could do — it built a collection from a plain-language description of a project, which I didn't expect. I wonder if users are consistently discovering this capability or if it's underleveraged because the docs frame Ask AI more narrowly. Could be an opportunity to show more ambitious use cases.

- **Who is Postman AI for?** — I noticed that the AI features feel oriented toward consuming and building with existing APIs, while the design tools (OpenAPI specs, mock servers) serve a different workflow. I'm not sure the top-level navigation makes this distinction obvious. Could be worth a quick orientation for users who aren't sure which part of Postman applies to them — but this may already be addressed somewhere I didn't see.

- **AI credit scope** — I exhausted my Enterprise trial credits in an afternoon session, partly because I was using Ask AI for tasks beyond Postman-specific work (exploring concepts, building surrounding app code). I'm curious whether the intended use is narrower — focused on Postman-native tasks like writing scripts and building requests — and if so, whether guidance on credit-efficient usage would help users get more out of their allocation.

- **Enterprise trial credit limits** — I didn't find clear documentation on how trial credits compare to a paid Enterprise plan. As someone evaluating the product, I found it hard to know whether my experience was representative of what a paid account would feel like. A simple credit breakdown by plan — even approximate — might help prospective customers evaluate more confidently. Worth checking whether this info exists somewhere I didn't find it.

- **Postman AI alongside other coding tools** — once I moved from API exploration in Postman to building the actual web app, I naturally switched to VS Code and Claude Code. I wonder if there's an opportunity to document this handoff more explicitly — showing how Postman fits into a broader development workflow rather than positioning it as the only tool needed. This might reflect a deliberate product strategy I'm not fully aware of yet.
