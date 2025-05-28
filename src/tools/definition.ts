import { SourceKitLSPClient } from '../lsp-client.js';
import { URI } from 'vscode-uri';
import { Location } from 'vscode-languageserver-types';
import { promises as fs } from 'fs';

interface DefinitionArgs {
  file: string;
  line: number;
  column: number;
}

export function createDefinitionTool(lspClient: SourceKitLSPClient) {
  return {
    async execute(args: DefinitionArgs) {
      const { file, line, column } = args;
      
      // Convert to URI and 0-based positions
      const uri = URI.file(file).toString();
      const lspLine = line - 1;  // Convert 1-based to 0-based
      const lspColumn = column - 1;  // Convert 1-based to 0-based
      
      try {
        // Ensure file is open in LSP
        try {
          const content = await fs.readFile(file, 'utf8');
          await lspClient.openFile(uri, content);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: ${file}`);
          }
          throw error;
        }
        
        // Send definition request
        const result = await lspClient.definition(uri, lspLine, lspColumn);
        
        if (!result) {
          return {
            content: [{
              type: 'text',
              text: 'No definition found at this position'
            }]
          };
        }
        
        // Handle both single Location and Location[]
        const locations = Array.isArray(result) ? result : [result];
        
        if (locations.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No definition found at this position'
            }]
          };
        }
        
        // Format the response
        const definitions = locations.map((location: Location) => {
          const filePath = URI.parse(location.uri).fsPath;
          const startLine = location.range.start.line + 1;  // Convert back to 1-based
          const startChar = location.range.start.character + 1;
          
          return `${filePath}:${startLine}:${startChar}`;
        });
        
        const text = definitions.length === 1 
          ? `Definition found at: ${definitions[0]}`
          : `Multiple definitions found:\n${definitions.map(def => `- ${def}`).join('\n')}`;
        
        return {
          content: [{
            type: 'text',
            text
          }]
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text',
            text: `Failed to find definition: ${errorMessage}`
          }]
        };
      }
    }
  };
}