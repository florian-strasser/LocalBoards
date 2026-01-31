# Board

The `api/data/board` endpoint is used to get a single board entry or to edit an existing board or create a new board.

## Examples

### Create a new board

```js
const data = await $fetch("/api/data/board", {
    method: "POST",
    headers: {
      'x-api-key': 'YOURKEY'
    },
    body: {
        id: null,
        userId: userID,
        name: boardName,
        style: boardStyle,
        status: boardStatus,
    },
});
```

More Information will follow.
