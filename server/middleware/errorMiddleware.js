const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging on server
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    return res.status(404).json({
      success: false,
      message,
    });
  }

  // Mongoose Duplicate Key (Code 11000)
  if (err.code === 11000) {
    let field = 'entry';
    let val = '';
    if (err.keyValue) {
      const keys = Object.keys(err.keyValue);
      if (keys.length > 0) {
        field = keys[0];
        val = err.keyValue[field];
      }
    } else if (err.keyPattern) {
      const keys = Object.keys(err.keyPattern);
      if (keys.length > 0) {
        field = keys[0];
      }
    }
    const message = `An account with this ${field}${val ? ` "${val}"` : ''} already exists. Please choose another.`;
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((val) => val.message)
      .filter(Boolean)
      .join('. ') || err.message;
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // Database Connection Issues
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    (err.message && err.message.includes('ECONNREFUSED'))
  ) {
    return res.status(503).json({
      success: false,
      message: 'Database connection offline. Please ensure MongoDB service is running (net start MongoDB).',
    });
  }

  // Multer Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum video size is 100MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session has expired. Please log in again.',
    });
  }

  // Default response
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred. Please try again.',
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found - ${req.originalUrl}`,
  });
};

module.exports = {
  errorHandler,
  notFound,
};
