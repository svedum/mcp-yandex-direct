import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AuthRequiredError, NOT_CONNECTED_MESSAGE, RELOGIN_MESSAGE, TokenStore } from "./auth.js";
import { credentialsPath, readCredentials, PLUGIN_OAUTH_CREDENTIALS_ENV } from "./credentials.js";

async function withCredentialsFile<T>(
  body: Record<string, unknown>,
  run: (file: string) => T | Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "mcp-direct-creds-"));
  const file = join(dir, "credentials.json");
  writeFileSync(file, JSON.stringify(body));
  const saved = process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = file;
  try {
    return await run(file);
  } finally {
    if (saved === undefined) delete process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
    else process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = saved;
  }
}

test("with nothing configured, getToken explains how to connect", async () => {
  const saved = process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  delete process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  try {
    const store = new TokenStore(undefined);
    assert.equal(store.hasToken(), false);
    assert.equal(credentialsPath(), "");
    await assert.rejects(() => store.getToken(), (err: Error) => {
      assert.equal(err.message, NOT_CONNECTED_MESSAGE);
      assert.match(err.message, /Сведум/);
      assert.match(err.message, /YANDEX_DIRECT_TOKEN/);
      return err instanceof AuthRequiredError;
    });
  } finally {
    if (saved !== undefined) process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = saved;
  }
});

test("an env token wins and is never refreshed", async () => {
  await withCredentialsFile({ access_token: "stored" }, async () => {
    const store = new TokenStore("from-env");
    assert.equal(await store.getToken(), "from-env");
    assert.equal(store.canRefresh(), false);
    assert.equal(store.status().source, "env");
  });
});

test("credentials file is read when PLUGIN_OAUTH_CREDENTIALS_PATH is set", async () => {
  await withCredentialsFile({ access_token: "stored", expiry_date: Date.now() + 3600_000 }, async (file) => {
    const store = new TokenStore(undefined);
    assert.equal(credentialsPath(), file);
    assert.equal(await store.getToken(), "stored");
    assert.equal(store.status().source, "stored");
    assert.equal(readCredentials()?.access_token, "stored");
  });
});

test("expiry_date and expires_at are both honored", async () => {
  await withCredentialsFile({ access_token: "x", expires_at: Date.now() + 3600_000 }, async () => {
    assert.equal(await new TokenStore(undefined).getToken(), "x");
  });
  await withCredentialsFile({ access_token: "y", expiry_date: Date.now() - 1000 }, async () => {
    await assert.rejects(() => new TokenStore(undefined).getToken(), (err: Error) => {
      assert.equal(err.message, RELOGIN_MESSAGE);
      return true;
    });
  });
});

test("canRefresh is always false and logout is a no-op", async () => {
  await withCredentialsFile({ access_token: "a" }, () => {
    const store = new TokenStore(undefined);
    assert.equal(store.canRefresh(), false);
    assert.equal(store.status().canRefresh, false);
    assert.equal(store.logout(), false);
  });
});

test("status never carries the token itself", async () => {
  await withCredentialsFile({ access_token: "super-secret", obtained_at: Date.now() }, () => {
    const status = JSON.stringify(new TokenStore(undefined).status());
    assert.ok(!status.includes("super-secret"));
    assert.ok(status.includes("credentials.json"));
  });
});