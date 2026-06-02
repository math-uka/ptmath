# Tiny World Integration Examples

These scripts demonstrate the browser integration points in Tiny World Builder.
They use only Node built-ins.

## Browser Setup

1. Run the app:

```bash
npm run dev
```

2. Open `http://localhost:3000/tiny-world-builder.html`.
3. Open Settings, then Developer.
4. Generate an API key if you want webhook requests to include an
   `Authorization: Bearer ...` header.

## Outbound Webhooks

Start the webhook receiver:

```bash
node plugins/examples/webhook-receiver.js
```

In the app Developer panel, set:

```text
Outbound webhook URL: http://localhost:8787/webhook
```

Now place, clear, or reset cells in the app. The receiver logs batches like:

```json
{
  "source": "tiny-world-builder",
  "events": [
    {
      "event": "cell.set",
      "payload": { "x": 2, "z": 3, "cell": { "terrain": "grass", "kind": "tree" } },
      "at": 1778700000000
    }
  ]
}
```

Useful endpoints:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/events
curl http://localhost:8787/latest
curl http://localhost:8787/clear
```

## Inbound SSE Commands

Start the relay:

```bash
node plugins/examples/sse-command-relay.js
```

In the app Developer panel, set:

```text
Inbound SSE relay URL: http://localhost:8788/sse
```

Then push commands into the relay:

```bash
node plugins/examples/send-command.js place --x 2 --z 2 --kind tree --terrain grass
node plugins/examples/send-command.js place --x 3 --z 2 --kind house --terrain grass --floors 2
node plugins/examples/send-command.js clear
node plugins/examples/send-command.js reset
```

The browser receives each command through `EventSource` and applies it locally.

Supported command shape:

```json
{ "op": "place", "x": 2, "z": 2, "terrain": "grass", "kind": "tree", "floors": 1 }
{ "op": "clear" }
{ "op": "reset" }
```

## MCP Bridge

`mcp-stdio-bridge.js` is a minimal MCP server over stdio. It exposes tools that
send commands to the SSE relay and read the webhook receiver log.

Example MCP server config:

```json
{
  "mcpServers": {
    "tinyworld-demo": {
      "command": "node",
      "args": ["/absolute/path/to/tinyworld/plugins/examples/mcp-stdio-bridge.js"],
      "env": {
        "TINYWORLD_RELAY_URL": "http://localhost:8788/command",
        "TINYWORLD_WEBHOOK_URL": "http://localhost:8787"
      }
    }
  }
}
```

Start `sse-command-relay.js` before calling mutation tools from MCP. Start
`webhook-receiver.js` if you want MCP to read outbound events.
