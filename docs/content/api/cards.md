# Cards

The `api/data/cards` endpoint is used to retrieve all cards that belong to a specific area within a board.

## GET Method

Fetches all cards associated with a given area.

### Parameters
- `areaId` (required): The ID of the area for which cards are to be fetched.

### Example Request
```json
GET /api/data/cards?areaId=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "cards": [
    {
      "id": 456,
      "area": 123,
      "name": "Card 1",
      "content": "Content of card 1",
      "status": false,
      "sort": 1
    },
    {
      "id": 789,
      "area": 123,
      "name": "Card 2",
      "content": "Content of card 2",
      "status": true,
      "sort": 2
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

## Authentication

The endpoint requires authentication via an API key or session. Unauthorized requests will receive a `403 Forbidden` error.

## Error Handling

- `400 Bad Request`: Missing required parameters.
- `403 Forbidden`: Unauthorized access.
- `404 Not Found`: Board not found.
- `405 Method Not Allowed`: Unsupported HTTP method.
- `500 Internal Server Error`: Database or server error.
