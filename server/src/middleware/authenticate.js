"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../lib/prisma");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
/**
 * Reusable authentication middleware.
 * - Reads `Authorization: Bearer <token>`
 * - Verifies the JWT and extracts `userId`
 * - Verifies user exists in database and is active
 * - Attaches user info to `req.user`
 * - Rejects invalid, expired, or missing tokens with 401 Unauthorized
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, response_1.sendError)(res, 'Authorization token missing or malformed', 401);
        return;
    }
    const token = authHeader.substring(7).trim();
    if (!token) {
        (0, response_1.sendError)(res, 'Authorization token missing', 401);
        return;
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            (0, response_1.sendError)(res, 'User not found or account is deactivated', 401);
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        };
        next();
    }
    catch (err) {
        logger_1.logger.warn('[Auth] Token verification failed', err);
        (0, response_1.sendError)(res, 'Invalid or expired authentication token', 401);
    }
}
