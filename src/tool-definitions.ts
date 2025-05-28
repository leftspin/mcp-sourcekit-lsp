export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'swift-hover',
    description: 'Get type information and documentation for a symbol at a specific position',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to Swift file' },
        line: { type: 'number', description: 'Line number (1-based)' },
        column: { type: 'number', description: 'Column number (1-based)' }
      },
      required: ['file', 'line', 'column']
    }
  },
  {
    name: 'swift-definition',
    description: 'Find the definition of a symbol at a specific position',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to Swift file' },
        line: { type: 'number', description: 'Line number (1-based)' },
        column: { type: 'number', description: 'Column number (1-based)' }
      },
      required: ['file', 'line', 'column']
    }
  },
  {
    name: 'swift-references',
    description: 'Find all references to a symbol at a specific position',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to Swift file' },
        line: { type: 'number', description: 'Line number (1-based)' },
        column: { type: 'number', description: 'Column number (1-based)' },
        includeDeclaration: { type: 'boolean', description: 'Include declaration in results', default: true }
      },
      required: ['file', 'line', 'column']
    }
  },
  {
    name: 'swift-symbols',
    description: 'Search for symbols in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for symbol names' }
      },
      required: ['query']
    }
  },
  {
    name: 'swift-diagnostics',
    description: 'Get compiler diagnostics (errors and warnings) for a file',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to Swift file' }
      },
      required: ['file']
    }
  }
];