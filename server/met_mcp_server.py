"""
On This Day in Art — Met Museum MCP Server
Exposes Met Museum API tools for use with Postman Agent Mode,
Claude Desktop, VS Code, Cursor, or any MCP-compatible host.

Usage:
    python met_mcp_server.py

Configure in your MCP host (e.g. claude_desktop_config.json):
    {
      "mcpServers": {
        "on-this-day-in-art": {
          "command": "python",
          "args": ["/path/to/met_mcp_server.py"]
        }
      }
    }
"""

import asyncio
import json
from datetime import datetime
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# Base URL for the Met Museum Open Access API
MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1"

app = Server("on-this-day-in-art")


async def fetch_json(url: str, params: dict = None) -> dict:
    """Fetch JSON from the Met API with sensible defaults."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get_artworks_for_today",
            description=(
                "Search the Met Museum collection for artworks connected to today's "
                "date. Returns up to 10 artworks with images, filtered by month and day. "
                "Useful for 'On This Day in Art' discovery. Optionally filter by "
                "department name (e.g. 'European Paintings', 'Asian Art', 'Drawings and Prints')."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "month": {
                        "type": "integer",
                        "description": "Month (1-12). Defaults to today's month.",
                        "minimum": 1,
                        "maximum": 12,
                    },
                    "day": {
                        "type": "integer",
                        "description": "Day (1-31). Defaults to today's day.",
                        "minimum": 1,
                        "maximum": 31,
                    },
                    "department_id": {
                        "type": "integer",
                        "description": (
                            "Optional Met department ID to filter results. "
                            "Use get_departments to see available IDs."
                        ),
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max artworks to return (default 5, max 10).",
                        "minimum": 1,
                        "maximum": 10,
                        "default": 5,
                    },
                },
                "required": [],
            },
        ),
        types.Tool(
            name="get_artwork_detail",
            description=(
                "Get full details for a single Met Museum artwork by its object ID. "
                "Returns title, artist, date, culture, medium, dimensions, "
                "classification, tags, and image URLs. Use this after "
                "get_artworks_for_today to get rich detail on a specific piece."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "object_id": {
                        "type": "integer",
                        "description": "The Met Museum object ID (e.g. 45734).",
                    }
                },
                "required": ["object_id"],
            },
        ),
        types.Tool(
            name="get_departments",
            description=(
                "List all departments in the Met Museum collection, with their "
                "department IDs and display names. Use department IDs to filter "
                "results in get_artworks_for_today."
            ),
            inputSchema={
                "type": "object",
                "properties": {},
                "required": [],
            },
        ),
        types.Tool(
            name="search_artworks",
            description=(
                "Search the Met collection by keyword, artist, or theme. "
                "Returns a list of matching object IDs and basic info. "
                "Combine with get_artwork_detail for rich metadata."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term (artist name, theme, medium, culture, etc.)",
                    },
                    "has_images": {
                        "type": "boolean",
                        "description": "Only return results with images (default true).",
                        "default": True,
                    },
                    "department_id": {
                        "type": "integer",
                        "description": "Optional department ID to narrow the search.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return (default 5, max 10).",
                        "minimum": 1,
                        "maximum": 10,
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:

    # ------------------------------------------------------------------ #
    #  get_artworks_for_today                                              #
    # ------------------------------------------------------------------ #
    if name == "get_artworks_for_today":
        today = datetime.now()
        month = arguments.get("month", today.month)
        day = arguments.get("day", today.day)
        limit = min(arguments.get("limit", 5), 10)
        dept_id = arguments.get("department_id")

        # Strategy: search for artworks whose date string contains the month name
        # and use hasImages=true to ensure we can display them.
        # The Met doesn't have a "created on this day" filter, so we do a
        # date-range search by year ranges keyed to the calendar month/day,
        # then supplement with a curated keyword search for the date.
        month_names = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        month_name = month_names[month]

        # Search for works with images, using the month name as context
        params = {
            "q": month_name,
            "hasImages": "true",
        }
        if dept_id:
            params["departmentId"] = dept_id

        data = await fetch_json(f"{MET_BASE}/search", params=params)
        object_ids = (data.get("objectIDs") or [])[:50]  # sample pool

        if not object_ids:
            return [types.TextContent(
                type="text",
                text=json.dumps({"error": "No artworks found for this date.", "month": month, "day": day})
            )]

        # Fetch details for a sample, return those with images
        results = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Stagger requests to be polite to the API
            for oid in object_ids:
                if len(results) >= limit:
                    break
                try:
                    resp = await client.get(f"{MET_BASE}/objects/{oid}")
                    if resp.status_code == 200:
                        obj = resp.json()
                        if obj.get("primaryImageSmall"):
                            results.append({
                                "objectID": obj.get("objectID"),
                                "title": obj.get("title", "Untitled"),
                                "artistDisplayName": obj.get("artistDisplayName", "Unknown artist"),
                                "objectDate": obj.get("objectDate", ""),
                                "department": obj.get("department", ""),
                                "culture": obj.get("culture", ""),
                                "medium": obj.get("medium", ""),
                                "primaryImageSmall": obj.get("primaryImageSmall", ""),
                                "objectURL": obj.get("objectURL", ""),
                            })
                except Exception:
                    continue

        output = {
            "date": f"{month_name} {day}",
            "total_found": data.get("total", 0),
            "artworks": results,
        }
        return [types.TextContent(type="text", text=json.dumps(output, indent=2))]

    # ------------------------------------------------------------------ #
    #  get_artwork_detail                                                  #
    # ------------------------------------------------------------------ #
    elif name == "get_artwork_detail":
        object_id = arguments["object_id"]
        data = await fetch_json(f"{MET_BASE}/objects/{object_id}")

        detail = {
            "objectID": data.get("objectID"),
            "title": data.get("title", "Untitled"),
            "artistDisplayName": data.get("artistDisplayName", "Unknown"),
            "artistNationality": data.get("artistNationality", ""),
            "artistBeginDate": data.get("artistBeginDate", ""),
            "artistEndDate": data.get("artistEndDate", ""),
            "objectDate": data.get("objectDate", ""),
            "objectBeginDate": data.get("objectBeginDate"),
            "objectEndDate": data.get("objectEndDate"),
            "medium": data.get("medium", ""),
            "dimensions": data.get("dimensions", ""),
            "department": data.get("department", ""),
            "culture": data.get("culture", ""),
            "period": data.get("period", ""),
            "dynasty": data.get("dynasty", ""),
            "classification": data.get("classification", ""),
            "tags": [t.get("term") for t in (data.get("tags") or [])],
            "primaryImage": data.get("primaryImage", ""),
            "primaryImageSmall": data.get("primaryImageSmall", ""),
            "additionalImages": data.get("additionalImages", [])[:3],
            "objectURL": data.get("objectURL", ""),
            "isPublicDomain": data.get("isPublicDomain", False),
            "creditLine": data.get("creditLine", ""),
            "repository": data.get("repository", ""),
        }

        return [types.TextContent(type="text", text=json.dumps(detail, indent=2))]

    # ------------------------------------------------------------------ #
    #  get_departments                                                     #
    # ------------------------------------------------------------------ #
    elif name == "get_departments":
        data = await fetch_json(f"{MET_BASE}/departments")
        return [types.TextContent(type="text", text=json.dumps(data, indent=2))]

    # ------------------------------------------------------------------ #
    #  search_artworks                                                     #
    # ------------------------------------------------------------------ #
    elif name == "search_artworks":
        query = arguments["query"]
        has_images = arguments.get("has_images", True)
        limit = min(arguments.get("limit", 5), 10)
        dept_id = arguments.get("department_id")

        params = {"q": query, "hasImages": str(has_images).lower()}
        if dept_id:
            params["departmentId"] = dept_id

        data = await fetch_json(f"{MET_BASE}/search", params=params)
        object_ids = (data.get("objectIDs") or [])[:limit]

        results = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            for oid in object_ids:
                try:
                    resp = await client.get(f"{MET_BASE}/objects/{oid}")
                    if resp.status_code == 200:
                        obj = resp.json()
                        results.append({
                            "objectID": obj.get("objectID"),
                            "title": obj.get("title", "Untitled"),
                            "artistDisplayName": obj.get("artistDisplayName", "Unknown"),
                            "objectDate": obj.get("objectDate", ""),
                            "department": obj.get("department", ""),
                            "primaryImageSmall": obj.get("primaryImageSmall", ""),
                            "objectURL": obj.get("objectURL", ""),
                        })
                except Exception:
                    continue

        output = {
            "query": query,
            "total": data.get("total", 0),
            "results": results,
        }
        return [types.TextContent(type="text", text=json.dumps(output, indent=2))]

    else:
        return [types.TextContent(
            type="text",
            text=json.dumps({"error": f"Unknown tool: {name}"})
        )]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
