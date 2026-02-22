# Comment

The `api/data/comment` endpoint is used to manage comments for a specific card. It supports retrieving all comments for a card and creating new comments.

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

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `404 Not Found`: Card or board not found.
- `405 Method Not Allowed`: Unsupported HTTP method.
- `500 Internal Server Error`: Database or server error.
