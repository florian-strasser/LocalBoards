# Authentification

To authenticate at an API endpoint you will need to send an `x-api-key` header parameter with your request. You can generate an key within the user settings.

```js
const data = await $fetch("/api/data/board", {
    method: "POST",
    headers: {
      'x-api-key': 'YOURKEY'
    },
    body: {
        id: null,
        userId: userID,
        name: newName,
        style: newBoardStyle.value,
        status: newBoardStatus.value,
    },
});
```
