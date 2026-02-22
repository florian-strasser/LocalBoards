# Order card

The `api/data/cardOrder` endpoint is used to reorder a card within its current area.

## POST Method

Updates the position (sort order) of a card within its current area.

### Parameters
- `cardId` (required): The ID of the card to reorder.
- `areaId` (required): The ID of the area in which the card is located.
- `newIndex` (required): The new position (sort order) of the card within the area.

### Example Request
```json
POST /api/data/cardOrder
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "cardId": 123,
  "areaId": 456,
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
  "error": "Card ID, areaId, and newIndex are required"
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
