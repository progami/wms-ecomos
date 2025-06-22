import crypto from 'crypto';
import { sanitizeFilename } from './input-sanitization';

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedMimeTypes?: string[];
  scanForMacros?: boolean;
  checkMagicNumbers?: boolean;
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeMB: 10,
  allowedTypes: ['.xlsx', '.xls', '.csv'],
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ],
  scanForMacros: true,
  checkMagicNumbers: true
};

// Magic numbers for file type detection
const MAGIC_NUMBERS = {
  xlsx: [0x50, 0x4B, 0x03, 0x04], // ZIP format (XLSX)
  xls: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE format
  csv: [], // Text file, no specific magic number
  exe: [0x4D, 0x5A], // MZ header
  script: [0x23, 0x21], // Shebang #!
};

export async function validateFile(
  file: File | Buffer,
  filename: string,
  options: FileValidationOptions = {}
): Promise<{ valid: boolean; error?: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Sanitize filename
  const cleanFilename = sanitizeFilename(filename);
  if (cleanFilename !== filename) {
    return { valid: false, error: 'Invalid filename' };
  }

  // Check file extension
  const ext = filename.toLowerCase().split('.').pop();
  if (!ext || !opts.allowedTypes?.includes(`.${ext}`)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check file size
  const size = file instanceof File ? file.size : file.length;
  if (size > (opts.maxSizeMB! * 1024 * 1024)) {
    return { valid: false, error: `File too large (max ${opts.maxSizeMB}MB)` };
  }

  // Check MIME type
  if (file instanceof File && opts.allowedMimeTypes) {
    if (!opts.allowedMimeTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid MIME type' };
    }
  }

  // Check magic numbers
  if (opts.checkMagicNumbers) {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;
    
    if (!checkMagicNumbers(buffer, ext)) {
      return { valid: false, error: 'File content does not match extension' };
    }
  }

  // Check for macros in Excel files
  if (opts.scanForMacros && (ext === 'xlsx' || ext === 'xlsm' || ext === 'xls')) {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;
    
    if (containsMacros(buffer)) {
      return { valid: false, error: 'File contains macros' };
    }
  }

  // Check for zip bombs
  if (ext === 'xlsx') {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;
    
    if (await isZipBomb(buffer)) {
      return { valid: false, error: 'Suspicious compression ratio detected' };
    }
  }

  return { valid: true };
}

function checkMagicNumbers(buffer: Buffer, extension: string): boolean {
  const expectedMagic = MAGIC_NUMBERS[extension as keyof typeof MAGIC_NUMBERS];
  
  if (!expectedMagic || expectedMagic.length === 0) {
    return true; // No magic number to check (e.g., CSV)
  }

  // Check if file starts with expected magic number
  for (let i = 0; i < expectedMagic.length; i++) {
    if (buffer[i] !== expectedMagic[i]) {
      // Special case: XLSX files are ZIP files
      if (extension === 'xlsx') {
        return checkMagicNumbers(buffer, 'zip');
      }
      return false;
    }
  }

  // Check for executable magic numbers
  const exeMagic = MAGIC_NUMBERS.exe;
  const scriptMagic = MAGIC_NUMBERS.script;
  
  if (buffer.length >= exeMagic.length) {
    const isExe = exeMagic.every((byte, i) => buffer[i] === byte);
    if (isExe) return false;
  }
  
  if (buffer.length >= scriptMagic.length) {
    const isScript = scriptMagic.every((byte, i) => buffer[i] === byte);
    if (isScript) return false;
  }

  return true;
}

function containsMacros(buffer: Buffer): boolean {
  // Check for VBA project signature
  const vbaSignature = Buffer.from('vbaProject.bin');
  if (buffer.includes(vbaSignature)) {
    return true;
  }

  // Check for macro-enabled Excel signature
  const macroSignatures = [
    Buffer.from('Attribute VB_Name'),
    Buffer.from('_VBA_PROJECT'),
    Buffer.from('ThisWorkbook'),
    Buffer.from('Sheet1')
  ];

  return macroSignatures.some(sig => buffer.includes(sig));
}

async function isZipBomb(buffer: Buffer): Promise<boolean> {
  // Simple heuristic: Check compression ratio
  // Real implementation would need to parse ZIP structure
  
  try {
    // For XLSX files, check if it's suspiciously small
    if (buffer.length < 1000) {
      // Very small XLSX files might be zip bombs
      return true;
    }

    // Check for repeated patterns that compress too well
    const sample = buffer.slice(0, 1000);
    const compressed = zlib.gzipSync(sample);
    const ratio = sample.length / compressed.length;
    
    return ratio > 100; // Suspicious compression ratio
  } catch {
    return false;
  }
}

export function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  const baseName = originalName.split('.')[0].substring(0, 50); // Limit length
  
  const safeName = sanitizeFilename(baseName);
  return `${safeName}_${timestamp}_${randomStr}.${ext}`;
}

export function detectPolyglot(buffer: Buffer): boolean {
  // Check for multiple file format signatures
  const signatures = [
    { name: 'jpeg', magic: [0xFF, 0xD8, 0xFF] },
    { name: 'png', magic: [0x89, 0x50, 0x4E, 0x47] },
    { name: 'gif', magic: [0x47, 0x49, 0x46] },
    { name: 'zip', magic: [0x50, 0x4B, 0x03, 0x04] },
    { name: 'pdf', magic: [0x25, 0x50, 0x44, 0x46] }
  ];

  let matchCount = 0;
  
  for (const sig of signatures) {
    // Check at different positions in the file
    for (let offset = 0; offset < Math.min(buffer.length - sig.magic.length, 1000); offset++) {
      const matches = sig.magic.every((byte, i) => buffer[offset + i] === byte);
      if (matches) {
        matchCount++;
        if (matchCount > 1) {
          return true; // Multiple format signatures found
        }
      }
    }
  }

  return false;
}

export async function scanFileContent(
  buffer: Buffer,
  filename: string
): Promise<{ safe: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /<script/i, message: 'Contains script tags' },
    { pattern: /javascript:/i, message: 'Contains javascript protocol' },
    { pattern: /vbscript:/i, message: 'Contains vbscript protocol' },
    { pattern: /on\w+\s*=/i, message: 'Contains event handlers' },
    { pattern: /eval\s*\(/i, message: 'Contains eval function' },
    { pattern: /document\.write/i, message: 'Contains document.write' },
    { pattern: /\.exe|\.bat|\.cmd|\.com|\.pif|\.scr/i, message: 'References executable files' }
  ];

  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
  
  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(text)) {
      warnings.push(message);
    }
  }

  return {
    safe: warnings.length === 0,
    warnings
  };
}

// Import required at the top
import * as zlib from 'zlib';