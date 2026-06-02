# On This Day in Art — Postman AI Tutorial

A hands-on walkthrough of Postman's AI features, built around a real project:
surfacing Met Museum artworks connected to today's date, and generating poetic
descriptions using Claude.

**What you'll build:** A complete pipeline from raw API → curated request →
AI-generated blurbs → MCP server → visual Flow — using Postman's UI throughout.

**What you'll use:**
- Agent Mode
- AI Requests
- MCP Generator
- MCP Requests
- AI Request Blocks (in Flows)
- Postman Flows with MCP servers

---

## The story arc

```
Met Museum API (public, no auth)
        │
        ▼
Part 1: Fork the collection from the API Network
        │
        ▼
Part 2: Explore the API with Agent Mode
        │
        ▼
Part 3: Build a targeted "Get Artworks for Today" request
        │  (Agent Mode writes the pre-request script for you)
        ▼
Part 4: Create AI Requests — generate poetic blurbs with Claude
        │  (compare Sonnet vs Haiku)
        ▼
Part 5: Generate an MCP server from the collection
        │  (MCP Generator → download → run locally)
        ▼
Part 6: Send requests to your MCP server
        │  (MCP Request type in Postman)
        ▼
Part 7: Connect MCP server to an AI model
        │  (AI Request + MCP server = AI with Met API superpowers)
        ▼
Part 8: Build the pipeline visually with Flows
        │  (AI Request Blocks + MCP server in a Flow)
        ▼
Part 9: Promote your MCP server to the API Network
```

---

## Before you start

You'll need:
- A free Postman account (postman.com)
- An Anthropic API key (console.anthropic.com) — for the AI request steps
- Terminal access for Part 5 (just two commands to start the MCP server locally)

---

## Part 1: Fork the Met Museum collection

The Met Museum API is already on the Postman API Network — you don't need to
build the collection from scratch.

1. In Postman, click **Explore** (top nav) → search **Metropolitan Museum**
2. Find **The Metropolitan Museum of Art Collection API** in the
   **Open Access Museums** workspace
3. Click **Fork** to add it to your own workspace
4. Name your fork **On This Day in Art** and select your workspace

You now have four requests:
- `GET /search` — search by keyword
- `GET /objects/{objectID}` — get one artwork's full metadata
- `GET /departments` — list all departments
- `GET /objects` — list all object IDs

These are the raw building blocks. The next steps shape them into something specific.

---

## Part 2: Explore the API with Agent Mode

Before building anything, use Agent Mode to get familiar with what the API can do.

1. Click the **chat icon** in the bottom-left of Postman to open Agent Mode
2. Try these prompts:
   - *"What requests are in my On This Day in Art collection?"*
   - *"Send the departments request and show me the results"*
   - *"Search for artworks with the keyword 'June' that have images"*
3. Watch Agent Mode run the requests for you and explain the responses

**What's happening:** Agent Mode reads your collection, understands the requests,
and can run them on your behalf using natural language. You're not writing any
code — you're just asking questions.

**Try asking:** *"What department ID is European Paintings?"*
Agent Mode will run the departments request and pull out the answer for you.

---

## Part 3: Build a targeted request — "Get Artworks for Today"

The raw `/search` endpoint needs query parameters to be useful. Let's build a
request that automatically searches for today's month.

### 3a. Create the request

