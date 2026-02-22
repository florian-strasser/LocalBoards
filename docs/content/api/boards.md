# Boards

The `api/data/boards` endpoint is used to retrieve a list of all available boards for the authenticated user. You can fetch your own boards or the boards that are shared with you.

## POST Method

Fetches a list of boards for the specified user.

### Parameters
- `userId` (required): The ID of the user whose boards are being fetched.
- `shared` (optional): If `true`, fetches boards shared with the user. Default is `false`.

### Example Request (Own Boards)
```json
POST /api/data/boards
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "userId": 123
}
```

### Example Request (Shared Boards)
```json
POST /api/data/boards
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "userId": 123,
  "shared": true
}
```

### Example Response (Success)
```json
{
  "boards": [
    {
      "id": 456,
      "user": 123,
      "name": "Board 1",
      "style": "kanban",
      "image": "board_image_url",
      "status": "public"
    },
    {
      "id": 789,
      "user": 123,
      "name": "Board 2",
      "style": "todo",
      "image": "board_image_url",
      "status": "private"
    }
  ]
}
```

### Example Response (Error)
```json
{
  "error": "User ID is required"
}
```

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `500 Internal Server Error`: Database or server error.
