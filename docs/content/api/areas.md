# Areas

The `/api/data/areas` endpoint is used to retrieve all areas that belong to a specific board.

## Fetch all areas

Use the `GET` method to fetch all areas associated with a given board.

### Parameters
- `boardId` (required): The ID of the board for which areas are to be fetched.

### Example Request
```http
GET /api/data/areas?boardId=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "areas": [
    {
      "id": "area_456",
      "board": "board_123",
      "name": "Area 1",
      "sort": 1
    },
    {
      "id": "area_789",
      "board": "board_123",
      "name": "Area 2",
      "sort": 2
    }
  ]
}
```
