import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();

// File system utilities
class FileSystemManager {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedExtensions: Set<string>;

  constructor(
    uploadDir = '/tmp/test-uploads',
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedExtensions = new Set(['.pdf', '.xlsx', '.csv', '.jpg', '.png'])
  ) {
    this.uploadDir = uploadDir;
    this.maxFileSize = maxFileSize;
    this.allowedExtensions = allowedExtensions;
  }

  async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async saveFile(filename: string, content: Buffer | Readable): Promise<string> {
    await this.ensureUploadDir();
    
    const sanitizedFilename = this.sanitizeFilename(filename);
    const filepath = path.join(this.uploadDir, sanitizedFilename);

    // Check file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    if (!this.allowedExtensions.has(ext)) {
      throw new Error(`File type ${ext} not allowed`);
    }

    // Save file with size check
    if (Buffer.isBuffer(content)) {
      if (content.length > this.maxFileSize) {
        throw new Error('File size exceeds maximum allowed');
      }
      await fs.writeFile(filepath, content);
    } else {
      // Stream with size monitoring
      let size = 0;
      const writeStream = (await import('fs')).createWriteStream(filepath);
      
      content.on('data', (chunk) => {
        size += chunk.length;
        if (size > this.maxFileSize) {
          writeStream.destroy();
          throw new Error('File size exceeds maximum allowed');
        }
      });

      await pipeline(content, writeStream);
    }

    return filepath;
  }

  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[\/\\\.]+/g, '_');
    
    // Remove special characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    
    // Ensure unique filename
    const timestamp = Date.now();
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext);
    
    return `${base}_${timestamp}${ext}`;
  }

  async deleteFile(filepath: string): Promise<void> {
    // Ensure file is within upload directory
    const normalizedPath = path.normalize(filepath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new Error('Invalid file path');
    }

    await fs.unlink(filepath);
  }

  async getFileInfo(filepath: string): Promise<any> {
    const stats = await fs.stat(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      permissions: stats.mode
    };
  }
}

