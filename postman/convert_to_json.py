#!/usr/bin/env python3
"""Convert Postman Git Sync YAML files to importable Collection v2.1 JSON."""

import json
import re
import uuid
import yaml
from pathlib import Path

COLLECTION_DIR = Path(__file__).parent / "collections" / "On This Day in Art"
ENVIRONMENT_FILE = Path(__file__).parent / "environments" / "On This Day in Art.environment.yaml"
OUTPUT_FILE = Path(__file__).parent / "On This Day in Art.postman_collection.json"


def parse_url(raw_url, query_params=None):
    url_obj = {"raw": raw_url}
    match = re.match(r"(https?)://([^/]+)(.*)", raw_url)
    if match:
        url_obj["protocol"] = match.group(1)
        url_obj["host"] = match.group(2).split(".")
        path = match.group(3)
        if "{{" in path:
            url_obj["path"] = [path.lstrip("/")]
        else:
            url_obj["path"] = [p for p in path.split("/") if p]
    if query_params:
        url_obj["query"] = [{"key": k, "value": v} for k, v in query_params.items()]
        raw_qs = "&".join(f"{k}={v}" for k, v in query_params.items())
        url_obj["raw"] = raw_url + "?" + raw_qs
    return url_obj


def parse_scripts(scripts):
    events = []
    listen_map = {"beforeRequest": "prerequest", "afterResponse": "test"}
    for script in scripts or []:
        listen = listen_map.get(script.get("type", ""), script.get("type", ""))
        code = script.get("code", "")
        events.append({
            "listen": listen,
            "script": {
                "exec": code.splitlines(),
                "type": "text/javascript"
            }
        })
    return events


def parse_headers(headers):
    if not headers:
        return []
    return [{"key": k, "value": v} for k, v in headers.items()]


def parse_body(body):
    if not body:
        return None
    body_type = body.get("type", "")
    content = body.get("content", "")
    if body_type == "json":
        return {"mode": "raw", "raw": content, "options": {"raw": {"language": "json"}}}
    if body_type == "text" and content:
        return {"mode": "raw", "raw": content}
    return None


def load_request(path):
    text = path.read_text()
    # Strip the $kind line since it's not valid YAML key syntax without quoting
    text = re.sub(r"^\$kind:.*\n", "", text, flags=re.MULTILINE)
    return yaml.safe_load(text)


def build_collection():
    request_files = sorted(COLLECTION_DIR.glob("*.request.yaml"))
    items = []
    for f in request_files:
        data = load_request(f)
        name = f.name.replace(".request.yaml", "")
        item = {
            "name": name,
            "event": parse_scripts(data.get("scripts")),
            "request": {
                "method": data.get("method", "GET"),
                "header": parse_headers(data.get("headers")),
                "url": parse_url(data.get("url", ""), data.get("queryParams")),
                "description": data.get("description", ""),
            },
            "response": []
        }
        body = parse_body(data.get("body"))
        if body:
            item["request"]["body"] = body
        items.append((data.get("order", 9999), item))

    items.sort(key=lambda x: x[0])

    variables = []
    if ENVIRONMENT_FILE.exists():
        env_data = yaml.safe_load(ENVIRONMENT_FILE.read_text())
        for v in env_data.get("values", []):
            variables.append({
                "key": v["key"],
                "value": v.get("value", ""),
                "type": "secret" if "key" in v["key"].lower() or "token" in v["key"].lower() else "string"
            })

    collection = {
        "info": {
            "_postman_id": str(uuid.uuid4()),
            "name": "On This Day in Art",
            "description": "5 requests for exploring The Met Museum collection and generating AI-powered artwork summaries.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [item for _, item in items],
        "variable": variables
    }

    OUTPUT_FILE.write_text(json.dumps(collection, indent=2))
    print(f"Written: {OUTPUT_FILE}")
    print(f"Requests: {len(items)}")


if __name__ == "__main__":
    build_collection()
