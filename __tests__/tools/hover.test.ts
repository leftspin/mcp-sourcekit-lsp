import { createHoverTool } from '../../src/tools/hover';
import { SourceKitLSPClient } from '../../src/lsp-client';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));
jest.mock('../../src/lsp-client');

const mockFs = fs as jest.Mocked<typeof fs>;
const MockedLSPClient = SourceKitLSPClient as jest.MockedClass<typeof SourceKitLSPClient>;

describe('hover tool', () => {
  let mockLspClient: jest.Mocked<SourceKitLSPClient>;
  let hoverTool: ReturnType<typeof createHoverTool>;

  beforeEach(() => {
    mockLspClient = new MockedLSPClient() as jest.Mocked<SourceKitLSPClient>;
    hoverTool = createHoverTool(mockLspClient);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should return hover information for valid position', async () => {
    const filePath = '/test/file.swift';
    const fileContent = 'let x: String = "hello"';
    
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue(fileContent);
    mockLspClient.openFile.mockResolvedValue();
    mockLspClient.hover.mockResolvedValue({
      contents: {
        kind: 'markdown',
        value: '```swift\nlet x: String\n```'
      }
    });

    const result = await hoverTool.execute({
      file: filePath,
      line: 1,
      column: 5
    });

    expect(mockFs.promises.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    expect(mockLspClient.openFile).toHaveBeenCalledWith(
      'file:///test/file.swift',
      fileContent
    );
    expect(mockLspClient.hover).toHaveBeenCalledWith(
      'file:///test/file.swift',
      0, // converted to 0-based
      4  // converted to 0-based
    );
    
    expect(result.content[0]).toEqual({
      type: 'text',
      text: '```swift\nlet x: String\n```'
    });
  });

  it('should handle file not found error', async () => {
    const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    (mockFs.promises.readFile as jest.Mock).mockRejectedValue(error);

    const result = await hoverTool.execute({
      file: '/nonexistent/file.swift',
      line: 1,
      column: 1
    });

    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Failed to get hover information: File not found: /nonexistent/file.swift'
    });
  });

  it('should handle no hover information available', async () => {
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue('// empty file');
    mockLspClient.openFile.mockResolvedValue();
    mockLspClient.hover.mockResolvedValue(null);

    const result = await hoverTool.execute({
      file: '/test/empty.swift',
      line: 1,
      column: 1
    });

    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'No type information available at this position'
    });
  });

  it('should handle string contents format', async () => {
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue('let x = 42');
    mockLspClient.openFile.mockResolvedValue();
    mockLspClient.hover.mockResolvedValue({
      contents: 'let x: Int'
    });

    const result = await hoverTool.execute({
      file: '/test/file.swift',
      line: 1,
      column: 5
    });

    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'let x: Int'
    });
  });

  it('should handle array contents format', async () => {
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue('func test() {}');
    mockLspClient.openFile.mockResolvedValue();
    mockLspClient.hover.mockResolvedValue({
      contents: [
        'func test()',
        { language: 'swift', value: 'func test() -> Void' }
      ]
    });

    const result = await hoverTool.execute({
      file: '/test/file.swift',
      line: 1,
      column: 6
    });

    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'func test()\nfunc test() -> Void'
    });
  });
});