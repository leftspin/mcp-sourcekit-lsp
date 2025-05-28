import { SourceKitLSPClient } from '../lsp-client.js';
import { SymbolInformation, SymbolKind } from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';

interface SymbolsArgs {
  query: string;
}

function symbolKindToString(kind: SymbolKind): string {
  const kindMap: Record<number, string> = {
    [SymbolKind.File]: 'File',
    [SymbolKind.Module]: 'Module',
    [SymbolKind.Namespace]: 'Namespace',
    [SymbolKind.Package]: 'Package',
    [SymbolKind.Class]: 'Class',
    [SymbolKind.Method]: 'Method',
    [SymbolKind.Property]: 'Property',
    [SymbolKind.Field]: 'Field',
    [SymbolKind.Constructor]: 'Constructor',
    [SymbolKind.Enum]: 'Enum',
    [SymbolKind.Interface]: 'Interface',
    [SymbolKind.Function]: 'Function',
    [SymbolKind.Variable]: 'Variable',
    [SymbolKind.Constant]: 'Constant',
    [SymbolKind.String]: 'String',
    [SymbolKind.Number]: 'Number',
    [SymbolKind.Boolean]: 'Boolean',
    [SymbolKind.Array]: 'Array',
    [SymbolKind.Object]: 'Object',
    [SymbolKind.Key]: 'Key',
    [SymbolKind.Null]: 'Null',
    [SymbolKind.EnumMember]: 'EnumMember',
    [SymbolKind.Struct]: 'Struct',
    [SymbolKind.Event]: 'Event',
    [SymbolKind.Operator]: 'Operator',
    [SymbolKind.TypeParameter]: 'TypeParameter'
  };
  
  return kindMap[kind] || 'Unknown';
}

export function createSymbolsTool(lspClient: SourceKitLSPClient) {
  return {
    async execute(args: SymbolsArgs) {
      const { query } = args;
      
      try {
        // Send workspace symbols request
        const result = await lspClient.workspaceSymbols(query);
        
        if (!result || result.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No symbols found matching "${query}"`
            }]
          };
        }
        
        // Format the response
        const symbols = result.map((symbol: SymbolInformation) => {
          const filePath = URI.parse(symbol.location.uri).fsPath;
          const line = symbol.location.range.start.line + 1;  // Convert to 1-based
          const kind = symbolKindToString(symbol.kind);
          
          let text = `${symbol.name} (${kind})`;
          if (symbol.containerName) {
            text += ` in ${symbol.containerName}`;
          }
          text += ` - ${filePath}:${line}`;
          
          return text;
        });
        
        const text = `Found ${symbols.length} symbol${symbols.length === 1 ? '' : 's'} matching "${query}":\n${symbols.map(sym => `- ${sym}`).join('\n')}`;
        
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
            text: `Failed to search symbols: ${errorMessage}`
          }]
        };
      }
    }
  };
}