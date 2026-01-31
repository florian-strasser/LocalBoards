# Boards

The `api/data/boards` endpoint is used to get a list of all available boards for the authenticated user. You can get your own boards or the boards that are shared with you.

## Parameters

### userId (required)
The ID of the user whose boards are being fetched.

### shared
If `true`, fetches boards shared with the user. Default is false.

## Examples

### Get a list of your boards

```js
const { data, error } = await useFetch("/api/data/boards", {
    method: "POST",
    headers: {
      'x-api-key': 'YOURKEY'
    },
    body: { userId: userID },
});
```

### Get a list of shared boards

```js
const { data, error } = await useFetch("/api/data/boards", {
    method: "POST",
    headers: {
      'x-api-key': 'YOURKEY'
    },
    body: { userId: userID, shared: true },
});
```
