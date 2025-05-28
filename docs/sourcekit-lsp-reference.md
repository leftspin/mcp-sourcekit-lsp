# SourceKit-LSP Reference

## Overview

SourceKit-LSP is a Language Server Protocol (LSP) implementation for Swift and C-based languages. It provides intelligent editor functionality like code-completion and jump-to-definition to LSP-compatible editors.

## Key Features

- Built on top of sourcekitd and clangd for high-fidelity language support
- Provides a powerful source code index
- Cross-language support (Swift, C, C++, Objective-C)
- Compatible with Swift Package Manager and CMake projects

## LSP Capabilities

SourceKit-LSP implements the standard Language Server Protocol, supporting:

### Text Document Synchronization
- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/didClose`
- `textDocument/didSave`

### Language Features
- `textDocument/completion` - Code completion
- `textDocument/hover` - Type information and documentation on hover
- `textDocument/signatureHelp` - Function/method signature help
- `textDocument/definition` - Go to definition
- `textDocument/typeDefinition` - Go to type definition
- `textDocument/implementation` - Find implementations
- `textDocument/references` - Find all references
- `textDocument/documentHighlight` - Highlight occurrences
- `textDocument/documentSymbol` - Document outline
- `textDocument/codeAction` - Quick fixes and refactorings
- `textDocument/formatting` - Format document
- `textDocument/rangeFormatting` - Format selection
- `textDocument/rename` - Rename symbol
- `textDocument/foldingRange` - Code folding regions

### Workspace Features
- `workspace/symbol` - Search workspace symbols
- `workspace/didChangeConfiguration` - Configuration changes
- `workspace/didChangeWatchedFiles` - File watching

## Installation and Running

### Installation
- Included in Swift toolchains from swift.org
- Bundled with Xcode (usually at `/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sourcekit-lsp`)
- Can be built from source

### Running
```bash
# Basic usage
sourcekit-lsp

# The server communicates via stdin/stdout using JSON-RPC
```

## Important Notes

1. **Index Updates**: SourceKit-LSP does not update its global index in the background. Cross-module functionality might be limited if the project hasn't been built recently.

2. **Build Requirements**: For best results, build your project regularly or enable experimental background indexing.

3. **Project Types**: Works best with Swift Package Manager and CMake projects. Xcode projects may need additional configuration.

## Communication Protocol

SourceKit-LSP uses the Language Server Protocol over JSON-RPC:

1. **Transport**: stdin/stdout communication
2. **Message Format**: 
   - Headers: `Content-Length: <bytes>\r\n\r\n`
   - Body: JSON-RPC 2.0 messages

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/definition",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.swift"
    },
    "position": {
      "line": 10,
      "character": 5
    }
  }
}
```

## Build Server Protocol

SourceKit-LSP supports the Build Server Protocol for better integration with build systems. This allows it to:
- Discover build settings
- Get compiler arguments
- Track build artifacts

## Resources

- [Official Repository](https://github.com/swiftlang/sourcekit-lsp)
- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [Swift.org Tools](https://swift.org/tools) - Editor setup guides