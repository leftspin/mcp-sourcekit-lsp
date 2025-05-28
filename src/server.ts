import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  CallToolRequest,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ReadResourceRequest
} from '@modelcontextprotocol/sdk/types.js';
import { SourceKitLSPClient } from './lsp-client.js';
import { createHoverTool } from './tools/hover.js';
import { createDefinitionTool } from './tools/definition.js';
import { createReferencesTool } from './tools/references.js';
import { createSymbolsTool } from './tools/symbols.js';
import { createDiagnosticsTool } from './tools/diagnostics.js';
import { TOOL_DEFINITIONS } from './tool-definitions.js';
import Ajv from 'ajv';

export class MCPSourceKitServer {
  private server: Server;
  private lspClient: SourceKitLSPClient;
  private workspaceRoot: string;
  private ajv: Ajv;

  constructor() {
    this.server = new Server(
      {
        name: 'sourcekit-lsp-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.lspClient = new SourceKitLSPClient();
    this.workspaceRoot = process.cwd();
    this.ajv = new Ajv();
    
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // List available tools (generated from tool definitions)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        return {
          content: [{
            type: 'text',
            text: 'Error: No arguments provided'
          }]
        };
      }

      try {
        // Validate arguments against tool schema
        const validationError = this.validateToolArgs(name, args);
        if (validationError) {
          return {
            content: [{
              type: 'text',
              text: `Validation error: ${validationError}`
            }]
          };
        }

        switch (name) {
          case 'swift-hover':
            return await createHoverTool(this.lspClient).execute(args as any);
          case 'swift-definition':
            return await createDefinitionTool(this.lspClient).execute(args as any);
          case 'swift-references':
            return await createReferencesTool(this.lspClient).execute(args as any);
          case 'swift-symbols':
            return await createSymbolsTool(this.lspClient).execute(args as any);
          case 'swift-diagnostics':
            return await createDiagnosticsTool(this.lspClient).execute(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${errorMessage}`
          }]
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'swift://project-structure',
            name: 'Swift Project Structure',
            description: 'Overview of Swift files and project organization',
            mimeType: 'application/json'
          },
          {
            uri: 'swift://build-settings',
            name: 'Build Settings',
            description: 'Current build configuration and compiler settings',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
      const { uri } = request.params;

      switch (uri) {
        case 'swift://project-structure':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                workspaceRoot: this.workspaceRoot,
                // TODO: Implement project structure discovery
                message: 'Project structure discovery not yet implemented'
              }, null, 2)
            }]
          };
        
        case 'swift://build-settings':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                lspPath: process.env.SOURCEKIT_LSP_PATH || 'sourcekit-lsp',
                buildArgs: process.env.SOURCEKIT_BUILD_ARGS?.split(' ') || [],
                workspaceRoot: this.workspaceRoot
              }, null, 2)
            }]
          };
        
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  async start(): Promise<void> {
    // Initialize LSP connection
    try {
      await this.lspClient.connect(this.workspaceRoot);
      console.error('Connected to SourceKit-LSP');
    } catch (error) {
      console.error('Failed to connect to SourceKit-LSP:', error);
      throw error;
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP SourceKit-LSP server started');
  }

  private validateToolArgs(toolName: string, args: unknown): string | null {
    const toolDef = TOOL_DEFINITIONS.find(tool => tool.name === toolName);
    if (!toolDef) {
      return `Unknown tool: ${toolName}`;
    }

    // Add validation constraints that aren't in the public schema
    const validationSchema = JSON.parse(JSON.stringify(toolDef.inputSchema)); // Deep clone
    validationSchema.additionalProperties = false;
    
    // Add minimum constraints for line/column numbers
    if (validationSchema.type === 'object' && validationSchema.properties) {
      const props = validationSchema.properties;
      if (props.line) props.line.minimum = 1;
      if (props.column) props.column.minimum = 1;
      if (props.query) props.query.minLength = 1;
    }

    const validate = this.ajv.compile(validationSchema);
    const valid = validate(args);
    
    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath || 'root'} ${err.message}`
      ).join(', ') || 'Invalid arguments';
      return errors;
    }

    return null;
  }

  async stop(): Promise<void> {
    await this.lspClient.shutdown();
    await this.server.close();
  }
}