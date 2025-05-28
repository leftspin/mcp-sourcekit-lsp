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
- Uses JSON-RPC over stdin/stdout with specific message framing
- SourceKit-LSP is Apple's LSP implementation for Swift
- Requires proper initialization handshake before use

#### LSP Message Framing (Critical!)
Each JSON-RPC message MUST be preceded by headers:
```
Content-Length: 123\r\n
\r\n
{"jsonrpc":"2.0","id":1,"method":"textDocument/hover","params":{...}}
```
**Without the Content-Length header, SourceKit-LSP will ignore your messages!**

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

You'll need to handle the full LSP lifecycle:
1. Spawn sourcekit-lsp as a child process
2. Handle message framing with Content-Length headers
3. Send proper initialization sequence
4. Track request IDs for async responses

#### Using vscode-jsonrpc (Recommended)
Install the helper library to handle LSP complexity:
```bash
npm install --save vscode-jsonrpc vscode-languageserver-types
```

```typescript
import { 
  createMessageConnection, 
  StreamMessageReader, 
  StreamMessageWriter,
  MessageConnection
} from 'vscode-jsonrpc/node';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export class SourceKitLSPClient {
  private connection!: MessageConnection;
  private process!: ChildProcess;
  
  async connect(workspaceRoot: string) {
    // Find sourcekit-lsp binary
    const lspPath = process.env.SOURCEKIT_LSP_PATH || 'sourcekit-lsp';
    
    // Spawn with proper arguments for build context
    this.process = spawn(lspPath, [], {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
    });
    
    // Create message connection
    this.connection = createMessageConnection(
      new StreamMessageReader(this.process.stdout),
      new StreamMessageWriter(this.process.stdin)
    );
    
    // Start listening
    this.connection.listen();
    
    // Initialize sequence
    const initResult = await this.connection.sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${workspaceRoot}`,
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['plaintext', 'markdown'] },
          definition: { linkSupport: false },
          references: { dynamicRegistration: false }
        },
        workspace: {
          symbol: { dynamicRegistration: false }
        }
      },
      initializationOptions: {}
    });
    
    // Send initialized notification (no need to await void)
    this.connection.sendNotification('initialized');
    
    return initResult;
  }
  
  async hover(uri: string, line: number, character: number) {
    return await this.connection.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    });
  }
  
  async shutdown() {
    await this.connection.sendRequest('shutdown');
    this.connection.sendNotification('exit');
    this.connection.dispose();
    this.process.kill();
  }
}
```

#### Manual Implementation (Educational)
If you want to understand the protocol deeply:
```typescript
class ManualLSPClient {
  private requestId = 0;
  private pendingRequests = new Map();
  
  sendMessage(message: any) {
    const json = JSON.stringify(message);
    const headers = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
    this.process.stdin.write(headers + json);
  }
  
  sendRequest(method: string, params: any): Promise<any> {
    const id = ++this.requestId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.sendMessage(message);
    });
  }
}
```

### Step 4: Design MCP Tools

Map LSP capabilities to MCP tools that make sense for AI agents:

**Important**: LSP uses 0-based positions (line 0 = first line, column 0 = first character). 
Most editors show 1-based line numbers to users. You must convert: `lspLine = userLine - 1`

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
- **Note**: Diagnostics are sent as notifications from LSP, not request/response

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
2. Ensure file is opened in LSP (send `textDocument/didOpen` if needed)
3. Your server translates to LSP request
4. Send request to SourceKit-LSP
5. Receive LSP response
6. Transform response to MCP format
7. Return to AI agent

#### Critical: File Synchronization
Before sending any requests about a file, you MUST open it:
```typescript
async openFile(uri: string, content: string) {
  await this.connection.sendNotification('textDocument/didOpen', {
    textDocument: {
      uri,
      languageId: 'swift',
      version: 1,
      text: content
    }
  });
}

// If the file content changes (e.g., user edits)
async updateFile(uri: string, content: string, version: number) {
  await this.connection.sendNotification('textDocument/didChange', {
    textDocument: { uri, version },
    contentChanges: [{ text: content }]
  });
}

// When done with a file
async closeFile(uri: string) {
  await this.connection.sendNotification('textDocument/didClose', {
    textDocument: { uri }
  });
}
```

#### Handling Diagnostics (Errors/Warnings)
Diagnostics come as notifications, not responses. Set up a listener:
```typescript
constructor() {
  this.diagnosticsCache = new Map<string, Diagnostic[]>();
  
  // Listen for diagnostics
  this.connection.onNotification('textDocument/publishDiagnostics', (params) => {
    this.diagnosticsCache.set(params.uri, params.diagnostics);
  });
}

