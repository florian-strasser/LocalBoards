# Comment

The `api/data/comment` endpoint is used to manage comments for a specific card. It supports retrieving all comments for a card (GET), creating new comments (POST), updating existing comments (PUT), and deleting comments (DELETE).

## GET Method

Fetches all comments associated with a specific card.

### Parameters
- `cardID` (required): The ID of the card for which comments are to be fetched.

### Example Request
```http
GET /api/data/comment?cardID=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "comments": [
    {
      "id": 456,
      "card": 123,
      "user": 789,
      "userImage": "user_image_url",
      "userName": "John Doe",
      "content": "This is a comment on the card",
      "date": "2023-10-01T12:00:00.000Z"
    },
    {
      "id": 789,
      "card": 123,
      "user": 101,
      "userImage": "user_image_url",
      "userName": "Jane Smith",
      "content": "Another comment on the card",
      "date": "2023-10-02T14:30:00.000Z"
    }
  ]
}
```

### Example Response (Error)
```json
{
  "error": "Card not found"
}
```

## POST Method

Creates a new comment for a specific card.

### Parameters
- `card` (required): The ID of the card to which the comment belongs.
- `content` (required): The content of the comment.
- `user` (required): The ID of the user creating the comment.

### Example Request
```json
POST /api/data/comment
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "card": 123,
  "content": "This is a new comment",
  "user": 789
}
```

### Example Response (Success)
```json
{
  "comment": {
    "id": 456,
    "card": 123,
    "user": 789,
    "userImage": "user_image_url",
    "userName": "John Doe",
    "content": "This is a new comment",
    "date": "2023-10-01T12:00:00.000Z"
  }
}
```

### Example Response (Error)
```json
{
  "error": "Card ID, content, and user are required"
}
```

## PUT Method

Updates an existing comment. **Only the comment creator can update their own comments.**

### Parameters
- `id` (required): The ID of the comment to update.
- `content` (required): The new content for the comment.

### Example Request
```http
PUT /api/data/comment
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "id": 456,
  "content": "This is the updated comment content"
}
```

### Example Response (Success)
```json
{
  "comment": {
    "id": 456,
    "card": 123,
    "user": 789,
    "userImage": "user_image_url",
    "userName": "John Doe",
    "content": "This is the updated comment content",
    "date": "2023-10-01T12:00:00.000Z"
  }
}
```

### Example Response (Error)
```json
{
  "error": "Unauthorized access"
}
```

## PATCH Method

**New in v0.12.0** - Updates the checked state of checklist items within a comment. Only allows modifications to the `data-checked` and `checked` attributes on `<li>` elements with `data-type="taskItem"`. All other content must remain unchanged.

### Parameters
- `id` (required): The ID of the comment to update.
- `content` (required): The updated comment content with modified checklist item states.

### Example Request
```http
PATCH /api/data/comment
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "id": 456,
  "content": "<p>Task list:</p><ul><li data-type=\"taskItem\" data-checked=\"true\"><input checked=\"checked\" type=\"checkbox\"> Completed task</li><li data-type=\"taskItem\" data-checked=\"false\"><input type=\"checkbox\"> Pending task</li></ul>"
}
```

### Example Response (Success)
```json
{
  "comment": {
    "id": 456,
    "card": 123,
    "user": 789,
    "content": "<p>Task list:</p><ul><li data-type=\"taskItem\" data-checked=\"true\"><input checked=\"checked\" type=\"checkbox\"> Completed task</li><li data-type=\"taskItem\" data-checked=\"false\"><input type=\"checkbox\"> Pending task</li></ul>",
    "date": "2023-10-01T12:00:00.000Z"
  }
}
```

### Example Response (Error - Only checkbox states can be modified)
```json
{
  "error": "Only checkbox states can be modified"
}
```

## DELETE Method

Deletes a comment. **Only the comment creator can delete their own comments.**

### Parameters
- `commentId` (required, query parameter): The ID of the comment to delete.

### Example Request
```http
DELETE /api/data/comment?commentId=456
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "success": true
}
```

### Example Response (Error)
```json
{
  "error": "Unauthorized access"
}
```

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `404 Not Found`: Card or board not found.
- `405 Method Not Allowed`: Unsupported HTTP method.
- `500 Internal Server Error`: Database or server error.
