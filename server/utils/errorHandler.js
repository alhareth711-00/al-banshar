class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'حدث خطأ داخلي في الخادم';

  // Handle SQLite constraint errors nicely
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 400;
    message = 'القيمة المدخلة مسجلة مسبقاً ومكررة في النظام';
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    statusCode = 400;
    message = 'تعذر إتمام العملية بسبب عدم وجود السجل المرتبط في النظام';
  }

  console.error(`[Error] ${statusCode} - ${message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
};
