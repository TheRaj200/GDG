export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Server par koi apratyashit truti hui. Kripya punah prayas karein.';

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
  });
}
