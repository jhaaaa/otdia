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
