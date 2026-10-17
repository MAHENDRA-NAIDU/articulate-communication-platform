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

  // Multer & File Upload Filter Errors
  if (
    err.name === 'MulterError' ||
    (err.message &&
      (err.message.includes('Invalid file type') ||
        err.message.includes('MIME type') ||
        err.message.includes('file format')))
  ) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = process.env.MAX_VIDEO_SIZE_MB || 2048;
      return res.status(400).json({
        success: false,
        message: `File is too large. Maximum allowed video upload size is ${maxMb}MB (${(maxMb / 1024).toFixed(1)}GB).`,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
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

  // Default response (sanitizes internal errors in production to prevent information disclosure)
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';
  const defaultMsg =
    isProd && statusCode === 500
      ? 'An unexpected server error occurred. Please try again later.'
      : err.message || 'An unexpected server error occurred. Please try again.';

  return res.status(statusCode).json({
    success: false,
    message: defaultMsg,
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
