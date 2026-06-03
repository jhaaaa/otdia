# On This Day in Art

A single-page web app that surfaces a random artwork from the [Metropolitan Museum of Art Open Access API](https://metmuseum.github.io/) connected to today's date — with a deadpan AI commentary by **Chillomena Punk**, a confidently misinformed art critic powered by Gemini.

Live at **[onthisdayin.art](https://onthisdayin.art)**

Built with Postman Agent Mode as a real-world demonstration of how Postman fits into the full API development lifecycle — from exploration and testing to deployment.

---

## How it works

```
User visits onthisdayin.art
        │
        ▼
website/app.js — three-tier date search
  Tier 1: search Met API for "June 3"  (exact date)
  Tier 2: search Met API for "June"    (month fallback)
  Tier 3: search Met API for "*"       (full collection fallback)
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
│   ├── index.html        # Single-page app shell
│   ├── app.js            # All client-side logic: search, fetch, render
│   └── style.css         # Layout and typography
├── api/
│   └── summary.js        # Vercel serverless function — calls Gemini API
├── server/
│   └── met_mcp_server.py # MCP server exposing Met API tools to AI agents
├── postman/
│   ├── collections/
│   │   └── On This Day in Art/
│   │       ├── Get Departments.request.yaml
│   │       ├── Get Art by Department and Date.request.yaml
│   │       ├── Get Artwork Detail.request.yaml
│   │       └── Get Gemini Summary.request.yaml
│   └── environments/
│       └── On This Day in Art.environment.yaml
├── vercel.json           # Routes /api/* to serverless functions, /* to website/
└── PROJECT-NOTES.md      # Running notes on Postman features and doc gaps
```

---

## How Postman was used to build this

This project uses Postman across the full development lifecycle. Here's how each Postman feature maps to a real task — and why it was useful.

### 1. Exploring the API with requests

Before writing any code, the four requests in the collection were used to explore the Met Museum API interactively in Postman:

| Request | What it does |
|---|---|
| **Get Departments** | Fetches all Met departments with their IDs |
| **Get Art by Department and Date** | Searches for artworks matching today's date, with a three-tier fallback |
| **Get Artwork Detail** | Fetches full metadata for a single artwork by ID |
| **Get Gemini Summary** | Sends artwork metadata to Gemini and returns a Chillomena Punk commentary |

**Why this matters:** Sending requests in Postman before writing code lets you see exactly what the API returns, understand the shape of the data, and catch edge cases (like artworks with no images) before they become bugs.

### 2. Chaining requests with collection variables

The four requests are designed to run in sequence. Each request's test script stores data that the next request needs:

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

The search logic is the same in both the Postman collection and `app.js`:

1. Search for the full date: `"June 3"`
2. If no results, fall back to the month: `"June"`
3. If still no results, fall back to the full collection: `"*"`

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

`server/met_mcp_server.py` exposes the Met Museum API as tools for AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/). This lets Postman Agent Mode (or Claude Desktop, VS Code, Cursor) query the Met collection using natural language.

| Tool | What it does |
|---|---|
| `get_artworks_for_today` | Search by month/day, returns artworks with images |
| `get_artwork_detail` | Full metadata for a single artwork |
| `get_departments` | List all Met departments with IDs |
| `search_artworks` | Keyword search across the collection |

### Setup

```bash
pip install mcp httpx
python server/met_mcp_server.py
```

### Configure in Postman Agent Mode

1. Open Postman → Agent Mode (the chat icon in the sidebar)
2. Click the MCP server icon → **Add server**
3. Choose **Local (stdio)**:
   - Command: `python`
   - Args: `/path/to/otdia/server/met_mcp_server.py`
4. Try prompts like:
   - *"What artworks in the Asian Art department are connected to today?"*
   - *"Give me the details for object 45734"*
   - *"List all the Met departments"*

### Configure in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "on-this-day-in-art": {
      "command": "python",
      "args": ["/path/to/otdia/server/met_mcp_server.py"]
    }
  }
}
```

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
