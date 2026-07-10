class HttpError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.code = options.code || "ERROR";
    this.statusCode = options.statusCode || 500;
    this.details = options.details;
  }
}

function sendError(res, error) {
  const statusCode = error && error.statusCode ? error.statusCode : 500;
  res.status(statusCode).json({
    error: {
      code: error && error.code || "ERROR",
      message: error && error.message || "Unexpected error",
      details: error && error.details
    }
  });
}

module.exports = {
  HttpError,
  sendError
};
