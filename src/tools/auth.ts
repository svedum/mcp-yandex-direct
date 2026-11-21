import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TokenStore } from "../auth.js";
import type { YandexDirectClient } from "../client.js";
import { fail, ok, READ_ONLY } from "./util.js";

export function registerAuthTools(
  server: McpServer,
  _client: YandexDirectClient,
  tokens: TokenStore,
): void {
  server.registerTool(
    "auth_status",
    {
      title: "Статус подключения к Директу",
      annotations: READ_ONLY,
      description:
        "Показывает, подключён ли Яндекс Директ: есть ли токен, откуда он взят (переменная окружения YANDEX_DIRECT_TOKEN или файл OAuth хоста PLUGIN_OAUTH_CREDENTIALS_PATH), когда истекает и какой путь к файлу. Ничего не отправляет в сеть и не показывает сам токен.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(tokens.status());
      } catch (e) {
        return fail(e);
      }
    },
  );
}