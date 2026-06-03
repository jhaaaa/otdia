import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function fetchJson(url: string, params?: Record<string, string>): Promise<unknown> {
  const fullUrl = params
    ? `${url}?${new URLSearchParams(params)}`
    : url;
  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Met API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

const server = new Server(
  { name: "on-this-day-in-art", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_artworks_for_today",
      description:
        "Search the Met Museum collection for artworks connected to today's date. " +
        "Returns up to 10 artworks with images, filtered by month and day. " +
        "Useful for 'On This Day in Art' discovery. Optionally filter by department ID " +
        "(use get_departments to find IDs).",
      inputSchema: {
        type: "object",
        properties: {
          month: {
            type: "number",
            description: "Month (1–12). Defaults to today's month.",
            minimum: 1,
            maximum: 12,
          },
          day: {
            type: "number",
            description: "Day (1–31). Defaults to today's day.",
            minimum: 1,
            maximum: 31,
          },
          department_id: {
            type: "number",
            description: "Optional Met department ID to filter results.",
          },
          limit: {
            type: "number",
            description: "Max artworks to return (default 5, max 10).",
            minimum: 1,
            maximum: 10,
            default: 5,
          },
        },
        required: [],
      },
    },
    {
      name: "get_artwork_detail",
      description:
        "Get full details for a single Met Museum artwork by its object ID. " +
        "Returns title, artist, date, culture, medium, dimensions, classification, " +
        "tags, and image URLs.",
      inputSchema: {
        type: "object",
        properties: {
          object_id: {
            type: "number",
            description: "The Met Museum object ID (e.g. 45734).",
          },
        },
        required: ["object_id"],
      },
    },
    {
      name: "get_departments",
      description:
        "List all departments in the Met Museum collection with their IDs and names. " +
        "Use department IDs to filter results in get_artworks_for_today or search_artworks.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_gemini_summary",
      description:
        "Generate a Chillomena Punk-style commentary on a Met Museum artwork using the Gemini API. " +
        "Requires GEMINI_API_KEY to be set as an environment variable. " +
        "Pass artwork metadata from get_artwork_detail as the artwork_data argument.",
      inputSchema: {
        type: "object",
        properties: {
          artwork_data: {
            type: "string",
            description: "JSON string of artwork metadata (title, artist, date, medium, etc.).",
          },
          today_label: {
            type: "string",
            description: "Human-readable date label shown in the prompt, e.g. 'June 3'. Optional.",
          },
        },
        required: ["artwork_data"],
      },
    },
    {
      name: "search_artworks",
      description:
        "Search the Met collection by keyword, artist, or theme. " +
        "Returns a list of matching artworks with basic info. " +
        "Combine with get_artwork_detail for full metadata.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term (artist name, theme, medium, culture, etc.)",
          },
          has_images: {
            type: "boolean",
            description: "Only return results with images (default true).",
            default: true,
          },
          department_id: {
            type: "number",
            description: "Optional department ID to narrow the search.",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 5, max 10).",
            minimum: 1,
            maximum: 10,
            default: 5,
          },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "get_artworks_for_today") {
    const now = new Date();
    const month = (args.month as number) ?? now.getMonth() + 1;
    const day = (args.day as number) ?? now.getDate();
    const limit = Math.min((args.limit as number) ?? 5, 10);
    const deptId = args.department_id as number | undefined;

    const monthName = MONTH_NAMES[month];
    const params: Record<string, string> = {
      q: monthName,
      hasImages: "true",
    };
    if (deptId !== undefined) params.departmentId = String(deptId);

    const searchData = (await fetchJson(`${MET_BASE}/search`, params)) as {
      total: number;
      objectIDs: number[] | null;
    };

    const objectIds = (searchData.objectIDs ?? []).slice(0, 50);

    if (objectIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "No artworks found for this date.", month, day }),
          },
        ],
      };
    }

    const results: object[] = [];

    for (const oid of objectIds) {
      if (results.length >= limit) break;
      try {
        const obj = (await fetchJson(`${MET_BASE}/objects/${oid}`)) as Record<string, unknown>;
        if (obj.primaryImageSmall) {
          results.push({
            objectID: obj.objectID,
            title: obj.title ?? "Untitled",
            artistDisplayName: obj.artistDisplayName ?? "Unknown artist",
            objectDate: obj.objectDate ?? "",
            department: obj.department ?? "",
            culture: obj.culture ?? "",
            medium: obj.medium ?? "",
            primaryImageSmall: obj.primaryImageSmall,
            objectURL: obj.objectURL ?? "",
          });
        }
      } catch {
        continue;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { date: `${monthName} ${day}`, total_found: searchData.total, artworks: results },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_artwork_detail") {
    const objectId = args.object_id as number;
    const data = (await fetchJson(`${MET_BASE}/objects/${objectId}`)) as Record<string, unknown>;

    const tags = (data.tags as Array<{ term: string }> | null) ?? [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              objectID: data.objectID,
              title: data.title ?? "Untitled",
              artistDisplayName: data.artistDisplayName ?? "Unknown",
              artistNationality: data.artistNationality ?? "",
              artistBeginDate: data.artistBeginDate ?? "",
              artistEndDate: data.artistEndDate ?? "",
              objectDate: data.objectDate ?? "",
              objectBeginDate: data.objectBeginDate,
              objectEndDate: data.objectEndDate,
              medium: data.medium ?? "",
              dimensions: data.dimensions ?? "",
              department: data.department ?? "",
              culture: data.culture ?? "",
              period: data.period ?? "",
              dynasty: data.dynasty ?? "",
              classification: data.classification ?? "",
              tags: tags.map((t) => t.term),
              primaryImage: data.primaryImage ?? "",
              primaryImageSmall: data.primaryImageSmall ?? "",
              additionalImages: (data.additionalImages as string[])?.slice(0, 3) ?? [],
              objectURL: data.objectURL ?? "",
              isPublicDomain: data.isPublicDomain ?? false,
              creditLine: data.creditLine ?? "",
              repository: data.repository ?? "",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_departments") {
    const data = await fetchJson(`${MET_BASE}/departments`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  if (name === "get_gemini_summary") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "GEMINI_API_KEY environment variable is not set." }),
          },
        ],
      };
    }

    const artworkData = args.artwork_data as string;
    const todayLabel = (args.today_label as string) ?? "";

    const prompt =
      `You are Chillomena Punk — a deadpan, confidently misinformed art commentator — inspired by Philomena Cunk. ` +
      `You speak with total authority about things you clearly don't understand, ask rhetorical questions that make no sense, ` +
      `go on brief tangents that are historically wrong in a funny way, and yet somehow stumble onto something genuinely true and interesting about the subject. ` +
      `Your tone is dry, absurd, and very funny — but the real facts about the artwork must still come through.\n\n` +
      `Based on the following artwork metadata from The Metropolitan Museum of Art, write a Chillomena Punk-style commentary on this piece. ` +
      `It should be funny, punchy, and exactly around 150 words. No more than 150 words.\n\n` +
      `Make sure the commentary conveys: what the artwork looks like and what's happening in it, something about the artist or the era, and why it matters — all filtered through Chillomena's unique lens.\n` +
      `Keep all content family-friendly and avoid anything harmful, offensive, or inappropriate — Chillomena is baffled by art, not by decency.\n\n` +
      (todayLabel ? `Today's date: ${todayLabel}\n\n` : "") +
      `Artwork metadata:\n${artworkData}`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.95, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Gemini API error: ${geminiRes.status}`, detail: errText }),
          },
        ],
      };
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      content: [
        {
          type: "text",
          text: summary ?? JSON.stringify({ error: "No summary returned from Gemini." }),
        },
      ],
    };
  }

  if (name === "search_artworks") {
    const query = args.query as string;
    const hasImages = (args.has_images as boolean) ?? true;
    const limit = Math.min((args.limit as number) ?? 5, 10);
    const deptId = args.department_id as number | undefined;

    const params: Record<string, string> = {
      q: query,
      hasImages: String(hasImages),
    };
    if (deptId !== undefined) params.departmentId = String(deptId);

    const searchData = (await fetchJson(`${MET_BASE}/search`, params)) as {
      total: number;
      objectIDs: number[] | null;
    };

    const objectIds = (searchData.objectIDs ?? []).slice(0, limit);
    const results: object[] = [];

    for (const oid of objectIds) {
      try {
        const obj = (await fetchJson(`${MET_BASE}/objects/${oid}`)) as Record<string, unknown>;
        results.push({
          objectID: obj.objectID,
          title: obj.title ?? "Untitled",
          artistDisplayName: obj.artistDisplayName ?? "Unknown",
          objectDate: obj.objectDate ?? "",
          department: obj.department ?? "",
          primaryImageSmall: obj.primaryImageSmall ?? "",
          objectURL: obj.objectURL ?? "",
        });
      } catch {
        continue;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { query, total: searchData.total, results },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
