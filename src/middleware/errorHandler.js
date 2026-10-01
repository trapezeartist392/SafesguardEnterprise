const AppError = require('../utils/AppError');
const notFound = (req, res, next) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
const errorHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (!err.isOperational) console.error(err);
  res.status(statusCode).json({ success: false, message: err.message || 'Internal server error' });
};
module.exports = { notFound, errorHandler };
