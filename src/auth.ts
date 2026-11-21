import { credentialsPath, readCredentials, type StoredCredentials } from "./credentials.js";

/**
 * Raised when a tool needs a token and none is available. The message is what the
 * calling model relays to the user — it must name Svedum OAuth and YANDEX_DIRECT_TOKEN.
 */
export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/** Treat the token as expired this long before the stated expiry. */
const EXPIRY_LEEWAY_MS = 60_000;

export type TokenSource = "env" | "stored";

export interface AuthStatus {
  configured: boolean;
  source?: TokenSource;
  /** ISO date the stored access token expires; absent when unknown or env token. */
  expiresAt?: string;
  /** ISO date the stored token was obtained (legacy field). */
  obtainedAt?: string;
  canRefresh: boolean;
  path: string;
}

export const RELOGIN_MESSAGE =
  "Сохранённый токен Яндекс Директа больше не действует: истёк срок или доступ отозван. " +
  "Обновление делает платформа Сведума — подключите аккаунт заново в Сведуме " +
  "(Персонализация → Подключения) или задайте YANDEX_DIRECT_TOKEN и перезапустите MCP.";

export const NOT_CONNECTED_MESSAGE =
  "Яндекс Директ не подключён: нет токена доступа. " +
  "Это не сбой сети — повторный вызов не поможет, нужно подключение. " +
  "Войдите через «Настроить» в Сведуме (Персонализация → Подключения) или задайте " +
  "переменную окружения YANDEX_DIRECT_TOKEN в конфигурации MCP и перезапустите сервер.";

/**
 * Resolves the access token for every request. Order: YANDEX_DIRECT_TOKEN (constructor/env),
 * then PLUGIN_OAUTH_CREDENTIALS_PATH. The file is re-read each time so a host refresh
 * takes effect without restarting the process.
 */
export class TokenStore {
  constructor(private readonly envToken?: string) {}

  hasToken(): boolean {
    if (this.envToken) return true;
    return Boolean(readCredentials());
  }

  async getToken(): Promise<string> {
    if (this.envToken) return this.envToken;

    const stored = readCredentials();
    if (!stored) throw new AuthRequiredError(NOT_CONNECTED_MESSAGE);

    if (isExpired(stored)) throw new AuthRequiredError(RELOGIN_MESSAGE);

    return stored.access_token;
  }

  canRefresh(): boolean {
    return false;
  }

  usesStoredToken(): boolean {
    return !this.envToken && Boolean(readCredentials());
  }

  /** Token refresh is owned by the Svedum platform — never performed here. */
  async refresh(): Promise<StoredCredentials> {
    throw new AuthRequiredError(RELOGIN_MESSAGE);
  }

  /** No-op: the host writes credentials; this package never persists tokens. */
  save(_response?: unknown): StoredCredentials {
    const stored = readCredentials();
    if (!stored) throw new AuthRequiredError(NOT_CONNECTED_MESSAGE);
    return stored;
  }

  /** No-op: disconnect via Svedum or remove YANDEX_DIRECT_TOKEN from MCP config. */
  logout(): boolean {
    return false;
  }

  status(): AuthStatus {
    const path = credentialsPath();
    if (this.envToken) {
      return { configured: true, source: "env", canRefresh: false, path };
    }
    const stored = readCredentials();
    if (!stored) return { configured: false, canRefresh: false, path };
    const expiry = stored.expiry_date ?? stored.expires_at;
    return {
      configured: true,
      source: "stored",
      expiresAt: expiry !== undefined ? new Date(expiry).toISOString() : undefined,
      obtainedAt:
        stored.obtained_at !== undefined ? new Date(stored.obtained_at).toISOString() : undefined,
      canRefresh: false,
      path,
    };
  }
}

function isExpired(stored: StoredCredentials, now = Date.now()): boolean {
  const expiry = stored.expiry_date ?? stored.expires_at;
  if (expiry === undefined) return false;
  return expiry - EXPIRY_LEEWAY_MS <= now;
}