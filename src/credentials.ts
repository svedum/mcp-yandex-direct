import { readFileSync } from "node:fs";

/** Host-injected OAuth credentials file (Svedum platform). */
export const PLUGIN_OAUTH_CREDENTIALS_ENV = "PLUGIN_OAUTH_CREDENTIALS_PATH";

/**
 * Token file written by the Svedum host after OAuth. Ask Ads fields are accepted
 * when present for compatibility with older host payloads.
 */
export interface StoredCredentials {
  access_token: string;
  /** Svedum host: epoch ms access token expiry. */
  expiry_date?: number;
  /** Legacy askads field: epoch ms expiry. */
  expires_at?: number;
  /** Legacy askads field: epoch ms obtained — informational only. */
  obtained_at?: number;
  refresh_token?: string;
}

/** Path from PLUGIN_OAUTH_CREDENTIALS_PATH, or empty when unset. */
export function credentialsPath(): string {
  return process.env[PLUGIN_OAUTH_CREDENTIALS_ENV]?.trim() ?? "";
}

/** Reads host credentials, or undefined when path is unset or the file is unusable. */
export function readCredentials(): StoredCredentials | undefined {
  const file = credentialsPath();
  if (!file) return undefined;
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as StoredCredentials;
    if (typeof parsed?.access_token !== "string" || parsed.access_token === "") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}