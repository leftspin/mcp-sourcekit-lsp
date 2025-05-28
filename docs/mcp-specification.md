# MCP Protocol Specification Summary

## Protocol Overview

The Model Context Protocol (MCP) uses JSON-RPC 2.0 as its base communication protocol. All messages follow the JSON-RPC format with MCP-specific methods and parameters.

## Message Types

### 1. Initialization

**Client → Server**: `initialize`
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "1.0",
    "capabilities": {
      "resources": {},
      "tools": {},
      "prompts": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

**Server → Client**: Response
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "1.0",
    "capabilities": {
      "resources": {},
      "tools": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### 2. Resources

**List Resources**
- Method: `resources/list`
- Direction: Client → Server
- Returns: Array of available resources

**Read Resource**
- Method: `resources/read`
- Direction: Client → Server
- Parameters: `{ uri: string }`
- Returns: Resource contents

### 3. Tools

**List Tools**
- Method: `tools/list`
- Direction: Client → Server
- Returns: Array of available tools with schemas

**Call Tool**
- Method: `tools/call`
- Direction: Client → Server
- Parameters: `{ name: string, arguments: object }`
- Returns: Tool execution result

### 4. Prompts

**List Prompts**
- Method: `prompts/list`
- Direction: Client → Server
- Returns: Array of available prompts

**Get Prompt**
- Method: `prompts/get`
- Direction: Client → Server
- Parameters: `{ name: string, arguments: object }`
- Returns: Prompt messages

## Capabilities

Servers and clients negotiate capabilities during initialization:

- **resources**: Support for resource operations
- **tools**: Support for tool operations
- **prompts**: Support for prompt operations
- **logging**: Support for logging
- **experimental**: Experimental features

## Transport Mechanisms

### Stdio Transport
- Communication via standard input/output
- Used for local server processes
- Messages separated by newlines

### HTTP Transport (Streamable)
- RESTful HTTP endpoints
- Server-sent events for streaming
- Authentication support

## Error Codes

Standard JSON-RPC error codes plus MCP-specific codes:

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000` to `-32099`: Server errors

## Resource URIs

Resources use URI schemes to identify content:
- `file://`: Local file system
- `http://` or `https://`: Web resources
- Custom schemes for application-specific resources

## Tool Schemas

Tools define input schemas using JSON Schema:

```json
{
  "name": "example-tool",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["param1"]
  }
}
```

## Content Types

MCP supports multiple content types in responses:

```json
{
  "content": [{
    "type": "text",
    "text": "Plain text content"
  }, {
    "type": "image",
    "data": "base64-encoded-data",
    "mimeType": "image/png"
  }]
}
```

## Notifications

Servers can send notifications to clients:

**Resource Updated**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///path/to/resource"
  }
}
```

## Session Management

- Sessions are established during initialization
- Servers may maintain state per session
- Clean shutdown via `shutdown` method

## Security Considerations

1. **Authentication**: Transport-specific (OAuth, API keys, etc.)
2. **Authorization**: Servers control access to resources/tools
3. **Input Validation**: All inputs must be validated
4. **Sandboxing**: Tool execution should be sandboxed
5. **Rate Limiting**: Prevent abuse of server resources

## Version Compatibility

- Protocol uses semantic versioning
- Clients and servers negotiate compatible version
- Backward compatibility within major versions

## Best Practices

1. Implement all required methods
2. Validate inputs according to schemas
3. Return appropriate error codes
4. Log important operations
5. Handle connection lifecycle properly
6. Document custom extensions

For the complete specification, visit: https://modelcontextprotocol.io/specification