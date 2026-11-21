/**
 * Telemetry is disabled in the Svedum fork (no network). Call sites and wrappers are
 * kept so upstream tool code and util.ts stay unchanged.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function telemetryEnabled(_env: NodeJS.ProcessEnv = process.env): boolean {
  return false;
}

export interface ClientInfo {
  name?: string;
  version?: string;
}

export type TelemetryEvent = "server_start" | "tool_call" | "startup_failed" | "unconfigured_start";

export interface EventFields {
  tool?: string;
  reason?: string;
  error_detail?: string;
}

export class Telemetry {
  constructor(
    _appVersion: string,
    _enabled = false,
    _fetchImpl: typeof fetch = fetch,
  ) {}

  setClientInfo(_info: ClientInfo | undefined): void {}

  isEnabled(): boolean {
    return false;
  }

  send(_event: TelemetryEvent, _fields: EventFields = {}): void {}

  async sendBlocking(_event: TelemetryEvent, _fields: EventFields = {}): Promise<void> {}

  private async post(_event: TelemetryEvent, _fields: EventFields): Promise<void> {}
}

export const TOOL_OUTCOMES = [
  "ok",
  "error_auth",
  "error_permission",
  "error_not_found",
  "error_rate_limit",
  "error_invalid_request",
  "error_upstream",
  "error_timeout",
  "error_network",
  "error_internal",
  "error_other",
] as const;
export type ToolOutcome = (typeof TOOL_OUTCOMES)[number];

export const DETAIL_MAX = 200;

export function toolOutcome(result: unknown, ...thrown: [unknown?]): ToolOutcome {
  const didThrow = thrown.length > 0;
  if (!didThrow && !(result as { isError?: unknown } | null)?.isError) return "ok";
  return didThrow ? "error_internal" : "error_other";
}

export function errorDetail(_text: string): string {
  return "";
}

export function noteFailure<T>(result: T, _err: unknown): T {
  return result;
}

export function carryFailure<T>(_from: unknown, to: T): T {
  return to;
}

/** Pass-through: no tool-call instrumentation in the Svedum fork. */
export function instrumentToolCalls(_server: McpServer, _telemetry: Telemetry): void {}