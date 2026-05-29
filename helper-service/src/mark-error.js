class MarkError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MarkError";
    this.code = options.code || "MARK_ERROR";
    this.statusCode = options.statusCode || 400;
    this.details = options.details;
  }
}

module.exports = {
  MarkError
};

