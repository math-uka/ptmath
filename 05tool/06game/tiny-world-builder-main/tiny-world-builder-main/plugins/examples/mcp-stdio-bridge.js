#!/usr/bin/env node
// Minimal MCP stdio bridge for Tiny World Builder examples.
//
// It exposes tools that:
// - send commands to plugins/examples/sse-command-relay.js
// - read events from plugins/examples/webhook-receiver.js
//
// It intentionally has no npm dependencies.

const RELAY_URL = process.env.TINYWORLD_RELAY_URL || 'http://localhost:8788/command';
const WEBHOOK_URL = process.env.TINYWORLD_WEBHOOK_URL || 'http://localhost:8787';
const TOKEN = process.env.TINYWORLD_RELAY_TOKEN || '';

const tools = [
  {
    name: 'tinyworld_place_cell',
    description: 'Place or replace one Tiny World cell through the local SSE relay.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['x', 'z'],
      properties: {
        x: { type: 'integer', minimum: 0, description: 'Home-grid x coordinate.' },
        z: { type: 'integer', minimum: 0, description: 'Home-grid z coordinate.' },
        terrain: { type: 'string', enum: ['grass', 'path', 'dirt', 'water', 'stone', 'lava', 'sand', 'snow'], default: 'grass' },
        kind: {
          type: ['string', 'null'],
          enum: [null, 'house', 'tree', 'fence', 'rock', 'bridge', 'crop', 'corn', 'wheat', 'pumpkin', 'carrot', 'sunflower', 'tuft', 'flower', 'bush', 'cow', 'sheep'],
          default: null,
        },
        floors: { type: 'integer', minimum: 1, maximum: 8, default: 1 },
        buildingType: { type: ['string', 'null'], enum: [null, 'cottage', 'manor', 'tower', 'turret', 'skyscraper'], default: null },
        fenceSide: { type: ['string', 'null'], enum: [null, 'n', 's', 'e', 'w', 'center-x', 'center-z'], default: null },
      },
    },
  },
  {
    name: 'tinyworld_clear',
    description: 'Clear the current Tiny World board to grass through the local SSE relay.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'tinyworld_reset',
    description: 'Reset Tiny World to the preset scene through the local SSE relay.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'tinyworld_webhook_events',
    description: 'Read events captured by webhook-receiver.js.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        latest: { type: 'boolean', default: false },
      },
    },
  },
];

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function result(id, value) {
  send({ jsonrpc: '2.0', id, result: value });
}

function error(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function postCommand(command) {
  const res = await fetch(RELAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(command),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  try { return JSON.parse(text); } catch (_) { return { ok: true, text }; }
}

async function getWebhookEvents(latest) {
  const url = WEBHOOK_URL.replace(/\/$/, '') + (latest ? '/latest' : '/events');
  const res = await fetch(url);
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return JSON.parse(text);
}

function textContent(value) {
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function callTool(name, args = {}) {
  if (name === 'tinyworld_place_cell') {
    return textContent(await postCommand({
      op: 'place',
      x: args.x,
      z: args.z,
      terrain: args.terrain || 'grass',
      kind: args.kind === undefined ? null : args.kind,
      floors: args.floors || 1,
      buildingType: args.buildingType || null,
      fenceSide: args.fenceSide || null,
    }));
  }
  if (name === 'tinyworld_clear') {
    return textContent(await postCommand({ op: 'clear' }));
  }
  if (name === 'tinyworld_reset') {
    return textContent(await postCommand({ op: 'reset' }));
  }
  if (name === 'tinyworld_webhook_events') {
    return textContent(await getWebhookEvents(!!args.latest));
  }
  throw new Error(`unknown tool: ${name}`);
}

async function handle(message) {
  const { id, method, params } = message;
  if (method === 'initialize') {
    result(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'tinyworld-demo', version: '0.1.0' },
    });
    return;
  }
  if (method === 'notifications/initialized') return;
  if (method === 'tools/list') {
    result(id, { tools });
    return;
  }
  if (method === 'tools/call') {
    result(id, await callTool(params.name, params.arguments || {}));
    return;
  }
  if (method === 'ping') {
    result(id, {});
    return;
  }
  error(id, -32601, `method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try { message = JSON.parse(line); } catch (err) {
      error(null, -32700, `parse error: ${err.message}`);
      continue;
    }
    handle(message).catch(err => error(message.id, -32000, err.message));
  }
});
