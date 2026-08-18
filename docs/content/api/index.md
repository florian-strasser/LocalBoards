# Authentication

Everything the interface does, the API can do too. It is the same code path
behind both, so anything you can reach with a board open you can reach with a
request — and an assistant can work a board through the
[MCP server](/docs/mcp-server), which is this API with a protocol on top.

## Getting a key

Issue a key in **Settings › API keys**. Two things worth deciding at that
moment:

- **Read-only or full.** A read-only key is refused on anything that would
  change something. If a script only reports, give it a key that cannot do
  damage.
- **Whose key it is.** A key acts as the account that issued it and sees exactly
  what that account sees. For an assistant, create an account for it and mark it
  as an AI agent — its actions then carry a bot icon rather than looking like a
  colleague's.

A key can be revoked at any time, and revoking takes effect immediately.

## Making a request

Send the key as an `x-api-key` header. There is no other authentication step, no
token exchange and no expiry to handle.

::code-example
#curl
```bash
curl -X GET "https://boards.example.com/api/data/board?id=123" \
  -H "X-API-Key: $LOKALBOARDS_KEY"
```

#js
```js
const response = await fetch("https://boards.example.com/api/data/board?id=123", {
  headers: {
    "X-API-Key": apiKey,
  },
});

if (!response.ok) throw new Error(await response.text());

const data = await response.json();
```

#vue
```vue
<script setup>
const config = useRuntimeConfig();

const { data, error } = await useAsyncData("board", () =>
  $fetch("https://boards.example.com/api/data/board?id=123", {
    headers: { "X-API-Key": config.lokalBoardsKey },
  }),
);
</script>

<template>
  <pre v-if="data">{{ data }}</pre>
  <p v-else-if="error">{{ error.message }}</p>
</template>
```

#react
```jsx
import { useEffect, useState } from "react";

export function Example({ apiKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("https://boards.example.com/api/data/board?id=123", {
      headers: { "X-API-Key": apiKey },
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(setData)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });

    return () => controller.abort();
  }, [apiKey]);

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

#php
```php
<?php

$ch = curl_init('https://boards.example.com/api/data/board?id=123');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey,
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);
```
::

The examples on these pages are shown in the language you pick above, and the
choice is remembered — pick Vue once and every example in the reference is Vue.

## What comes back

Responses are JSON. A request that fails carries an `error` field and an HTTP
status that says what kind of failure it was:

| Status | Means |
|--------|-------|
| `400` | A parameter is missing or the wrong shape. |
| `401` | No key, or a key that is not valid. |
| `403` | A valid key, but not for this board — or a read-only key on a write. |
| `404` | No such board, area or card **that this key can see**. |
| `500` | The server or its database failed. |

`403` and `404` are deliberately hard to tell apart from outside: a board you
have no access to answers the same way as a board that does not exist, so the
API cannot be used to find out which boards exist.
