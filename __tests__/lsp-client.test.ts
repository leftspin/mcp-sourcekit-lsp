import { SourceKitLSPClient } from '../src/lsp-client';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Create mock connection
const mockConnection = {
  listen: jest.fn(),
  sendRequest: jest.fn(),
  sendNotification: jest.fn(),
  onNotification: jest.fn(),
  dispose: jest.fn()
};

// Mock vscode-jsonrpc
jest.mock('vscode-jsonrpc/node', () => ({
  createMessageConnection: jest.fn(() => mockConnection),
  StreamMessageReader: jest.fn(),
  StreamMessageWriter: jest.fn()
}));

describe('SourceKitLSPClient', () => {
  let client: SourceKitLSPClient;
  let mockProcess: any;

  beforeEach(() => {
    client = new SourceKitLSPClient();
    
    // Create a mock process
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stdin = { write: jest.fn() };
    mockProcess.kill = jest.fn();
    
    mockSpawn.mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should spawn sourcekit-lsp process', async () => {
      mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
      
      await client.connect('/test/workspace');

      expect(mockSpawn).toHaveBeenCalledWith(
        'sourcekit-lsp',
        [],
        {
          cwd: '/test/workspace',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
    });

    it('should use custom LSP path from environment', async () => {
      process.env.SOURCEKIT_LSP_PATH = '/custom/path/sourcekit-lsp';
      mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
      
      await client.connect('/test/workspace');
      
      expect(mockSpawn).toHaveBeenCalledWith(
        '/custom/path/sourcekit-lsp',
        [],
        expect.any(Object)
      );
      
      delete process.env.SOURCEKIT_LSP_PATH;
    });

    it('should handle build arguments from environment', async () => {
      process.env.SOURCEKIT_BUILD_ARGS = '-Xswiftc -debug-info-format=dwarf';
      mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
      
      await client.connect('/test/workspace');
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'sourcekit-lsp',
        ['-Xswiftc', '-debug-info-format=dwarf'],
        expect.any(Object)
      );
      
      delete process.env.SOURCEKIT_BUILD_ARGS;
    });
  });

  describe('file management', () => {
    beforeEach(async () => {
      mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
      await client.connect('/test/workspace');
      // Clear mocks after connection setup
      jest.clearAllMocks();
    });

    it('should track opened files', async () => {
      const uri = 'file:///test/file.swift';
      const content = 'import Foundation';
      
      await client.openFile(uri, content);
      
      // Should not open the same file twice
      await client.openFile(uri, content);
      
      expect(mockConnection.sendNotification).toHaveBeenCalledTimes(1);
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'textDocument/didOpen',
        {
          textDocument: {
            uri,
            languageId: 'swift',
            version: 1,
            text: content
          }
        }
      );
    });
  });

  describe('LSP requests', () => {
    beforeEach(async () => {
      mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
      await client.connect('/test/workspace');
      jest.clearAllMocks();
    });

    it('should send hover requests', async () => {
      const hoverResult = { contents: 'Type: String' };
      mockConnection.sendRequest.mockResolvedValue(hoverResult);
      
      const result = await client.hover('file:///test.swift', 0, 5);
      
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'textDocument/hover',
        {
          textDocument: { uri: 'file:///test.swift' },
          position: { line: 0, character: 5 }
        }
      );
      expect(result).toBe(hoverResult);
    });

    it('should send definition requests', async () => {
      const defResult = { uri: 'file:///def.swift', range: {} };
      mockConnection.sendRequest.mockResolvedValue(defResult);
      
      const result = await client.definition('file:///test.swift', 0, 5);
      
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'textDocument/definition',
        {
          textDocument: { uri: 'file:///test.swift' },
          position: { line: 0, character: 5 }
        }
      );
      expect(result).toBe(defResult);
    });
  });
});