"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
/**
 * Operational (expected) application error.
 * Throw this in controllers/services to surface a specific HTTP status.
 */
class AppError extends Error {
    statusCode;
    message;
    isOperational;
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global error handler middleware — MUST be registered last in app.ts.
 * Express identifies it as an error handler via the 4-argument signature.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, req, res, _next) {
    const errorWithCode = err;
    if (errorWithCode.type === 'entity.too.large' || errorWithCode.status === 413) {
        (0, response_1.sendError)(res, 'Request payload is too large', 413);
        return;
    }
    if (err instanceof SyntaxError && errorWithCode.status === 400) {
        (0, response_1.sendError)(res, 'Malformed JSON request body', 400);
        return;
    }
    if (errorWithCode.code === 'EBADCSRFTOKEN') {
        (0, response_1.sendError)(res, 'Invalid request security token', 403);
        return;
    }
    if (errorWithCode.status && errorWithCode.status >= 400 && errorWithCode.status < 500) {
        (0, response_1.sendError)(res, 'Request rejected', errorWithCode.status);
        return;
    }
    // Known operational errors — send the exact message to the client
    if (err instanceof AppError) {
        logger_1.logger.warn(`[AppError] ${err.statusCode} – ${err.message}`);
        (0, response_1.sendError)(res, err.message, err.statusCode);
        return;
    }
    // Unexpected programming errors — hide internals in production
    logger_1.logger.error('Unhandled error', {
        name: err.name,
        message: err.message,
        stack: env_1.isDev ? err.stack : '[hidden in production]',
        url: req.originalUrl,
        method: req.method,
    });
    (0, response_1.sendError)(res, env_1.isDev ? err.message : 'Internal server error', 500);
}
