# Area

The `/api/data/area` endpoint is used to manage areas within a board. It supports creating, updating, and deleting areas.

## Create a new area

Use the `POST` method to create a new area or updates an existing area.

### Parameters
- `id` (optional): The ID of the area to update. If not provided, a new area will be created.
- `boardId` (required): The ID of the board to which the area belongs.
- `name` (required): The name of the area.

### Example Request
```json
POST /api/data/area
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "boardId": "123",
  "name": "New Area"
}
```

### Example Response (Success)
```json
{
  "area": {
    "id": "456",
    "board": "123",
    "name": "New Area",
    "sort": 1
  }
}
```

## Delete an existing area

Use the `DELETE` method to delete an existing area.

### Parameters
- `id` (required): The ID of the area to delete.
- `boardId` (required): The ID of the board to which the area belongs.

### Example Request

```json
DELETE /api/data/area?id=456&boardId=123
X-API-Key: your_api_key_here
```

### Example Response (Success)
```json
{
  "message": "Area deleted successfully"
}
```