1. In your collection, click **Add request**
2. Name it `Get Artworks for Today`
3. Set the URL to `https://collectionapi.metmuseum.org/public/collection/v1/search`
4. Add these query params:
   - `q` → `{{monthName}}` (we'll set this dynamically)
   - `hasImages` → `true`

### 3b. Use Agent Mode to write the pre-request script

Instead of writing JavaScript yourself, ask Agent Mode:

> *"Write a Postman pre-request script for my 'Get Artworks for Today' request
> that sets a collection variable called monthName to the current month's full
> name — like 'June' or 'December'."*

Agent Mode will generate a script like this and can add it directly to your request:

```javascript
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const monthName = monthNames[new Date().getMonth()];
pm.collectionVariables.set("monthName", monthName);
```

**What's happening:** The pre-request script runs before the request is sent.
It calculates today's month name and stores it in a collection variable.
When the request fires, `{{monthName}}` is already set to "June" (or whatever
month it is today).

### 3c. Add a test script to capture the first result

Ask Agent Mode:

> *"Add a test script to 'Get Artworks for Today' that saves the first object ID
> from the response to a collection variable called sampleObjectId, and checks
> that the response has a 200 status."*

The script it generates will look like:

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const ids = pm.response.json().objectIDs;
if (ids && ids.length > 0) {
  pm.collectionVariables.set("sampleObjectId", ids[0]);
}
```

Send the request. You should see object IDs in the response, and `sampleObjectId`
will now be set in your collection variables — ready to use in the next request.

---

## Part 4: Create AI Requests — generate poetic blurbs with Claude

Now let's bring in an AI model to generate something creative from the artwork data.

### 4a. Get artwork details first

1. Open the `GET /objects/{objectID}` request from your collection
2. Change the URL to use your variable: `.../objects/{{sampleObjectId}}`
3. Add a test script that saves the artwork details to variables:

Ask Agent Mode:
> *"Write a test script for my objects request that saves the title,
> artistDisplayName, objectDate, and medium to collection variables."*

Send the request — your collection variables now hold real artwork data.

### 4b. Create an AI Request (Sonnet — poetic blurb)

1. Click the **+** icon → select **AI** to create a new AI request
2. Provider: **Anthropic**, Model: **claude-sonnet-4-5** (or latest Sonnet)
3. Add your Anthropic API key under Authorization
4. In the prompt field, write:

```
Write a short, poetic "On This Day in Art" blurb (3–4 sentences) about this artwork:

Title: {{title}}
Artist: {{artistDisplayName}}
Date: {{objectDate}}
Medium: {{medium}}

The tone should be evocative and invite the reader to look more closely.
```

5. Send it — Claude responds with a poetic blurb about the artwork
6. Save this request as `Generate Poetic Blurb (Sonnet)` in your collection

### 4c. Compare models — same prompt, different voice (Haiku)

1. Duplicate the AI request
2. Change the model to **claude-haiku-4-5**
3. Change the system prompt or user prompt to ask for a museum guard's perspective:

```
You are a museum guard who has stood next to this artwork for years.
Write 2–3 casual, observational sentences about what you've noticed visitors
do when they see it.

Title: {{title}}
Artist: {{artistDisplayName}}
Date: {{objectDate}}
Medium: {{medium}}
```

4. Save as `Generate Guard's Perspective (Haiku)`

**What you're demonstrating:** Model comparison — same artwork data, different
models, different voices. This is a core Postman AI use case: evaluating which
model fits a given task.

---

## Part 5: Generate an MCP server from the collection

Now let's use the MCP Generator to turn the Met collection into a server an AI
can call as tools.

1. In Postman, go to **Home** → **Public API Network** → **MCP Generator**
   (or go directly to postman.com/explore/mcp-generator)
2. Search for **Metropolitan Museum**
3. Select the **Open Access Museums** workspace
4. Check the requests you want as tools:
   - `GET /search`
   - `GET /objects/{objectID}`
   - `GET /departments`
5. Click **Generate**
6. Click **Download ZIP**
7. Unzip the file — you'll see a Node.js/TypeScript project inside

### 5a. Start the server locally

Open your terminal, navigate to the unzipped folder, and run:

```bash
npm install
npm start
```

The server is now running on your machine, listening for MCP connections.

**What just happened without writing code:** Postman generated a complete MCP
server — the same kind we built by hand in TypeScript — but automatically, from
the collection's requests.

---

## Part 6: Send requests to your MCP server

With the server running, use Postman's MCP request type to test it directly.

1. In Postman, click **+** → select **MCP** to create a new MCP request
2. Enter the server URL (the terminal output shows the port, typically
   `http://localhost:3000`)
3. Click **Connect** — Postman discovers the available tools automatically
4. You should see the tools listed:
   - `search` (from GET /search)
   - `getObject` (from GET /objects/{objectID})
   - `getDepartments` (from GET /departments)
5. Select the `search` tool, enter a query like `flowers`, click **Send**
6. The server calls the Met API and returns results

**What you're doing:** Testing the MCP server directly — verifying it works
before connecting an AI to it. This is the debugging step that Postman makes
visual. Without Postman, you'd have to write test code or use a CLI tool.

---

## Part 7: Connect your MCP server to an AI model

Now combine the MCP server with an AI request — giving Claude the ability to
call Met API tools on its own.

1. Open your AI request (or create a new one)
2. Look for the **MCP Servers** panel (usually a sidebar or tab)
3. Click **Add MCP Server** → enter your local server URL
4. In the prompt, ask:

> *"What artworks in the European Paintings department are connected to June?
> Find me something with an interesting story."*

Claude will:
- Call the `search` tool with relevant parameters
- Potentially call `getObject` to get more detail
- Synthesize an answer from the real data it retrieved

**What's happening:** The AI isn't making things up — it's calling your MCP
server, which calls the real Met API, and using actual data to answer. This is
the full MCP loop in action, entirely inside Postman.

---

## Part 8: Build the pipeline visually with Flows

Flows lets you build the search → detail → blurb pipeline without writing code —
as a visual diagram.

1. In Postman, click **Flows** in the left sidebar → **New Flow**
2. Add a **Send Request** block → select `Get Artworks for Today`
3. Connect its output to a **Select** block to extract the first object ID
4. Connect that to another **Send Request** block → `GET /objects/{objectID}`
5. Connect the object response to an **AI Request Block**:
   - Choose your Anthropic provider and Sonnet model
   - Write the poetic blurb prompt, using data from the previous block
6. Run the Flow — watch each step execute in sequence and data pass between blocks

### Optional: Build an MCP server from this Flow

1. In your Flow, click **Publish as MCP Server**
2. Postman wraps the entire Flow as a single MCP tool
3. Any AI agent can now call this tool and get a blurb about today's artworks
   in one shot — the whole pipeline hidden behind one tool call

**What this demonstrates:** Flows is Postman's answer to "I want multi-step
logic but I don't want to write code." The looping and chaining we wrote in
TypeScript can be approximated here visually. The MCP-from-Flows feature is
the bridge between visual building and the MCP ecosystem.

---

## Part 9: Promote your MCP server to the API Network

Share what you built with the Postman community.

1. In the MCP Generator or your workspace, find your generated server
2. Click **Promote** → follow the prompts to publish it to the API Network
3. Give it a name, description, and tags (try: `art`, `met-museum`, `mcp`)
4. Once published, anyone on the API Network can fork it and use it

**Why this matters:** The API Network is how Postman builds a shared ecosystem
of MCP servers. Promoting your server is the equivalent of publishing an open
source package — it makes your work reusable.

---

## What you've covered

| Postman AI feature | What you used it for |
|---|---|
| **Agent Mode** | Explored the API, wrote scripts, ran requests in natural language |
| **AI Requests** | Generated poetic blurbs, compared Sonnet vs Haiku |
| **MCP Generator** | Auto-generated an MCP server from the Met collection |
| **MCP Requests** | Tested the generated server's tools directly |
| **AI + MCP together** | Let Claude call Met API tools to answer questions with real data |
| **Flows + AI Request Blocks** | Built the search → detail → blurb pipeline visually |
| **Flows → MCP server** | Published the Flow as a callable MCP tool |
| **Promote** | Shared the server to the API Network |

---

## The bigger picture

The whole reason Postman built these AI features is exactly what you said:
so that people don't need to be developers to work with APIs and AI.

- **Agent Mode** removes the need to know request syntax
- **AI Requests** remove the need to know each provider's API format
- **MCP Generator** removes the need to write server code
- **Flows** removes the need to write pipeline logic
- **MCP Requests** remove the need to write test code

What we built by hand in TypeScript is the same thing you can build here —
but Postman abstracts away every layer that would otherwise require coding.
The hand-crafted server is still valuable when you need composite logic
(like our "loop through 50 objects and filter" tool) — but for everything
else, Postman's UI gets you there without writing a line.
