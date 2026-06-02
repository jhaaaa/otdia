# On This Day in Art

A project exploring the Metropolitan Museum of Art Open Access API using
Postman's AI features — Agent Mode, AI requests, MCP servers, and collections
with automated tests.

Built as a hands-on demonstration of Postman's documentation surface.

---

## What's in this project

```
on-this-day-in-art/
├── server/
│   └── met_mcp_server.py       # MCP server wrapping the Met API
├── website/
│   └── index.html              # "On This Day in Art" single-page app
├── postman/
│   └── On-This-Day-in-Art.postman_collection.json
└── README.md
```

---

## The MCP Server

`met_mcp_server.py` exposes four tools to any MCP-compatible host
(Postman Agent Mode, Claude Desktop, VS Code, Cursor):

| Tool | What it does |
|---|---|
| `get_artworks_for_today` | Search Met collection by month/day, returns artworks with images |
| `get_artwork_detail` | Full metadata for a single artwork (title, artist, medium, tags, images) |
| `get_departments` | List all Met departments with IDs for filtering |
| `search_artworks` | Keyword search across the collection |

### Setup

```bash
pip install mcp httpx
```

### Configure in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "on-this-day-in-art": {
      "command": "python",
      "args": ["/path/to/on-this-day-in-art/server/met_mcp_server.py"]
    }
  }
}
```

### Configure in Postman Agent Mode

1. Open Postman → Agent Mode (the chat icon)
2. Click the MCP server icon → Add server
3. Since this is a stdio server, use the **local** option:
   - Command: `python`
   - Args: `/path/to/server/met_mcp_server.py`
4. Try prompts like:
   - *"What artworks in the Asian Art department are connected to June?"*
   - *"Give me the details for object 45734"*
   - *"List all the Met departments"*

---

## The Postman Collection

Import `postman/On-This-Day-in-Art.postman_collection.json` into Postman.

### Collection variables to set

| Variable | Value |
|---|---|
| `anthropic_api_key` | Your Anthropic API key (`sk-ant-...`) |
| `sample_object_id` | Auto-populated by test scripts; or set manually |

### Folders

**1. Met Museum API** — individual requests for each endpoint with tests

**2. AI Requests (Claude)** — two prompt variations on the same artwork:
- Poetic "On This Day" blurb (Sonnet)
- Museum guard's perspective (Haiku) — for model comparison

**3. Full Workflow** — three chained requests with test scripts that pass
data between steps via collection variables. Run in Collection Runner to
see the complete pipeline: search → fetch details → generate blurb.

---

## The Website

Open `website/index.html` directly in a browser (no server needed).

- Loads artworks from the Met API on the current date
- Optionally generates poetic blurbs via Anthropic API (add your key in the UI)
- Filter by department
- "Surprise Me" button for a random date

---

## Architecture overview

```
Met Museum API (public, no auth)
        │
        ▼
MCP Server (met_mcp_server.py)
        │  stdio transport
        ▼
Postman Agent Mode
        │  natural language → tool calls
        ▼
Postman Collection (manual + Collection Runner)
        │
        ├── Met API requests (GET)
        └── Anthropic AI requests (POST) → Claude generates blurbs
                │
                ▼
        Website (index.html) — same flow, runs in browser
```

---

## Notes on the Met API

- **No authentication required** — fully public, no API key needed
- **Rate limit**: ~80 requests/second
- **Open Access**: all returned artwork data is CC0 licensed
- The `/search` endpoint does keyword matching across all metadata fields
- `hasImages=true` is essential — many objects have no image
- `isPublicDomain: true` on the object response confirms image reuse rights

---

## Postman concepts demonstrated

- **Collections** with organized folders
- **Collection variables** for chaining requests
- **Test scripts** (JavaScript) with `pm.test()` and `pm.collectionVariables.set()`
- **AI requests** to the Anthropic Messages API
- **Model comparison** — same prompt, different models (Sonnet vs Haiku)
- **Collection Runner** for end-to-end workflow execution
- **MCP server integration** with Agent Mode
