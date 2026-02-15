# MCP Server

The LocalBoards MCP Server allows you to integrate LocalBoards functionality directly into your LLM applications. This enables you to automate workflows, manage boards, areas, cards, and comments programmatically.

## Authentication

Most tool calls require authentication. You need to provide an API key in the headers of your requests. You can generate API keys in your user settings.

## Integration

To integrate the LocalBoards MCP Server with your LLM, add the following configuration to your LLM settings:

```json
{
  "mcpServers": {
    "localBoards": {
      "url": "http://yourdomain.com/mcp",
      "headers": {
        "x-api-key": "YOUR-API-KEY"
      }
    }
  }
}
