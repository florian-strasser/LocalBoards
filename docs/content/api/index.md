# Authentification

To authenticate at an API endpoint you will need to send an `x-api-key` header parameter with your request. You can generate an key within the user settings.

```http
GET /api/data/board?id=123&userId=101
X-API-Key: your_api_key_here
```