describe('File System Error Scenarios', () => {
  let fileManager: FileSystemManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = `/tmp/test-edge-cases-${Date.now()}`;
    fileManager = new FileSystemManager(testDir);
    await fileManager.ensureUploadDir();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  test('Handle disk space exhaustion', async () => {
    // Mock file write to simulate disk full
    const originalWriteFile = fs.writeFile;
    let writeAttempts = 0;

    fs.writeFile = jest.fn(async (path, data) => {
      writeAttempts++;
      if (writeAttempts > 2) {
        const error: any = new Error('ENOSPC: no space left on device');
        error.code = 'ENOSPC';
        throw error;
      }
      return originalWriteFile(path as any, data);
    });

    // Attempt to save files
    const files = ['file1.pdf', 'file2.pdf', 'file3.pdf'];
    const results = [];

    for (const filename of files) {
      try {
        const filepath = await fileManager.saveFile(
          filename, 
          Buffer.from('test content')
        );
        results.push({ success: true, filepath });
      } catch (error: any) {
        results.push({ success: false, error: error.code });
      }
    }

    expect(results.filter(r => r.success).length).toBe(2);
    expect(results.filter(r => !r.success && r.error === 'ENOSPC').length).toBe(1);

    // Restore original function
    fs.writeFile = originalWriteFile;
  });

  test('Handle permission errors', async () => {
    const restrictedDir = '/tmp/restricted-test';
    
    try {
      // Create directory with restricted permissions
      await fs.mkdir(restrictedDir, { mode: 0o444 }); // Read-only

      const restrictedManager = new FileSystemManager(restrictedDir);
      
      // Attempt to save file should fail
      await expect(
        restrictedManager.saveFile('test.pdf', Buffer.from('content'))
      ).rejects.toThrow();

    } finally {
      // Cleanup with elevated permissions
      await fs.chmod(restrictedDir, 0o755).catch(() => {});
      await fs.rmdir(restrictedDir).catch(() => {});
    }
  });

  test('Handle corrupted file operations', async () => {
    const corruptedFile = path.join(testDir, 'corrupted.pdf');
    
    // Create a file with corrupted content
    await fs.writeFile(corruptedFile, Buffer.from([0xFF, 0xFE, 0x00, 0x00]));

    // Implement file validation
    const validatePDF = async (filepath: string): Promise<boolean> => {
      try {
        const buffer = await fs.readFile(filepath);
        // Check PDF magic number
        return buffer.length > 4 && 
               buffer[0] === 0x25 && 
               buffer[1] === 0x50 && 
               buffer[2] === 0x44 && 
               buffer[3] === 0x46; // %PDF
      } catch (error) {
        return false;
      }
    };

    const isValid = await validatePDF(corruptedFile);
    expect(isValid).toBe(false);

    // Test with valid PDF header
    const validPDF = path.join(testDir, 'valid.pdf');
    await fs.writeFile(validPDF, Buffer.from('%PDF-1.4\n'));
    
    const isValidPDF = await validatePDF(validPDF);
    expect(isValidPDF).toBe(true);
  });

  test('Handle concurrent file access', async () => {
    const sharedFile = path.join(testDir, 'shared.txt');
    await fs.writeFile(sharedFile, 'initial content');

    // Simulate concurrent read/write operations
    const operations = Array(10).fill(null).map(async (_, index) => {
      const isWrite = index % 2 === 0;
      
      try {
        if (isWrite) {
          // Attempt to write
          await fs.writeFile(sharedFile, `Write ${index}`, { flag: 'w' });
          return { type: 'write', index, success: true };
        } else {
          // Attempt to read
          const content = await fs.readFile(sharedFile, 'utf-8');
          return { type: 'read', index, success: true, content };
        }
      } catch (error) {
        return { type: isWrite ? 'write' : 'read', index, success: false, error };
      }
    });

    const results = await Promise.allSettled(operations);
    
    // All operations should complete (Node.js handles concurrency)
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    );
    expect(successful.length).toBeGreaterThan(0);
  });

  test('Handle file locking scenarios', async () => {
    class FileLocker {
      private locks: Map<string, boolean> = new Map();

      async acquireLock(filepath: string, timeout = 5000): Promise<boolean> {
        const lockFile = `${filepath}.lock`;
        const startTime = Date.now();

        while (this.locks.get(filepath)) {
          if (Date.now() - startTime > timeout) {
            return false; // Timeout
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.locks.set(filepath, true);
        
        try {
          // Create lock file
          await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
          return true;
        } catch (error: any) {
          if (error.code === 'EEXIST') {
            // Lock file already exists
            this.locks.delete(filepath);
            return false;
          }
          throw error;
        }
      }

      async releaseLock(filepath: string): Promise<void> {
        const lockFile = `${filepath}.lock`;
        this.locks.delete(filepath);
        
        try {
          await fs.unlink(lockFile);
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      async withLock<T>(
        filepath: string, 
        operation: () => Promise<T>
      ): Promise<T> {
        const acquired = await this.acquireLock(filepath);
        if (!acquired) {
          throw new Error('Failed to acquire lock');
        }

        try {
          return await operation();
        } finally {
          await this.releaseLock(filepath);
        }
      }
    }

    const locker = new FileLocker();
    const testFile = path.join(testDir, 'locked-file.txt');

    // Test exclusive access
    const results = await Promise.allSettled([
      locker.withLock(testFile, async () => {
        await fs.writeFile(testFile, 'Process 1');
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Process 1 done';
      }),
      locker.withLock(testFile, async () => {
        await fs.writeFile(testFile, 'Process 2');
        return 'Process 2 done';
      })
    ]);

    // Both should eventually succeed
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  test('Handle symbolic link and path traversal attacks', async () => {
    const safeFile = path.join(testDir, 'safe.txt');
    await fs.writeFile(safeFile, 'safe content');

    // Attempt path traversal
    const maliciousFilenames = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'subfolder/../../../sensitive.txt',
      './././../../../etc/shadow'
    ];

    for (const filename of maliciousFilenames) {
      const sanitized = fileManager.sanitizeFilename(filename);
      
      // Should not contain path traversal sequences
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    }

    // Test symlink handling
    const symlinkPath = path.join(testDir, 'symlink.txt');
    
    try {
      await fs.symlink('/etc/passwd', symlinkPath);
      
      // Should detect and reject symlinks
      const stats = await fs.lstat(symlinkPath);
      expect(stats.isSymbolicLink()).toBe(true);
      
      // Safe file operations should check for symlinks
      const safeReadFile = async (filepath: string): Promise<Buffer> => {
        const stats = await fs.lstat(filepath);
        if (stats.isSymbolicLink()) {
          throw new Error('Symbolic links not allowed');
        }
        return fs.readFile(filepath);
      };

      await expect(safeReadFile(symlinkPath)).rejects.toThrow('Symbolic links not allowed');
    } catch (error: any) {
      // Symlink creation might fail on some systems
      if (error.code !== 'EPERM') {
        throw error;
      }
    }
  });

  test('Handle file system watchers and cleanup', async () => {
    const watchedFile = path.join(testDir, 'watched.txt');
    await fs.writeFile(watchedFile, 'initial');

    const fsModule = await import('fs');
    const watchers: Array<import('fs').FSWatcher> = [];

    try {
      // Create multiple watchers
      for (let i = 0; i < 5; i++) {
        const watcher = fsModule.watch(watchedFile, (eventType, filename) => {
          console.log(`Watcher ${i}: ${eventType} on ${filename}`);
        });
        watchers.push(watcher);
      }

      // Make changes to trigger watchers
      await fs.writeFile(watchedFile, 'modified');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify watchers are active
      expect(watchers.length).toBe(5);

    } finally {
      // Clean up watchers to prevent resource leaks
      watchers.forEach(watcher => watcher.close());
    }
  });

  test('Handle file upload chunking and resumption', async () => {
    class ChunkedUploadManager {
      private chunks: Map<string, Buffer[]> = new Map();

      async uploadChunk(
        uploadId: string, 
        chunkIndex: number, 
        data: Buffer,
        totalChunks: number
      ): Promise<{ complete: boolean; filepath?: string }> {
        const key = uploadId;
        
        if (!this.chunks.has(key)) {
          this.chunks.set(key, new Array(totalChunks));
        }

        const chunks = this.chunks.get(key)!;
        chunks[chunkIndex] = data;

        // Check if all chunks received
        const complete = chunks.every(chunk => chunk !== undefined);

        if (complete) {
          // Combine chunks and save file
          const fullData = Buffer.concat(chunks);
          const filepath = await fileManager.saveFile(
            `upload_${uploadId}.pdf`,
            fullData
          );
          
          // Clean up chunks
          this.chunks.delete(key);
          
          return { complete: true, filepath };
        }

        return { complete: false };
      }

      getUploadProgress(uploadId: string, totalChunks: number): number {
        const chunks = this.chunks.get(uploadId);
        if (!chunks) return 0;
        
        const received = chunks.filter(c => c !== undefined).length;
        return (received / totalChunks) * 100;
      }

      async cancelUpload(uploadId: string): Promise<void> {
        this.chunks.delete(uploadId);
      }
    }

    const uploadManager = new ChunkedUploadManager();
    const uploadId = 'test-upload-123';
    const chunkSize = 1024;
    const totalSize = 5 * chunkSize;
    const totalChunks = 5;

    // Simulate chunked upload with one failed chunk
    const results = [];
    
    for (let i = 0; i < totalChunks; i++) {
      // Skip chunk 2 to simulate failure
      if (i === 2) continue;
      
      const chunk = Buffer.alloc(chunkSize, i);
      const result = await uploadManager.uploadChunk(
        uploadId,
        i,
        chunk,
        totalChunks
      );
      results.push(result);
    }

    // Upload should not be complete
    expect(results.every(r => !r.complete)).toBe(true);
    
    // Check progress
    const progress = uploadManager.getUploadProgress(uploadId, totalChunks);
    expect(progress).toBe(80); // 4 out of 5 chunks

    // Upload missing chunk
    const missingChunk = Buffer.alloc(chunkSize, 2);
    const finalResult = await uploadManager.uploadChunk(
      uploadId,
      2,
      missingChunk,
      totalChunks
    );

    expect(finalResult.complete).toBe(true);
    expect(finalResult.filepath).toBeDefined();
  });
});