# Building MCP Servers with TypeScript

## Installation

First, install the TypeScript SDK:

```bash
npm install @modelcontextprotocol/sdk
```

## Basic Server Structure

Here's a minimal MCP server in TypeScript:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create the server instance
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Set up your server's capabilities here
// - Resources
// - Tools  
// - Prompts

// Create transport and connect
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Implementing Resources

Resources expose data that LLMs can read:

```typescript
server.addResource({
  uri: "file:///path/to/resource",
  name: "My Resource",
  description: "Description of what this resource provides",
  mimeType: "text/plain"
});

// Handle resource requests
server.setRequestHandler("resources/read", async (request) => {
  const { uri } = request.params;
  
  // Return the resource content
  return {
    contents: [{
      uri,
      mimeType: "text/plain",
      text: "Resource content here"
    }]
  };
});
```

## Implementing Tools

Tools allow LLMs to execute actions:

```typescript
server.addTool({
  name: "my-tool",
  description: "What this tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "First parameter" },
      param2: { type: "number", description: "Second parameter" }
    },
    required: ["param1"]
  }
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "my-tool") {
    // Execute tool logic
    const result = await executeMyTool(args);
    
    return {
      content: [{
        type: "text",
        text: `Tool executed: ${result}`
      }]
    };
  }
});
```

## Implementing Prompts

Prompts provide reusable interaction templates:

```typescript
server.addPrompt({
  name: "analyze-code",
  description: "Analyzes code and provides insights",
  arguments: [{
    name: "language",
    description: "Programming language",
    required: true
  }]
});

// Handle prompt requests
server.setRequestHandler("prompts/get", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "analyze-code") {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Analyze this ${args.language} code and provide insights...`
        }
      }]
    };
  }
});
```

## Transport Options

### Stdio Transport (Local)
For local communication with clients:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTTP Transport (Remote)
For remote servers accessible over the network:

```typescript
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";

const transport = new HttpServerTransport({
  port: 3000,
  path: "/mcp"
});
await server.connect(transport);
```

## Error Handling

Implement proper error handling:

```typescript
server.onerror = (error) => {
  console.error("MCP Server error:", error);
};

// In request handlers
server.setRequestHandler("tools/call", async (request) => {
  try {
    // Tool implementation
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message
      }
    };
  }
});
```

## Testing Your Server

Test with the MCP CLI tools or integrate with Claude Desktop:

1. Create a server executable
2. Add to Claude Desktop's configuration
3. Test resources, tools, and prompts

## Best Practices

1. **Clear Naming**: Use descriptive names for resources, tools, and prompts
2. **Good Documentation**: Provide clear descriptions for all capabilities
3. **Input Validation**: Validate all inputs in tool handlers
4. **Error Messages**: Return helpful error messages
5. **Logging**: Implement logging for debugging
6. **State Management**: Handle server state appropriately for your use case

## Example: File System Server

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs/promises";
import * as path from "path";

const server = new McpServer({
  name: "filesystem-server",
  version: "1.0.0"
});

// Add file reading tool
server.addTool({
  name: "read-file",
  description: "Read contents of a file",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to read" }
    },
    required: ["path"]
  }
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "read-file") {
    try {
      const content = await fs.readFile(args.path, "utf-8");
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
    } catch (error) {
      return {
        error: {
          code: -32602,
          message: `Failed to read file: ${error.message}`
        }
      };
    }
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Next Steps

1. Explore the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
2. Check out [example servers](https://github.com/modelcontextprotocol/servers)
3. Read the full [MCP specification](https://modelcontextprotocol.io)
4. Join the MCP community for support and updates