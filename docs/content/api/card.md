# Card

The `api/data/card` endpoint is used to manage cards within a board. It supports retrieving, creating, updating, and deleting cards.

## GET Method

Fetches details of a specific card.

### Parameters
- `cardID` (required): The ID of the card to fetch.

### Example Request
```json
GET /api/data/card?cardID=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "card": {
    "id": 123,
    "area": 456,
    "name": "Card Title",
    "content": "Card content goes here",
    "status": true,
    "sort": 1
  }
}
```

### Example Response (Error)
```json
{
  "error": "Card not found"
}
```

## POST Method

Creates a new card.

### Parameters
- `areaId` (required): The ID of the area to which the card belongs.
- `name` (required): The title of the card.
- `content` (optional): The content of the card.
- `status` (optional): The status of the card (default: `false`).
- `user` (required): The ID of the user creating the card.

### Example Request
```json
POST /api/data/card
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "areaId": 456,
  "name": "New Card",
  "content": "This is the content of the card",
  "status": false,
  "user": 789
}
```

### Example Response (Success)
```json
{
  "card": {
    "id": 123,
    "area": 456,
    "name": "New Card",
    "content": "This is the content of the card",
    "status": false,
    "sort": 1
  }
}
```

### Example Response (Error)
```json
{
  "error": "Area ID, name, and user are required"
}
```

## PUT Method

Updates an existing card.

### Parameters
- `cardID` (required): The ID of the card to update.
- `name` (required): The new title of the card.
- `content` (optional): The new content of the card.
- `status` (optional): The new status of the card.

### Example Request
```json
PUT /api/data/card
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "cardID": 123,
  "name": "Updated Card Title",
  "content": "Updated card content",
  "status": true
}
```

### Example Response (Success)
```json
{
  "card": {
    "id": 123,
    "area": 456,
    "name": "Updated Card Title",
    "content": "Updated card content",
    "status": true,
    "sort": 1
  }
}
```

### Example Response (Error)
```json
{
  "error": "Card ID and name are required"
}
```

## DELETE Method

Deletes an existing card.

### Parameters
- `cardID` (required): The ID of the card to delete.

### Example Request
```json
DELETE /api/data/card
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "cardID": 123
}
```

### Example Response (Success)
```json
{
  "message": "Card deleted successfully",
  "card": {
    "id": 123,
    "area": 456,
    "name": "Card Title",
    "content": "Card content goes here",
    "status": true,
    "sort": 1
  }
}
```

### Example Response (Error)
```json
{
  "error": "Card not found"
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
