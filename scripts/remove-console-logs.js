const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to search for files
const filePatterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  '!src/**/*.test.ts',
  '!src/**/*.test.tsx',
  '!src/**/test-*.ts',
  '!src/scripts/**',
  '!node_modules/**'
];

// Files to exclude from console.log removal
const excludeFiles = [
  'src/lib/logger',
  'src/app/api/test/logging',
  'src/lib/setup-logging.js',
  'server.js'
];

function shouldProcessFile(filePath) {
  return !excludeFiles.some(exclude => filePath.includes(exclude));
}

function removeConsoleLogs(content, filePath) {
  let modified = false;
  let lines = content.split('\n');
  
  const processedLines = lines.map((line, index) => {
    // Skip if line is in a comment
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return line;
    }
    
    // Replace console.log with logger calls where appropriate
    if (line.includes('console.log') && !line.includes('// console.log')) {
      modified = true;
      
      // If it's an error context, replace with error logger
      if (line.toLowerCase().includes('error') || lines[index - 1]?.includes('catch')) {
        return line.replace(/console\.log/g, '// console.log');
      }
      
      // For middleware.ts, keep critical security logs
      if (filePath.includes('middleware.ts') && line.includes('Unauthorized access')) {
        return line.replace('console.log', 'console.error');
      }
      
      // Otherwise comment out
      return line.replace(/console\.log/g, '// console.log');
    }
    
    // Also handle console.error, console.warn, etc. in production code
    if (line.includes('console.') && !line.includes('// console.')) {
      const consoleTypes = ['error', 'warn', 'info', 'debug', 'trace'];
      for (const type of consoleTypes) {
        if (line.includes(`console.${type}`)) {
          // Keep console.error in middleware for security
          if (type === 'error' && filePath.includes('middleware.ts')) {
            return line;
          }
          modified = true;
          return line.replace(new RegExp(`console\\.${type}`, 'g'), `// console.${type}`);
        }
      }
    }
    
    return line;
  });
  
  return {
    content: processedLines.join('\n'),
    modified
  };
}

async function processFiles() {
  console.log('🔍 Searching for console.log statements...\n');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  let totalConsoleLogs = 0;
  
  for (const pattern of filePatterns) {
    const files = glob.sync(pattern, { absolute: true });
    
    for (const file of files) {
      if (!shouldProcessFile(file)) {
        continue;
      }
      
      totalFiles++;
      const content = fs.readFileSync(file, 'utf8');
      const { content: newContent, modified } = removeConsoleLogs(content, file);
      
      if (modified) {
        modifiedFiles++;
        const logCount = (content.match(/console\./g) || []).length;
        totalConsoleLogs += logCount;
        
        fs.writeFileSync(file, newContent);
        console.log(`✓ Modified: ${path.relative(process.cwd(), file)} (${logCount} console statements)`);
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Console statements removed: ${totalConsoleLogs}`);
  console.log('\n✅ Console.log removal complete!');
}

processFiles().catch(console.error);