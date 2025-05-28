import { SourceKitLSPClient } from '../lsp-client.js';
import { URI } from 'vscode-uri';
import { promises as fs } from 'fs';

interface HoverArgs {
  file: string;
  line: number;
  column: number;
}

export function createHoverTool(lspClient: SourceKitLSPClient) {
  return {
    async execute(args: HoverArgs) {
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
        
        // Send hover request
        const result = await lspClient.hover(uri, lspLine, lspColumn);
        
        if (!result || !result.contents) {
          return {
            content: [{
              type: 'text',
              text: 'No type information available at this position'
            }]
          };
        }
        
        // Format the response
        let text = '';
        if (typeof result.contents === 'string') {
          text = result.contents;
        } else if ('kind' in result.contents) {
          // MarkupContent
          text = result.contents.value;
        } else if (Array.isArray(result.contents)) {
          // MarkedString[]
          text = result.contents.map(content => 
            typeof content === 'string' ? content : content.value
          ).join('\n');
        }
        
        return {
          content: [{
            type: 'text',
            text: text || 'No type information available'
          }]
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text',
            text: `Failed to get hover information: ${errorMessage}`
          }]
        };
      }
    }
  };
}