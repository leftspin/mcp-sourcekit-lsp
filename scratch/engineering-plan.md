# MCP SourceKit-LSP Server Engineering Plan

## Project Overview

We're building an MCP (Model Context Protocol) server that acts as a bridge between AI agents (like Claude) and SourceKit-LSP. This will allow AI agents to understand Swift code semantically, navigate projects intelligently, and provide better assistance for Swift development.

## What You'll Be Building

An MCP server that:
1. Connects to a running SourceKit-LSP instance
2. Translates MCP requests from AI agents into LSP requests
3. Returns Swift code intelligence back to the AI agent

## Key Concepts You Need to Understand

### 1. Language Server Protocol (LSP)
- A protocol for editors to talk to language servers
- Uses JSON-RPC over stdin/stdout
- SourceKit-LSP is Apple's LSP implementation for Swift

### 2. Model Context Protocol (MCP)
- A protocol for AI agents to access external tools and data
- Also uses JSON-RPC
- Has three main concepts: Resources, Tools, and Prompts

### 3. Our Bridge Architecture
```
AI Agent <--[MCP]--> Our Server <--[LSP]--> SourceKit-LSP <--> Swift Code
```

## Implementation Approach

### Step 1: Choose Your Language
We recommend **TypeScript** because:
- Most MCP examples use TypeScript
- Good async/await support for handling multiple protocols
- Easy JSON handling
- Can spawn child processes easily

### Step 2: Set Up Basic MCP Server Structure

Create a basic MCP server that can:
```typescript
// Basic structure
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "sourcekit-lsp-mcp",
  version: "1.0.0"
});

// We'll add tools here...

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 3: Create LSP Client Connection

You'll need to:
1. Spawn sourcekit-lsp as a child process
2. Communicate with it via stdin/stdout
3. Handle JSON-RPC messages

```typescript
import { spawn } from 'child_process';

class SourceKitLSPClient {
  private process;
  
  async connect() {
    this.process = spawn('sourcekit-lsp');
    // Set up stdin/stdout handlers
    // Send initialization request
  }
  
  async sendRequest(method: string, params: any) {
    // Send JSON-RPC request
    // Wait for response
  }
}
```

### Step 4: Design MCP Tools

Map LSP capabilities to MCP tools that make sense for AI agents:

#### Tool: `swift-definition`
- **Purpose**: Find where a symbol is defined
- **Input**: `{ file: string, line: number, column: number }`
- **LSP Method**: `textDocument/definition`
- **Returns**: Location of definition

#### Tool: `swift-hover`
- **Purpose**: Get type info and documentation
- **Input**: `{ file: string, line: number, column: number }`
- **LSP Method**: `textDocument/hover`
- **Returns**: Type information and docs

#### Tool: `swift-references`
- **Purpose**: Find all usages of a symbol
- **Input**: `{ file: string, line: number, column: number }`
- **LSP Method**: `textDocument/references`
- **Returns**: List of locations

#### Tool: `swift-symbols`
- **Purpose**: Search for symbols in workspace
- **Input**: `{ query: string }`
- **LSP Method**: `workspace/symbol`
- **Returns**: List of matching symbols

#### Tool: `swift-diagnostics`
- **Purpose**: Get errors and warnings for a file
- **Input**: `{ file: string }`
- **Returns**: List of diagnostics

### Step 5: Implement Resources

Resources provide read-only data to the AI:

#### Resource: `swift-project-structure`
- Lists all Swift files in the project
- Shows package/module organization

#### Resource: `swift-build-settings`
- Current build configuration
- Compiler flags and settings

### Step 6: Handle the Full Flow

1. AI agent calls MCP tool (e.g., "find definition of `MyClass`")
2. Your server translates to LSP request
3. Send request to SourceKit-LSP
4. Receive LSP response
5. Transform response to MCP format
6. Return to AI agent

## Implementation Checklist

- [ ] Set up TypeScript project with MCP SDK
- [ ] Create basic MCP server skeleton
- [ ] Implement LSP client class
- [ ] Add LSP connection initialization
- [ ] Implement first tool (start with `swift-hover`)
- [ ] Add error handling for LSP communication
- [ ] Implement remaining tools
- [ ] Add resources
- [ ] Create configuration for sourcekit-lsp path
- [ ] Write tests
- [ ] Create usage documentation

## Common Challenges You'll Face

1. **Async Communication**: Both protocols are async. Use promises/async-await.

2. **Error Handling**: LSP server might not be running, or might crash. Handle gracefully.

3. **Path Translation**: Make sure file URIs are handled correctly (`file:///` format).

