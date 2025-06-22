const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');
const logStream = fs.createWriteStream(devLogPath, { flags: 'a' });

// Request logging middleware
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();
  
  // Log request
  const requestLog = {
    timestamp,
    requestId,
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
  
  logStream.write(`${timestamp} [REQUEST] ${JSON.stringify(requestLog)}\n`);
  
  // Override res.end to capture response
  const originalEnd = res.end;
  const originalWrite = res.write;
  
  let responseBody = '';
  
  res.write = function(chunk) {
    if (chunk) {
      responseBody += chunk.toString();
    }
    originalWrite.apply(res, arguments);
  };
  
  res.end = function(chunk) {
    if (chunk) {
      responseBody += chunk.toString();
    }
    
    const duration = Date.now() - startTime;
    const responseLog = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentType: res.getHeader('content-type'),
      contentLength: res.getHeader('content-length') || responseBody.length
    };
    
    logStream.write(`${new Date().toISOString()} [RESPONSE] ${JSON.stringify(responseLog)}\n`);
    
    // Log response body for API routes (not for static files)
    if (req.url.startsWith('/api/') && responseBody && res.statusCode !== 304) {
      try {
        const bodyPreview = responseBody.substring(0, 1000);
        logStream.write(`${new Date().toISOString()} [RESPONSE-BODY] [${requestId}] ${bodyPreview}${responseBody.length > 1000 ? '...' : ''}\n`);
      } catch (e) {
        // Ignore errors in logging response body
      }
    }
    
    originalEnd.apply(res, arguments);
  };
  
  if (next) {
    next();
  }
}

module.exports = requestLogger;