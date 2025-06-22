const fs = require('fs');
const path = require('path');
const util = require('util');

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
};

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for logs/dev.log
const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');
const logStream = fs.createWriteStream(devLogPath, { flags: 'a' });

// Helper function to format log messages
function formatLogMessage(level, args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return util.inspect(arg, { depth: null, colors: false });
    }
    return String(arg);
  }).join(' ');
  
  return `${timestamp} [${level.toUpperCase()}]: ${formattedArgs}\n`;
}

// Helper function to write to both console and file
function createLogFunction(level, originalMethod) {
  return function(...args) {
    // Write to original console
    originalMethod.apply(console, args);
    
    // Write to dev.log file
    const logMessage = formatLogMessage(level, args);
    logStream.write(logMessage);
  };
}

// Override console methods
function overrideConsoleMethods() {
  console.log = createLogFunction('log', originalConsole.log);
  console.error = createLogFunction('error', originalConsole.error);
  console.warn = createLogFunction('warn', originalConsole.warn);
  console.info = createLogFunction('info', originalConsole.info);
  console.debug = createLogFunction('debug', originalConsole.debug);
  console.trace = createLogFunction('trace', originalConsole.trace);

  // Also capture stdout and stderr writes
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = function(chunk, encoding, callback) {
    if (chunk && chunk.toString) {
      const message = chunk.toString();
      if (message.trim()) {
        const timestamp = new Date().toISOString();
        logStream.write(`${timestamp} [STDOUT]: ${message}`);
      }
    }
    return originalStdoutWrite.apply(process.stdout, arguments);
  };

  process.stderr.write = function(chunk, encoding, callback) {
    if (chunk && chunk.toString) {
      const message = chunk.toString();
      if (message.trim()) {
        const timestamp = new Date().toISOString();
        logStream.write(`${timestamp} [STDERR]: ${message}`);
      }
    }
    return originalStderrWrite.apply(process.stderr, arguments);
  };

  // Log that console override is active
  const timestamp = new Date().toISOString();
  logStream.write(`\n${timestamp} [SYSTEM]: Console override initialized - All console output will be captured in logs/dev.log\n`);
  logStream.write(`${timestamp} [SYSTEM]: Process ID: ${process.pid}\n`);
  logStream.write(`${timestamp} [SYSTEM]: Node Version: ${process.version}\n`);
  logStream.write(`${timestamp} [SYSTEM]: Working Directory: ${process.cwd()}\n\n`);
}

// Ensure log stream is flushed on exit
process.on('exit', () => {
  logStream.end();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const timestamp = new Date().toISOString();
  logStream.write(`${timestamp} [UNCAUGHT_EXCEPTION]: ${error.stack || error}\n`);
  logStream.end(() => {
    process.exit(1);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();
  logStream.write(`${timestamp} [UNHANDLED_REJECTION]: ${reason}\n`);
});

module.exports = {
  overrideConsoleMethods,
  originalConsole,
  logStream
};