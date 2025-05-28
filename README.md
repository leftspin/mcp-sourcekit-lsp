# MCP SourceKit-LSP

An MCP (Model Context Protocol) server that provides Swift code intelligence to AI agents through SourceKit-LSP.

## Features

This MCP server exposes SourceKit-LSP functionality to AI agents, enabling them to:

- **Navigate Swift code**: Find definitions, references, and implementations
- **Understand types**: Get hover information with type details and documentation
- **Search symbols**: Find classes, methods, and properties across your project
- **Check diagnostics**: Access compiler errors and warnings

## Installation

### From npm (once published)
```bash
npm install -g @leftspin/mcp-sourcekit-lsp
```

### From GitHub
```bash
npm install -g github:leftspin/mcp-sourcekit-lsp
```

### For Development
```bash
git clone https://github.com/leftspin/mcp-sourcekit-lsp.git
cd mcp-sourcekit-lsp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sourcekit-lsp": {
      "command": "npx",
      "args": ["@leftspin/mcp-sourcekit-lsp"],
      "env": {
        "SOURCEKIT_LSP_PATH": "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp"
      }
    }
  }
}
```

### Environment Variables

- `SOURCEKIT_LSP_PATH` (optional): Path to sourcekit-lsp binary. If not set, the server will try to find it in common locations.

## Available Tools

### swift-definition
Find where a symbol is defined.
```json
{
  "file": "/path/to/file.swift",
  "line": 10,
  "column": 5
}
```

### swift-hover
Get type information and documentation for a symbol.
```json
{
  "file": "/path/to/file.swift",
  "line": 10,
  "column": 5
}
```

### swift-references
Find all references to a symbol.
```json
{
  "file": "/path/to/file.swift",
  "line": 10,
  "column": 5
}
```

### swift-symbols
Search for symbols in the workspace.
```json
{
  "query": "MyClass"
}
```

### swift-diagnostics
Get compiler diagnostics for a file.
```json
{
  "file": "/path/to/file.swift"
}
```

## Resources

### swift-project-structure
Provides an overview of the Swift project structure, including all Swift files and their organization.

### swift-build-settings
Shows the current build configuration and compiler settings.

## Requirements

- Node.js 16 or later
- SourceKit-LSP (comes with Xcode or Swift toolchain)
- A Swift project (Swift Package Manager or Xcode project)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run watch

# Test with MCP Inspector
npx @modelcontextprotocol/inspector
```

## Troubleshooting

### SourceKit-LSP not found
If the server can't find sourcekit-lsp, set the `SOURCEKIT_LSP_PATH` environment variable to the full path of the binary.

Common locations:
- Xcode: `/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp`
- Swift toolchain: `/Library/Developer/Toolchains/swift-latest.xctoolchain/usr/bin/sourcekit-lsp`

### No results from tools
SourceKit-LSP requires your project to be built at least once. Build your Swift project before using the MCP tools.

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.