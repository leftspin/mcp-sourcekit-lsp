# Claude Code Configuration

## Project Overview

This is mcp-sourcekit-lsp, a Model Context Protocol (MCP) server that bridges AI agents to SourceKit-LSP for Swift code intelligence.

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Test the MCP server locally
npx @modelcontextprotocol/inspector

# Run the server directly
node dist/index.js
```

## Commands

When starting a session, Claude should:

1. Read the README.md
2. Check the engineering plan in scratch/engineering-plan.md
3. Review existing implementation in src/

## Code Style

- Follow TypeScript best practices and match existing code style
- Use async/await for all asynchronous operations
- Handle errors gracefully - never let the server crash
- Use strict TypeScript settings
- Don't leave a comment when you delete code

## Implementation Guidelines

- If you need high-level design decisions, check docs/ for reference materials
  - DO NOT MODIFY reference docs unless explicitly asked
- Implement the minimum necessary code without embellishments
- Never provide backward compatibility or legacy code:
  - Instead, replace functionality with new implementation
- Always fix core issues rather than symptoms:
  - When tests fail, fix the underlying problem
  - Don't modify tests just to make them pass
- Stop implementation and ask the user if you encounter:
  - Major architectural decisions
  - Design choices with significant implications
  - Multiple approaches with different tradeoffs

## Git Guidelines

- _NEVER_ add co-author lines to commit messages
- Keep commit messages concise and descriptive
- Always add ALL modified files when committing (use git add .)

## Testing

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector

# Test with a real Swift project
# 1. Build the server
npm run build

# 2. Configure Claude Desktop (see README for config)

# 3. Open a Swift project and test the tools
```

## Scratch Pads (scratch/)

- Use scratch/ for design documents, test scripts, or explainer documents
- The engineering plan is already in scratch/engineering-plan.md

## Reviews (Documents and Code)

When asked to review documents or code, by default use the `codex` command-line tool:

### Document Reviews
```bash
codex -m gpt-4.1-mini --reasoning high -q "Review the document at PATH. Check for clarity, completeness, and whether a junior developer could follow it."
```
- Default model: `gpt-4.1-mini` (unless you specify another model like `o3`)
- For o3 model, add `--flex-mode` flag
- Example: `codex -m o3 --flex-mode --reasoning high -q "Review..."`

### Code Reviews
```bash
codex -m gpt-4.1-mini --reasoning high -q "Review the TypeScript code changes [SCOPE]. Reference the engineering doc at scratch/engineering-plan.md. Ensure proper error handling, async/await usage, and MCP protocol compliance."
```
- Default scope: Changes since last commit (`git diff HEAD~1`)
- Alternative scopes you might specify:
  - Changes compared to another branch: `git diff main...feature-branch`
  - Staged changes: `git diff --staged`
  - All uncommitted changes: `git diff`

### Available Codex Parameters
- `-m, --model`: Model to use (default: gpt-4.1-mini, other options: o3, o4-mini, etc.)
- `--reasoning`: Reasoning effort level (low, medium, high) - default: high
- `-q, --quiet`: Non-interactive mode (recommended for reviews)
- `--flex-mode`: Required for o3 and o4-mini models

### Using Claude for Reviews

Alternatively, use another Claude instance:

```bash
# Document review
claude "Review the document at PATH. Check if it's clear enough for a junior developer to implement."

# Code review (changes since last commit)
claude "Review the code changes from: $(git diff HEAD~1). Ensure it follows TypeScript best practices and implements the MCP protocol correctly per scratch/engineering-plan.md."
```

## Project Structure

```
mcp-sourcekit-lsp/
├── src/
│   ├── index.ts          # Main entry point with #!/usr/bin/env node
│   ├── server.ts         # MCP server setup
│   ├── lsp-client.ts     # SourceKit-LSP client connection
│   └── tools/            # Individual MCP tool implementations
├── dist/                 # Compiled JavaScript output
├── docs/                 # Reference documentation
├── scratch/              # Design docs and notes
├── package.json
├── tsconfig.json
└── README.md
```

## Key Implementation Points

1. **LSP Connection**: Handle the SourceKit-LSP subprocess carefully
   - Proper initialization sequence
   - Error handling for crashed processes
   - Clean shutdown

2. **MCP Tools**: Each tool should:
   - Validate inputs
   - Transform LSP responses to useful MCP responses
   - Handle errors gracefully

3. **File URIs**: Always use proper file:// URIs when communicating with LSP

4. **Async Operations**: All LSP communication is async - handle properly

## Distribution

The package should be installable via:
- `npx github:leftspin/mcp-sourcekit-lsp`
- `npm install -g @leftspin/mcp-sourcekit-lsp` (after publishing)

## Notifying the user when you have finished

- _IMPORTANT_ When you have finished your task, notify the user with this script:

```bash
./bin/notify "Your message here"
```

- The script is located at `bin/notify` and handles all the Pushover API details
- You can include emojis and special characters in your message
- The script will confirm if the notification was sent successfully