4. **Initialization**: LSP requires proper initialization sequence. Don't send requests before initialized.

5. **Position Encoding**: LSP uses 0-based line/column positions. Be consistent.

## Testing Your Implementation

1. Start with a simple Swift project
2. Test each tool manually first
3. Use the MCP Inspector: `npx @modelcontextprotocol/inspector`
4. Test with Claude Desktop eventually

## Example Usage Flow

When an AI agent uses your server:

```
Agent: "What is the type of the variable on line 42 of AppDelegate.swift?"

Your MCP Server:
1. Receives tool call: swift-hover { file: "AppDelegate.swift", line: 42, column: 10 }
2. Sends to LSP: textDocument/hover with proper URI and position
3. Gets response: "UIWindow?"
4. Returns to agent: "The variable is of type UIWindow? (optional UIWindow)"
```

## Project Setup Instructions

### Initial Setup
```bash
# Create the project
npm init -y
npm install --save @modelcontextprotocol/sdk
npm install --save-dev @types/node typescript

# Create TypeScript config
npx tsc --init
```

### Package.json Configuration
```json
{
  "name": "@leftspin/mcp-sourcekit-lsp",
  "version": "0.1.0",
  "description": "MCP server for Swift code intelligence via sourcekit-lsp",
  "main": "dist/index.js",
  "bin": {
    "mcp-sourcekit-lsp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "prepare": "npm run build"
  }
}
```

### Project Structure
```
mcp-sourcekit-lsp/
├── src/
│   ├── index.ts          # Main entry point
│   ├── server.ts         # MCP server setup
│   ├── lsp-client.ts     # SourceKit-LSP client
│   └── tools/            # Individual tool implementations
│       ├── definition.ts
│       ├── hover.ts
│       └── ...
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Distribution and Installation

### For Development
```bash
# Users can run directly from GitHub
npx github:leftspin/mcp-sourcekit-lsp
```

### For Production
```bash
# After publishing to npm
npm install -g @leftspin/mcp-sourcekit-lsp

# Or users can install from GitHub
npm install -g github:leftspin/mcp-sourcekit-lsp
```

### Claude Desktop Configuration

Users will add to their Claude Desktop config:
```json
{
  "mcpServers": {
    "sourcekit-lsp": {
      "command": "npx",
      "args": ["@leftspin/mcp-sourcekit-lsp"],
      "env": {
        "SOURCEKIT_LSP_PATH": "/path/to/sourcekit-lsp"  // Optional
      }
    }
  }
}
```

### Making the Binary Executable

Add this to the top of `src/index.ts`:
```typescript
#!/usr/bin/env node
```

## Resources for You

1. [LSP Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
2. [MCP TypeScript Guide](/docs/mcp-typescript-guide.md)
3. [SourceKit-LSP Reference](/docs/sourcekit-lsp-reference.md)
4. Example MCP servers: https://github.com/modelcontextprotocol/servers

## Next Steps

1. Read through the MCP TypeScript guide
2. Set up a basic TypeScript project
3. Get a "hello world" MCP server running
4. Add your first LSP connection
5. Implement one tool at a time

Remember: Start simple, test often, and build incrementally!