import { 
  createMessageConnection, 
  StreamMessageReader, 
  StreamMessageWriter,
  MessageConnection
} from 'vscode-jsonrpc/node';
import { spawn, ChildProcess } from 'child_process';
import { 
  Position,
  Hover,
  Location,
  SymbolInformation,
  Diagnostic
} from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';

export class SourceKitLSPClient {
  private connection!: MessageConnection;
  private process!: ChildProcess;
  private diagnosticsCache = new Map<string, Diagnostic[]>();
  private openFiles = new Map<string, { version: number; content: string }>();
  
  async connect(workspaceRoot: string): Promise<any> {
    // Find sourcekit-lsp binary
    const lspPath = process.env.SOURCEKIT_LSP_PATH || 'sourcekit-lsp';
    
    // Allow users to specify build configuration
    const buildArgs = process.env.SOURCEKIT_BUILD_ARGS?.split(' ') || [];
    
    // Spawn with proper arguments for build context
    this.process = spawn(lspPath, buildArgs, {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
    });
    
    // Handle process errors
    this.process.on('error', (error) => {
      console.error('Failed to start SourceKit-LSP:', error);
      throw error;
    });
    
    this.process.on('exit', (code) => {
      console.error(`SourceKit-LSP exited with code ${code}`);
      // Optionally restart or notify user
    });
    
    // Create message connection
    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('Failed to create process streams');
    }
    
    this.connection = createMessageConnection(
      new StreamMessageReader(this.process.stdout),
      new StreamMessageWriter(this.process.stdin)
    );
    
    // Listen for diagnostics
    this.connection.onNotification('textDocument/publishDiagnostics', (params: any) => {
      this.diagnosticsCache.set(params.uri, params.diagnostics);
    });
    
    // Start listening
    this.connection.listen();
    
    // Initialize sequence
    const initParams = {
      processId: process.pid,
      rootUri: URI.file(workspaceRoot).toString(),
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['plaintext', 'markdown'] },
          definition: { linkSupport: false },
          references: { dynamicRegistration: false }
        },
        workspace: {
          symbol: { dynamicRegistration: false }
        }
      },
      initializationOptions: {}
    };
    
    const initResult = await this.connection.sendRequest('initialize', initParams);
    
    // Send initialized notification (no need to await void)
    this.connection.sendNotification('initialized');
    
    return initResult;
  }
  
  async openFile(uri: string, content: string): Promise<void> {
    const existing = this.openFiles.get(uri);
    
    if (existing) {
      // Check if content has changed
      if (existing.content === content) {
        return; // Already open with same content
      }
      
      // Content changed, send update
      const newVersion = existing.version + 1;
      await this.updateFile(uri, content, newVersion);
      this.openFiles.set(uri, { version: newVersion, content });
      return;
    }
    
    // First time opening this file
    await this.connection.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: 'swift',
        version: 1,
        text: content
      }
    });
    
    this.openFiles.set(uri, { version: 1, content });
  }
  
  async updateFile(uri: string, content: string, version: number): Promise<void> {
    await this.connection.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text: content }]
    });
  }
  
  async closeFile(uri: string): Promise<void> {
    await this.connection.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    });
    
    this.openFiles.delete(uri);
  }
  
  getFileVersion(uri: string): number | null {
    const fileInfo = this.openFiles.get(uri);
    return fileInfo ? fileInfo.version : null;
  }
  
  async hover(uri: string, line: number, character: number): Promise<Hover | null> {
    return await this.connection.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    });
  }
  
  async definition(uri: string, line: number, character: number): Promise<Location | Location[] | null> {
    return await this.connection.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character }
    });
  }
  
  async references(uri: string, line: number, character: number, includeDeclaration: boolean = true): Promise<Location[] | null> {
    return await this.connection.sendRequest('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration }
    });
  }
  
  async workspaceSymbols(query: string): Promise<SymbolInformation[] | null> {
    return await this.connection.sendRequest('workspace/symbol', { query });
  }
  
  getDiagnostics(uri: string): Diagnostic[] {
    return this.diagnosticsCache.get(uri) || [];
  }
  
  async shutdown(): Promise<void> {
    await this.connection.sendRequest('shutdown');
    this.connection.sendNotification('exit');
    this.connection.dispose();
    this.process.kill();
  }
}