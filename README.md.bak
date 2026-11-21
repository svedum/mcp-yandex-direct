# @svedum/mcp-yandex-direct

Форк [mcp-yandex-direct](https://github.com/askads/mcp-yandex-direct) (MIT, Aleksandr Kovalko) под схему OAuth платформы **Сведум**.

## Авторизация

Токен берётся в таком порядке:

1. **`YANDEX_DIRECT_TOKEN`** — переменная окружения в конфигурации MCP (удобно для CI и внешних клиентов).
2. **Файл хоста** — путь в `PLUGIN_OAUTH_CREDENTIALS_PATH`, JSON: `{ "access_token": "...", "expiry_date"?: число_ms }`. Файл пишет Сведум после OAuth; обновление токена делает платформа, не этот пакет.

В Сведуме: **Персонализация → Подключения** (или «Настроить» у интеграции Яндекс Директ).

Инструменты `start_login` / `finish_login` / `logout` из upstream удалены.

## Запуск

```bash
npm install
npm run build
npx @svedum/mcp-yandex-direct
```

## Upstream

Исходный проект: https://github.com/askads/mcp-yandex-direct

Телеметрия Ask Ads отключена; лицензия MIT без изменений.