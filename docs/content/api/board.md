# Board

The `api/data/board` endpoint is used to manage boards. It supports retrieving, creating, updating, and deleting boards, as well as updating the order of areas within a board.

## GET Method

Fetches details of a specific board.

### Parameters
- `id` (required): The ID of the board to fetch.
- `userId` (required): The ID of the user requesting the board.

### Example Request
```http
GET /api/data/board?id=123&userId=456
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "board": {
    "id": 123,
    "user": 456,
    "name": "Board Name",
    "style": "kanban",
    "image": "board_image_url",
    "color": "#2563eb",
    "status": "public"
  },
  "writeAccess": true
}
```

### Example Response (Error)
```json
{
  "error": "Board not found"
}
```

## POST Method

Creates a new board or updates an existing board.

### Parameters
- `id` (optional): The ID of the board to update. If not provided, a new board will be created.
- `userId` (required): The ID of the user creating or updating the board.
- `name` (required): The name of the board.
- `style` (required): The style of the board. Can be set to "kanban" or "todo".
- `image` (optional): The image URL for the board.
- `color` (optional): The tile colour as a hex value, e.g. `#2563eb`. Anything that is not a hex colour — including an empty string — is stored as `null`, which means the tile uses the instance's primary colour. A cover image covers the tile, so a board shows either an image or a colour.
- `status` (required): The status of the board (e.g., "public" or "private").

### Example Request (Create)
```json
POST /api/data/board
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "userId": 456,
  "name": "New Board",
  "style": "board_style",
  "status": "public"
}
```

### Example Request (Update)
```json
POST /api/data/board
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "id": 123,
  "userId": 456,
  "name": "Updated Board",
  "style": "todo",
  "status": "private"
}
```

### Example Response (Success)
```json
{
  "board": {
    "id": 123,
    "user": 456,
    "name": "Board Name",
    "style": "kanban",
    "image": "board_image_url",
    "color": "#2563eb",
    "status": "public"
  }
}
```

### Example Response (Error)
```json
{
  "error": "User ID, name, style and status are required"
}
```

## DELETE Method

Deletes a specific board.

### Parameters
- `id` (required): The ID of the board to delete.
- `userId` (required): The ID of the user deleting the board.

### Example Request
```http
DELETE /api/data/board?id=123&userId=456
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "message": "Board deleted successfully"
}
```

### Example Response (Error)
```json
{
  "error": "Board not found"
}
```

## PATCH Method

Updates the order of areas within a board.

### Parameters
- `boardId` (required): The ID of the board for which the area order is to be updated.
- `areas` (required): An array of area objects with their new sort order.

### Example Request
```json
PATCH /api/data/board
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "boardId": 123,
  "areas": [
    {
      "id": 456,
      "sort": 1
    },
    {
      "id": 789,
      "sort": 2
    }
  ]
}
```

### Example Response (Success)
```json
{
  "message": "Area order updated successfully"
}
```

### Example Response (Error)
```json
{
  "error": "Board ID and areas array are required for PATCH requests"
}
```

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `404 Not Found`: Board not found.
- `405 Method Not Allowed`: Unsupported HTTP method.
- `500 Internal Server Error`: Database or server error.
