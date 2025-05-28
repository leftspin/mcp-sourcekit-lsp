# MCP Server Development Quick Start Guide

## Prerequisites

Before starting MCP server development, ensure you have:

- Familiarity with a programming language (Python, TypeScript, Java, Kotlin, C#)
- Understanding of LLMs like Claude
- Language-specific runtime requirements:
  - Python: 3.10+
  - TypeScript/Node.js: Node 18+
  - Java: JDK 17+
  - C#: .NET 8+

## Core Server Capabilities

MCP servers can provide three main types of capabilities:

1. **Resources**: File-like data that can be read by clients (like API responses or file contents)
2. **Tools**: Functions that can be called by the LLM (with user approval)
3. **Prompts**: Pre-written templates for common tasks

## Server Development Process

### 1. Environment Setup

Choose your preferred language and install the corresponding MCP SDK:

**TypeScript/JavaScript:**
```bash
npm install @modelcontextprotocol/sdk
# Or use the CLI:
npx @modelcontextprotocol/create-app
```

**Python:**
```bash
pip install mcp
# Or with uv:
uv add mcp
```

**C#/.NET:**
```bash
dotnet add package ModelContextProtocol --prerelease
dotnet add package Microsoft.Extensions.Hosting
```

**Java/Spring Boot:**
Use Spring Initializer with Spring AI MCP Server starter

### 2. Basic Server Structure

A typical MCP server includes:

- **Transport Layer**: Handles communication (stdio, SSE, etc.)
- **Tool Handlers**: Implement the actual functionality
- **Resource Providers**: Expose data to clients
- **Configuration**: Server metadata and capabilities

### 3. Example: Weather Server

Here's a simplified example structure for a weather server:

```python
# Python example
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.types as types

# Create server instance
server = Server("weather-server")

# Define tools
@server.list_tools()
async def handle_list_tools():
    return [
        types.Tool(
            name="get-forecast",
            description="Get weather forecast for coordinates",
            inputSchema={
                "type": "object",
                "properties": {
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"}
                },
                "required": ["latitude", "longitude"]
            }
        )
    ]

# Implement tool execution
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict):
    if name == "get-forecast":
        # Fetch weather data
        # Return formatted response
        pass
```

### 4. Server Initialization

The initialization process follows these steps:

1. Client sends `initialize` request with protocol version
2. Server responds with capabilities and chosen protocol version
3. Client sends `initialized` notification
4. Server is ready to handle requests

### 5. Testing with Claude Desktop

To test your server:

1. Build and package your server
2. Configure Claude Desktop to connect to your server
3. Use Claude to interact with your server's tools and resources

## Best Practices

- **Error Handling**: Implement robust error handling for all operations
- **Input Validation**: Validate all inputs before processing
- **Security**: Implement proper access controls for sensitive operations
- **Documentation**: Provide clear descriptions for all tools and resources
- **Testing**: Write comprehensive tests for your server functionality

## Example Servers

Official reference servers demonstrating MCP features:

- **Filesystem**: Secure file operations with configurable access
- **PostgreSQL/SQLite**: Database interaction capabilities
- **Git/GitHub/GitLab**: Repository management and operations
- **Google Drive**: File access and search capabilities
- **Brave Search**: Web search integration

## Remote vs Local Servers

- **Local Servers**: Run on the user's machine, accessed via stdio or local connections
- **Remote Servers**: Internet-accessible, use OAuth for authentication

## Resources

- Official Documentation: https://modelcontextprotocol.io
- GitHub Organization: https://github.com/modelcontextprotocol
- Example Servers: https://github.com/modelcontextprotocol/servers
- Specification: https://spec.modelcontextprotocol.io