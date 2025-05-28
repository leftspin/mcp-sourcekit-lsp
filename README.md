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

# Optional: Set up development notifications (see Development Environment below)
cp .env.example .env
# Edit .env with your notification credentials
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

### Claude Code

Add this server to Claude Code's MCP settings:

1. Open Claude Code settings: `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
2. Search for "MCP" or navigate to the MCP section
3. Add a new server configuration:

```json
{
  "name": "sourcekit-lsp",
  "command": "npx",
  "args": ["@leftspin/mcp-sourcekit-lsp"],
  "env": {
    "SOURCEKIT_LSP_PATH": "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp"
  }
}
```

Or if installed globally:
```json
{
  "name": "sourcekit-lsp", 
  "command": "mcp-sourcekit-lsp",
  "env": {
    "SOURCEKIT_LSP_PATH": "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp"
  }
}
```

### Environment Variables

- `SOURCEKIT_LSP_PATH` (optional): Path to sourcekit-lsp binary. Defaults to `sourcekit-lsp` in PATH.
- `SOURCEKIT_BUILD_ARGS` (optional): Additional arguments for sourcekit-lsp (e.g., `-Xswiftc -debug-info-format=dwarf`).

#### For Xcode Projects
If you're working with Xcode projects, you may need to specify build arguments:
```bash
export SOURCEKIT_BUILD_ARGS="-Xswiftc -sdk -Xswiftc /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk"
```

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

### Setup
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Run tests
npm test

# Test with MCP Inspector
npx @modelcontextprotocol/inspector
```

### Development Environment

The project includes a notification system for development updates. To use it:

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials to `.env`:**
   ```bash
   # Pushover credentials for development notifications (optional)
   PUSHOVER_TOKEN=your_pushover_app_token
   PUSHOVER_USER=your_pushover_user_key
   ```

3. **Get Pushover credentials (optional):**
   - Sign up at [pushover.net](https://pushover.net)
   - Create an application to get your app token
   - Find your user key in your account settings

**Note:** The `.env` file is automatically ignored by git to keep your credentials secure. The notification system is entirely optional and only used for development convenience.

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### SourceKit-LSP not found
If the server can't find sourcekit-lsp, set the `SOURCEKIT_LSP_PATH` environment variable:

**Common locations:**
- **Xcode**: `/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp`
- **Swift toolchain**: `/Library/Developer/Toolchains/swift-latest.xctoolchain/usr/bin/sourcekit-lsp`
- **Homebrew**: `/opt/homebrew/bin/sourcekit-lsp`

**Check if sourcekit-lsp is available:**
```bash
which sourcekit-lsp
# Or try running it directly
sourcekit-lsp --help
```

### No results from tools
1. **Build your project first**: SourceKit-LSP requires compilation information
   ```bash
   # For SPM projects
   swift build
   
   # For Xcode projects
   xcodebuild -project YourProject.xcodeproj -scheme YourScheme build
   ```

2. **Check file paths**: Ensure file paths are absolute and the files exist

3. **Verify workspace**: Run the MCP server from your project's root directory

### Diagnostics not appearing
- Diagnostics are sent asynchronously by SourceKit-LSP
- Files with no errors/warnings will return empty diagnostics
- Large projects may take longer to analyze

### Performance issues
- SourceKit-LSP can be resource-intensive on large projects
- Consider using `SOURCEKIT_BUILD_ARGS` to limit scope if needed
- Close unused Xcode projects to free up SourceKit-LSP resources

## Architecture

This MCP server acts as a bridge between AI agents and SourceKit-LSP:

```
AI Agent <--[MCP]--> This Server <--[LSP]--> SourceKit-LSP <--> Swift Code
```

- **MCP Tools**: Synchronous request/response for AI agents
- **LSP Communication**: Asynchronous notifications and requests
- **Caching**: Diagnostics and file state cached for immediate responses

## License

MIT

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

See the [engineering plan](scratch/engineering-plan.md) for implementation details.