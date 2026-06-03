# On This Day in Art

A single-page web app that surfaces a random artwork from the [Metropolitan Museum of Art Open Access API](https://metmuseum.github.io/) connected to today's date — with a deadpan AI commentary by **Chillomena Punk**, a confidently misinformed art critic powered by Gemini and inspired by Philomena Cunk.

Live at **[onthisdayin.art](https://onthisdayin.art)**

Built with Postman Agent Mode as a real-world demonstration of how Postman fits into the full API development lifecycle — from exploration and testing to deployment.

---

## How it works

```
User visits onthisdayin.art
        │
        ▼
website/app.js — three-tier date search
  Tier 1: "June 3"  → exact date match; if 0 results…
  Tier 2: "June"    → month-only fallback; if 0 results…
  Tier 3: "*"       → full collection (always finds something)
        │
        ▼
Met Museum Open Access API (public, no auth required)
  GET /search?q=...&hasImages=true  →  list of objectIDs
  GET /objects/{id}                 →  full artwork metadata
        │
        ▼
Vercel serverless function — api/summary.js
  POST /api/summary
  Sends artwork metadata to Gemini 2.5 Flash
  Returns ~150-word Chillomena Punk commentary
        │
        ▼
Rendered in browser as an art card (image + metadata + commentary)
```

---

## Repo structure

```
otdia/
├── website/
│   ├── index.html            # Single-page app shell
│   ├── app.js                # All client-side logic: search, fetch, render
│   ├── style.css             # Layout and typography
│   └── chillomena-punk.png   # Placeholder image (shown before artwork loads)
├── api/
│   └── summary.js        # Vercel serverless function — calls Gemini API
├── server/
│   ├── src/
│   │   └── index.ts          # MCP server source (TypeScript)
│   ├── build/
│   │   └── index.js          # Compiled output — run this (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── postman/
│   ├── collections/
│   │   └── On This Day in Art/
│   │       ├── Get Departments.request.yaml
│   │       ├── Get Art by Department and Date.request.yaml
│   │       ├── Get Artwork Detail.request.yaml
│   │       ├── Get Gemini Summary.request.yaml
│   │       └── Search Artworks.request.yaml
│   └── environments/
│       └── On This Day in Art.environment.yaml
├── vercel.json           # Routes /api/* to serverless functions, /* to website/
└── PROJECT-NOTES.md      # First impressions and open questions from using the product
```

---

## How Postman was used to build this

This project uses Postman across the full development lifecycle. Here's how each Postman feature maps to a real task — and why it was useful.

### 1. Exploring the API with requests

Before writing any code, the requests in the collection were used to explore the Met Museum API interactively in Postman:

| Request | What it does |
|---|---|
| **Get Departments** | Fetches all Met departments with their IDs |
| **Get Art by Department and Date** | Searches for artworks matching today's date, with a three-tier fallback |
| **Get Artwork Detail** | Fetches full metadata for a single artwork by ID |
| **Get Gemini Summary** | Sends artwork metadata to Gemini and returns a Chillomena Punk commentary |
| **Search Artworks** | Keyword search across the full collection by artist, theme, medium, or culture |

**Why this matters:** Sending requests in Postman before writing code lets you see exactly what the API returns, understand the shape of the data, and catch edge cases (like artworks with no images) before they become bugs.

### 2. Chaining requests with collection variables

Four of the five requests are designed to run in sequence. Each request's test script stores data that the next request needs:

```
Get Departments
  └─ test script sets: departmentId

Get Art by Department and Date
  └─ pre-request script sets: searchQuery, todayLabel, monthLabel
  └─ test script sets: randomObjectId, searchUsed

Get Artwork Detail
  └─ test script sets: artworkData (JSON string of metadata)

Get Gemini Summary
  └─ pre-request script reads: artworkData
  └─ builds and sends the Gemini prompt
```

**Search Artworks** is standalone — it takes a keyword query and returns matching object IDs, but does not depend on or feed into the date-based workflow above.

**Why this matters:** `pm.collectionVariables.set()` and `pm.collectionVariables.get()` let you pass data between requests without hardcoding IDs. This mirrors exactly how the production app works — and lets you run the full pipeline in Collection Runner with one click.

### 3. Writing tests to validate responses

Each request has an `afterResponse` test script using Postman's `pm.test()` API:

```javascript
// From Get Departments
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Pick a random department and set departmentId", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("departments");
    pm.expect(json.departments).to.be.an("array").with.length.above(0);
    // ...sets departmentId for the next request
});
```

**Why this matters:** Tests catch API contract changes early. If the Met API ever changes its response shape, the test fails immediately — before it breaks the website.

### 4. The three-tier date fallback — in Postman and in production

The Met's API searches text metadata — titles, dates, tags, descriptions — not a calendar. That means searching for `"June 3"` finds artworks whose metadata happens to contain that string. The three-tier fallback handles the reality that some dates return few or no matches:

1. **Tier 1 — exact date:** search for `"June 3"`. If results exist, done.
2. **Tier 2 — month fallback:** if Tier 1 returns 0, search for `"June"`. The UI reports both counts: *Found 0 matching "June 3". Found 347 matching "June".*
3. **Tier 3 — full collection:** if Tier 2 also returns 0, search for `"*"`. The UI reports: *Found 0 matching "June 3" or "June". Showing 1 randomly selected.*

In the Postman collection, the fallback is implemented using `pm.sendRequest()` inside the test script. In `app.js`, it's three sequential `await fetch()` calls. Building and validating the logic in Postman first made it straightforward to translate to production code.

### 5. Calling an AI API as a regular POST request

The Gemini request is just an HTTP POST — no special AI tooling needed. The `beforeRequest` script builds the prompt dynamically from the `artworkData` variable:

```javascript
// From Get Gemini Summary — beforeRequest script
const artworkData = pm.collectionVariables.get("artworkData") || "{}";

const bodyObj = {
    contents: [{ role: "user", parts: [{ text: `You are Chillomena Punk...

Artwork metadata:
${artworkData}` }] }],
    generationConfig: { temperature: 0.95, maxOutputTokens: 2000 }
};

pm.request.body.update({ mode: 'raw', raw: JSON.stringify(bodyObj) });
```

**Why this matters:** Any API — including AI APIs — can be called from a Postman request. You can iterate on your prompt, adjust temperature, and see the raw response before writing a single line of server code.

### 6. Environment for secrets

The Gemini API key is stored in the **On This Day in Art** environment as `geminiApiKey`, referenced in the request header as `{{geminiApiKey}}`. It is never hardcoded in the collection.

**Why this matters:** Environments let you keep secrets out of your collection files (which may be committed to git or shared with teammates). In production, the same key lives in Vercel's environment variables as `GEMINI_API_KEY`.

### 7. The collection as living documentation

Each request in `postman/collections/On This Day in Art/` is a `.request.yaml` file with a `description` field that documents:
- What the request does
- What variables it reads and sets
- What the response looks like
- How it connects to the next request

**Why this matters:** The collection is both executable and readable. Anyone who opens it in Postman can run the full workflow and understand how the API works — without reading the website code.

---

## The Postman collection as a roadmap for your own project

If you want to build something similar, here's the pattern:

1. **Start in Postman.** Create a collection and add a request for each API endpoint you need. Send them, read the responses, understand the data.
2. **Add test scripts.** Use `pm.test()` to assert the shape of the response. This becomes your API contract.
3. **Chain requests with variables.** Use `pm.collectionVariables.set()` to pass data between requests. Run the full chain in Collection Runner.
4. **Add AI.** If your app calls an AI API, add it as a request in the collection. Iterate on the prompt in Postman before moving it to server code.
5. **Use environments for secrets.** Store API keys in an environment, not in the collection.
6. **Translate to code.** Once the collection works end-to-end, the production code is mostly a translation — the logic is already validated.

---

## The MCP server

`server/src/index.ts` exposes the Met Museum API as tools for AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/). This lets Postman Agent Mode, Claude Code in VS Code, Claude Desktop, Cursor, or any MCP-compatible host query the Met collection using natural language.

| Tool | What it does |
|---|---|
| `get_artworks_for_today` | Search by month/day, returns artworks with images |
| `get_artwork_detail` | Full metadata for a single artwork |
| `get_departments` | List all Met departments with IDs |
| `search_artworks` | Keyword search across the collection |
| `get_gemini_summary` | Generate a Chillomena Punk commentary via Gemini (requires `GEMINI_API_KEY`) |

The `get_gemini_summary` tool requires a Gemini API key. Either export it in your shell:

```bash
export GEMINI_API_KEY=your_key_here
```

Or create a `.env` file in the `server/` directory:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com](https://aistudio.google.com). The other four tools work without it.

### A note on local vs. remote

This server uses **stdio transport** — it runs as a process on your local machine. Any MCP host on the same machine can connect to it. It is not accessible over the network by default. To make it remotely accessible (e.g., for a hosted Postman Agent Mode or a teammate), you would need to redeploy it with HTTP transport and host it somewhere publicly reachable.

### Build and run

```bash
cd server
npm install       # first time only
npm run build     # compile TypeScript → build/index.js
npm start         # start the server
```

The server starts silently and waits for connections — no output means it's working. Stop it with `Ctrl+C`.

To run without a build step during development:

```bash
npm run dev       # runs src/index.ts directly via tsx
```

### Connect to Claude Code in VS Code

Run this once in your terminal from anywhere in the project:

```bash
claude mcp add on-this-day-in-art node /path/to/otdia/server/build/index.js
```

Then restart your Claude Code session. With the server running, Claude Code can call the Met API tools directly — ask it things like:
- *"What artworks are in the Met collection for today's date?"*
- *"Search for artworks tagged with flowers in European Paintings"*
- *"List all the Met departments"*

### Connect to Postman Agent Mode

1. Start the server locally (`npm start` in the `server/` directory)
2. Open Postman → Agent Mode (chat icon, bottom-left)
3. Click the MCP server icon → **Add server** → **Local (stdio)**
4. Set:
   - **Command:** `node`
   - **Args:** `/path/to/otdia/server/build/index.js`
5. Try prompts like:
   - *"What artworks in the Asian Art department are connected to today?"*
   - *"Give me the details for object 45734"*
   - *"Search for Japanese woodblock prints"*

> **Note:** Postman Agent Mode connects to your locally running server. If you're using Postman's cloud-based Agent Mode, the server still needs to be running on your local machine and reachable via the Postman desktop app.

### Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "on-this-day-in-art": {
      "command": "node",
      "args": ["/path/to/otdia/server/build/index.js"]
    }
  }
}
```

Restart Claude Desktop after saving. The server starts automatically when Claude Desktop launches.

---

## Deployment

The site is deployed on [Vercel](https://vercel.com). `vercel.json` routes `/api/*` to the serverless functions in `api/` and everything else to `website/`.

The Gemini API key is set as a Vercel environment variable (`GEMINI_API_KEY`) — never committed to the repo.

---

## Notes on the Met API

- **No authentication required** — fully public, no API key needed
- **Rate limit**: ~80 requests/second
- **Open Access**: all returned artwork data is CC0 licensed
- `hasImages=true` is essential — many objects have no image
- `isPublicDomain: true` on the object response confirms image reuse rights
- The `/search` endpoint does keyword matching across all metadata fields

---

## Credits

- Artwork data: [The Metropolitan Museum of Art Open Access API](https://metmuseum.github.io/)
- AI commentary: [Google Gemini](https://deepmind.google/technologies/gemini/) — in a voice inspired by Philomena Cunk
- Built with [Postman Agent Mode](https://www.postman.com/product/postman-agent/)
