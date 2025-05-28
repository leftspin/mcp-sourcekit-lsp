import { SourceKitLSPClient } from '../lsp-client.js';
import { URI } from 'vscode-uri';
import { Location } from 'vscode-languageserver-types';
import { promises as fs } from 'fs';

interface ReferencesArgs {
  file: string;
  line: number;
  column: number;
  includeDeclaration?: boolean;
}

export function createReferencesTool(lspClient: SourceKitLSPClient) {
  return {
    async execute(args: ReferencesArgs) {
      const { file, line, column, includeDeclaration = true } = args;
      
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
        
        // Send references request
        const result = await lspClient.references(uri, lspLine, lspColumn, includeDeclaration);
        
        if (!result || result.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No references found for this symbol'
            }]
          };
        }
        
        // Format the response
        const references = result.map((location: Location) => {
          const filePath = URI.parse(location.uri).fsPath;
          const startLine = location.range.start.line + 1;  // Convert back to 1-based
          const startChar = location.range.start.character + 1;
          
          return `${filePath}:${startLine}:${startChar}`;
        });
        
        const text = `Found ${references.length} reference${references.length === 1 ? '' : 's'}:\n${references.map(ref => `- ${ref}`).join('\n')}`;
        
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
            text: `Failed to find references: ${errorMessage}`
          }]
        };
      }
    }
  };
}