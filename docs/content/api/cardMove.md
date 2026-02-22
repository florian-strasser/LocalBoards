# Move a card

The `api/data/cardMove` endpoint is used to move a card from one area to another within a board.

## POST Method

Moves a card from one area to another and updates its position in the destination area.

### Parameters
- `cardId` (required): The ID of the card to move.
- `fromAreaId` (required): The ID of the area from which the card is being moved.
- `toAreaId` (required): The ID of the area to which the card is being moved.
- `newIndex` (required): The new position (sort order) of the card in the destination area.

### Example Request
```json
POST /api/data/cardMove
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "cardId": 123,
  "fromAreaId": 456,
  "toAreaId": 789,
  "newIndex": 2
}
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
  "error": "Card ID, fromAreaId, toAreaId, and newIndex are required"
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