// MCP tool returns cached diagnostics
getDiagnostics(uri: string): Diagnostic[] {
  return this.diagnosticsCache.get(uri) || [];
}
```

## Implementation Checklist

- [ ] Set up TypeScript project with MCP SDK and vscode-jsonrpc
- [ ] Create basic MCP server skeleton
- [ ] Implement LSP client class with proper message framing
- [ ] Add LSP connection initialization (initialize → initialized)
- [ ] Implement file synchronization (didOpen/didClose)
- [ ] Add Content-Length framing & message-ID tracking
- [ ] Implement first tool (start with `swift-hover`)
- [ ] Add error handling for LSP communication
- [ ] Implement remaining tools
- [ ] Add resources
- [ ] Create configuration for sourcekit-lsp path
- [ ] Handle graceful shutdown (MCP close → LSP shutdown/exit)
- [ ] Write tests
- [ ] Create usage documentation

## Common Challenges You'll Face

1. **Message Framing**: Forgetting Content-Length header = "nothing happens"
   - Solution: Use vscode-jsonrpc or always add headers

2. **File Not Open**: Sending hover/definition before didOpen = null responses
   - Solution: Track open files, send didOpen first

3. **Path Translation**: File URI vs local path mismatches
   - Example: `/Users/foo/bar.swift` → `file:///Users/foo/bar.swift`
   - Use `import { URI } from 'vscode-uri'` for conversions

4. **Build Context**: SourceKit-LSP needs to understand your project
   - For SPM: Run from package root
   - For Xcode: May need `--compile-commands` flag
   - Consider exposing build configuration options

5. **Process Management**: Child process leaks if not handled
   - Always implement shutdown sequence
   - Handle unexpected exits:
   ```typescript
   this.process.on('exit', (code) => {
     console.error(`SourceKit-LSP exited with code ${code}`);
     // Optionally restart or notify user
   });
   ```

6. **Large Projects**: Too many diagnostics can overwhelm
   - Batch/throttle diagnostic updates
   - Consider filtering by severity

## Build Context Setup

SourceKit-LSP needs to understand your project structure:

### For Swift Package Manager Projects
```bash
# Generate build files
swift build

# SourceKit-LSP will find Package.swift automatically
```

### For Xcode Projects
```bash
# Option 1: Use xcode-build-server (recommended)
# Install: brew install xcode-build-server
xcode-build-server config -workspace MyApp.xcworkspace \
  -scheme MyApp

# Option 2: Generate compile_commands.json manually
# Build and extract compilation database
xcodebuild -project MyApp.xcodeproj \
  -scheme MyApp \
  -derivedDataPath build \
  clean build

# Find compile_commands.json in build/Build/Intermediates.noindex
find build -name compile_commands.json -type f

# Pass to sourcekit-lsp if needed
sourcekit-lsp --compile-commands path/to/compile_commands.json
```

For more details, see: https://github.com/apple/sourcekit-lsp/tree/main/Documentation

### In Your Code
```typescript
// Allow users to specify build configuration
const buildArgs = process.env.SOURCEKIT_BUILD_ARGS?.split(' ') || [];
this.process = spawn(lspPath, buildArgs, {
  cwd: workspaceRoot
});
```

## Testing Your Implementation

### Unit Testing Setup

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest

# Create jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts']
};
```

### Mock LSP for Testing

```typescript
// __tests__/mock-lsp.ts
import { EventEmitter } from 'events';

export class MockLSPConnection extends EventEmitter {
  private responses = new Map<string, any>();
  
  mockResponse(method: string, response: any) {
    this.responses.set(method, response);
  }
  
  async sendRequest(method: string, params: any) {
    const response = this.responses.get(method);
    if (!response) throw new Error(`No mock for ${method}`);
    return typeof response === 'function' ? response(params) : response;
  }
  
  sendNotification(method: string, params: any) {
    this.emit('notification', { method, params });
  }
}
```

### Example Tool Test

```typescript
// __tests__/tools/hover.test.ts
import { HoverTool } from '../../src/tools/hover';
import { MockLSPConnection } from '../mock-lsp';

