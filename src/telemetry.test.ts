import { test } from "node:test";
import assert from "node:assert/strict";

import { Telemetry, telemetryEnabled, instrumentToolCalls, noteFailure, toolOutcome } from "./telemetry.js";

test("telemetry is disabled in the Svedum fork", () => {
  assert.equal(telemetryEnabled({}), false);
  const sent: unknown[] = [];
  const t = new Telemetry("0.1.0", false, (async () => {
    sent.push(1);
    return new Response();
  }) as typeof fetch);
  t.send("server_start");
  assert.equal(sent.length, 0);
  assert.equal(t.isEnabled(), false);
});

test("instrumentToolCalls is a no-op", () => {
  const server = { registerTool: () => {} };
  assert.doesNotThrow(() => instrumentToolCalls(server as never, new Telemetry("0.1.0")));
});

test("toolOutcome and noteFailure stay usable", () => {
  assert.equal(toolOutcome({ isError: false }), "ok");
  assert.equal(toolOutcome({ isError: true }), "error_other");
  const r = noteFailure({ ok: true }, new Error("x"));
  assert.deepEqual(r, { ok: true });
});