# Invite

The `api/data/invite` endpoint is used to manage invitations for a board. It supports retrieving, creating, and deleting invitations.

## GET Method

Fetches all invitations for a specific board.

### Parameters
- `boardId` (required): The ID of the board for which invitations are to be fetched.

### Example Request
```http
GET /api/data/invite?boardId=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "invitations": [
    {
      "id": 456,
      "board": 123,
      "user": 789,
      "permission": "edit",
      "userName": "John Doe",
      "userImage": "user_image_url"
    },
    {
      "id": 789,
      "board": 123,
      "user": 101,
      "permission": "view",
      "userName": "Jane Smith",
      "userImage": "user_image_url"
    }
  ]
}
```

### Example Response (Error)
```json
{
  "error": "Board not found"
}
```

## POST Method

Creates a new invitation for a specific board.

### Parameters
- `boardId` (required): The ID of the board to which the invitation belongs.
- `userId` (required): The ID of the user who is creating the invitation.
- `mail` (required): The email of the user to be invited.
- `permission` (required): The permission level for the invitation (e.g., "edit" or "view").

### Example Request
```json
POST /api/data/invite
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "boardId": 123,
  "userId": 789,
  "mail": "john.doe@example.com",
  "permission": "edit"
}
```

### Example Response (Success)
```json
{
  "message": "Invitation created successfully"
}
```

### Example Response (Error)
```json
{
  "error": "Board ID, userId, mail and permission are required"
}
```

## DELETE Method

Removes an invitation for a specific board.

### Parameters
- `boardId` (required): The ID of the board from which the invitation is to be removed.
- `userId` (required): The ID of the user who is removing the invitation.
- `deleteUser` (required): The ID of the user whose invitation is to be removed.

### Example Request
```json
DELETE /api/data/invite?boardId=123&userId=789&deleteUser=101
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "message": "Invitation removed successfully"
}
```

### Example Response (Error)
```json
{
  "error": "Board ID and user ID are required"
}
```

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `404 Not Found`: Board or invitation not found.
- `405 Method Not Allowed`: Unsupported HTTP method.
- `500 Internal Server Error`: Database or server error.
