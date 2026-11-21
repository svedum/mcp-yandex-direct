import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

async function connectToServer(env: Record<string, string> = {}): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", ENTRY],
    cwd: REPO_ROOT,
    stderr: "ignore",
    env: {
      PATH: process.env.PATH ?? "",
      ...env,
    },
  });
  const client = new Client({ name: "instructions-smoke", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

async function connectUnconfigured(): Promise<Client> {
  return connectToServer({});
}

test("the initialize result carries the server instructions", { timeout: 60_000 }, async () => {
  const client = await connectToServer({ YANDEX_DIRECT_TOKEN: "test-token" });
  try {
    const instructions = client.getInstructions();
    assert.ok(instructions && instructions.trim().length > 0);
    assert.match(instructions, /Яндекс Директ/);
    assert.doesNotMatch(instructions, /ВНИМАНИЕ/);
  } finally {
    await client.close();
  }
});

test("a server without a token still answers initialize, tools/list and a call", { timeout: 60_000 }, async () => {
  const client = await connectUnconfigured();
  try {
    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /не подключён/);
    assert.match(instructions, /Сведум/);
    assert.match(instructions, /YANDEX_DIRECT_TOKEN/);
    assert.match(instructions, /Яндекс Директ/);

    const tools = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(!tools.includes("start_login"));
    assert.ok(!tools.includes("finish_login"));
    assert.ok(!tools.includes("logout"));
    assert.ok(tools.includes("auth_status"));
    assert.ok(tools.includes("list_campaigns"));

    const result = await client.callTool({ name: "get_account_info", arguments: {} });
    assert.equal(result.isError, true);
    const text = (result.content as { text?: string }[]).map((c) => c.text ?? "").join(" ");
    assert.match(text, /Сведум|YANDEX_DIRECT_TOKEN/);
  } finally {
    await client.close();
  }
});

test("auth_status reports the disconnected state without touching the network", { timeout: 60_000 }, async () => {
  const client = await connectUnconfigured();
  try {
    const result = (await client.callTool({ name: "auth_status", arguments: {} })) as {
      content: Array<{ type: string; text?: string }>;
    };
    const status = JSON.parse(result.content[0]?.text ?? "{}") as {
      configured?: boolean;
      path?: string;
    };
    assert.equal(status.configured, false);
    assert.equal(status.path, "");
  } finally {
    await client.close();
  }
});