describe('HoverTool', () => {
  let tool: HoverTool;
  let mockLSP: MockLSPConnection;
  
  beforeEach(() => {
    mockLSP = new MockLSPConnection();
    tool = new HoverTool(mockLSP);
  });
  
  test('converts 1-based to 0-based positions', async () => {
    let capturedParams: any;
    mockLSP.mockResponse('textDocument/hover', (params) => {
      capturedParams = params;
      return {
        contents: { kind: 'plaintext', value: 'String' },
        range: { start: { line: 9, character: 4 }, end: { line: 9, character: 10 } }
      };
    });
    
    await tool.execute({
      file: '/path/to/file.swift',
      line: 10,  // 1-based
      column: 5  // 1-based
    });
    
    expect(capturedParams.position).toEqual({
      line: 9,     // 0-based
      character: 4  // 0-based
    });
  });
  
  test('handles null responses gracefully', async () => {
    mockLSP.mockResponse('textDocument/hover', null);
    
    const result = await tool.execute({
      file: '/path/to/file.swift',
      line: 10,
      column: 5
    });
    
    expect(result.content[0].text).toContain('No type information available');
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/swift-project.test.ts
import { SourceKitLSPClient } from '../../src/lsp-client';
import * as fs from 'fs';
import * as path from 'path';

describe('Swift Project Integration', () => {
  let client: SourceKitLSPClient;
  const testProjectPath = path.join(__dirname, '../fixtures/TestProject');
  
  beforeAll(async () => {
    client = new SourceKitLSPClient();
    await client.connect(testProjectPath);
  });
  
  afterAll(async () => {
    await client.shutdown();
  });
  
  test('hover on UIViewController', async () => {
    const fileUri = `file://${testProjectPath}/Sources/ViewController.swift`;
    const content = fs.readFileSync(
      path.join(testProjectPath, 'Sources/ViewController.swift'), 
      'utf8'
    );
    
    await client.openFile(fileUri, content);
    
    const result = await client.hover(fileUri, 5, 20);
    expect(result.contents.value).toContain('UIViewController');
  });
});
```

### Test Fixtures

Create a minimal Swift project for testing:
```
__tests__/
├── fixtures/
│   └── TestProject/
│       ├── Package.swift
│       └── Sources/
│           └── TestProject/
│               └── main.swift
```

```swift
// __tests__/fixtures/TestProject/Package.swift
// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "TestProject",
    products: [
        .executable(name: "TestProject", targets: ["TestProject"]),
    ],
    targets: [
        .executableTarget(name: "TestProject"),
    ]
)
```

### Manual Testing

1. Start with a simple Swift project
2. Test each tool manually first
3. Use the MCP Inspector: `npx @modelcontextprotocol/inspector`
4. Test with Claude Desktop eventually

### Testing Checklist

- [ ] Unit tests for position conversion (1-based → 0-based)
- [ ] Unit tests for URI handling (path → file:// URI)
- [ ] Mock LSP responses for all tools
- [ ] Error handling tests (null responses, LSP crashes)
- [ ] Integration test with real SourceKit-LSP
- [ ] Test file synchronization (open/change/close)
- [ ] Test diagnostics caching
- [ ] Test graceful shutdown
- [ ] Performance tests for large projects
- [ ] Claude Desktop integration test

## Example Usage Flow

When an AI agent uses your server:

```
Agent: "What is the type of the variable on line 42 of AppDelegate.swift?"

Your MCP Server:
1. Receives tool call: swift-hover { file: "AppDelegate.swift", line: 42, column: 10 }
2. Converts to 0-based: line 42 → 41, column 10 → 10 (columns often already 0-based)
3. Sends to LSP: textDocument/hover with proper URI and position
4. Gets response: "UIWindow?"
5. Returns to agent: "The variable is of type UIWindow? (optional UIWindow)"
```

### End-to-End Example: Hover Request

#### MCP → Your Server
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "swift-hover",
    "arguments": {
      "file": "/Users/dev/MyApp/AppDelegate.swift",
      "line": 42,
      "column": 10
    }
  }
}
```

#### Your Server → SourceKit-LSP
First, ensure file is open:
```
Content-Length: 246\r\n
\r\n
{
  "jsonrpc": "2.0",
  "method": "textDocument/didOpen",
  "params": {
    "textDocument": {
      "uri": "file:///Users/dev/MyApp/AppDelegate.swift",
      "languageId": "swift",
      "version": 1,
      "text": "// file contents here..."
    }
  }
}
```

Then send hover request:
```
Content-Length: 179\r\n
\r\n
{
  "jsonrpc": "2.0",
  "id": 100,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///Users/dev/MyApp/AppDelegate.swift"
    },
    "position": {
      "line": 41,      // 0-based: user's line 42 becomes 41
      "character": 10
    }
  }
}
```

#### SourceKit-LSP → Your Server
```json
{
  "jsonrpc": "2.0",
  "id": 100,
  "result": {
    "contents": {
      "kind": "markdown",
      "value": "```swift\nvar window: UIWindow?\n```\n\nThe application's window"
    },
    "range": {
      "start": {"line": 41, "character": 8},
      "end": {"line": 41, "character": 14}
    }
  }
}
```

#### Your Server → MCP
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Type: `UIWindow?` (optional UIWindow)\n\nThe application's window"
    }]
  }
}
```

## Project Setup Instructions

### Initial Setup
```bash
# Create the project
npm init -y

# Install runtime dependencies
npm install --save @modelcontextprotocol/sdk vscode-jsonrpc vscode-languageserver-types vscode-uri

# Install dev dependencies
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
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
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

## Troubleshooting Guide

### "Nothing happens when I send requests"
- **Cause**: Missing Content-Length header
- **Fix**: Check your message framing, use vscode-jsonrpc

### "All requests return null"
- **Cause**: File not opened in LSP
- **Fix**: Send textDocument/didOpen before other requests

### "SourceKit-LSP crashes immediately"
- **Cause**: Can't find Swift project
- **Fix**: Run from project root, check for Package.swift

### "No hover info or definitions work"
- **Cause**: Project not built
- **Fix**: Run `swift build` first

### "Getting timeout errors"
- **Cause**: SourceKit-LSP is indexing
- **Fix**: Wait for indexing, add longer timeouts

### "File paths don't match"
- **Cause**: URI encoding issues
- **Fix**: Use vscode-uri library for conversions

### Debug Tips
```typescript
// Enable LSP tracing
process.env.SOURCEKIT_LOGGING = '3';

// Log all messages
connection.trace('verbose', {
  log: (message) => console.log('[LSP]', message)
});
```