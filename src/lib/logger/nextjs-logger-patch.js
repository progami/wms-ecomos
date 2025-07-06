// This file patches Next.js internal logging to capture all output
const Module = require('module');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');
const logStream = fs.createWriteStream(devLogPath, { flags: 'a' });

// Helper to write timestamped logs
function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  logStream.write(`${timestamp} [${level}] ${message}\n`);
}

// Patch require to intercept Next.js modules
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  const loadedModule = originalRequire.apply(this, arguments);
  
  // Patch Next.js server logger
  if (id.includes('next/dist/server/lib/logging')) {
    if (loadedModule.Log && loadedModule.Log.log) {
      const originalLog = module.Log.log;
      module.Log.log = function(...args) {
        const logData = args.map(arg => {
          if (typeof arg === 'object') {
            return util.inspect(arg, { depth: null, colors: false });
          }
          return String(arg);
        }).join(' ');
        writeLog('NEXT', logData);
        return originalLog.apply(this, args);
      };
    }
  }
  
  // Patch webpack logging
  if (id.includes('webpack') && module.webpack) {
    const originalWebpack = module.webpack;
    module.webpack = function(...args) {
      const compiler = originalWebpack.apply(this, args);
      
      if (compiler && compiler.hooks) {
        compiler.hooks.done.tap('DevLogger', (stats) => {
          const info = stats.toJson({
            errors: true,
            warnings: true,
            assets: false,
            modules: false,
          });
          
          if (info.errors.length > 0) {
            info.errors.forEach(error => {
              writeLog('WEBPACK-ERROR', error);
            });
          }
          
          if (info.warnings.length > 0) {
            info.warnings.forEach(warning => {
              writeLog('WEBPACK-WARN', warning);
            });
          }
        });
      }
      
      return compiler;
    };
  }
  
  return loadedModule;
};

// Also intercept debug module (used by many packages)
try {
  const debug = require('debug');
  const originalDebug = debug;
  
  // Override debug factory
  module.exports = function(namespace) {
    const debugInstance = originalDebug(namespace);
    
    return function(...args) {
      const message = util.format(...args);
      writeLog(`DEBUG:${namespace}`, message);
      return debugInstance(...args);
    };
  };
  
  // Copy properties from original debug
  Object.keys(originalDebug).forEach(key => {
    module.exports[key] = originalDebug[key];
  });
} catch (e) {
  // Debug module might not be available
}

writeLog('SYSTEM', 'Next.js logger patch installed');

module.exports = {
  writeLog,
  logStream
};