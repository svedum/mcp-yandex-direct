import { test } from "node:test";
import assert from "node:assert/strict";

import { TokenStore } from "../auth.js";
import { registerAuthTools } from "./auth.js";

type Handler = () => Promise<{ content: { text: string }[]; isError?: boolean }>;

test("auth_status reports configured state without network", async () => {
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerAuthTools(server as never, {} as never, new TokenStore("env-tok"));
  const res = await tools.auth_status();
  assert.notEqual(res.isError, true);
  const status = JSON.parse(res.content[0].text) as { configured?: boolean; source?: string };
  assert.equal(status.configured, true);
  assert.equal(status.source, "env");
});