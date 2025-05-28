import { SourceKitLSPClient } from '../lsp-client.js';
import { URI } from 'vscode-uri';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { promises as fs } from 'fs';

interface DiagnosticsArgs {
  file: string;
}

function severityToString(severity: DiagnosticSeverity): string {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return 'Error';
    case DiagnosticSeverity.Warning:
      return 'Warning';
    case DiagnosticSeverity.Information:
      return 'Info';
    case DiagnosticSeverity.Hint:
      return 'Hint';
    default:
      return 'Unknown';
  }
}

export function createDiagnosticsTool(lspClient: SourceKitLSPClient) {
  return {
    async execute(args: DiagnosticsArgs) {
      const { file } = args;
      
      // Convert to URI
      const uri = URI.file(file).toString();
      
      try {
        // Ensure file is open in LSP to trigger diagnostics
        try {
          const content = await fs.readFile(file, 'utf8');
          await lspClient.openFile(uri, content);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: ${file}`);
          }
          throw error;
        }
        
        // Give LSP a moment to process the file and send diagnostics
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get cached diagnostics (sent via publishDiagnostics notifications)
        const diagnostics = lspClient.getDiagnostics(uri);
        
        if (diagnostics.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No diagnostics (errors or warnings) found for this file'
            }]
          };
        }
        
        // Format the response
        const diagnosticLines = diagnostics.map((diagnostic: Diagnostic) => {
          const line = diagnostic.range.start.line + 1;  // Convert to 1-based
          const column = diagnostic.range.start.character + 1;
          const severity = severityToString(diagnostic.severity || DiagnosticSeverity.Error);
          const message = diagnostic.message;
          const source = diagnostic.source ? ` [${diagnostic.source}]` : '';
          
          return `${severity} at ${line}:${column}: ${message}${source}`;
        });
        
        // Group by severity
        const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        const warnings = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning);
        const others = diagnostics.filter(d => 
          d.severity !== DiagnosticSeverity.Error && 
          d.severity !== DiagnosticSeverity.Warning
        );
        
        let summary = '';
        if (errors.length > 0) summary += `${errors.length} error${errors.length === 1 ? '' : 's'}`;
        if (warnings.length > 0) {
          if (summary) summary += ', ';
          summary += `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;
        }
        if (others.length > 0) {
          if (summary) summary += ', ';
          summary += `${others.length} other${others.length === 1 ? '' : 's'}`;
        }
        
        const text = `Found ${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'} (${summary}):\n${diagnosticLines.map(line => `- ${line}`).join('\n')}`;
        
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
            text: `Failed to get diagnostics: ${errorMessage}`
          }]
        };
      }
    }
  };
}