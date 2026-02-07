import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';

// Custom error class
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Error handler middleware
export function errorHandler(
    err: Error,
    req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
) {
    console.error('Error:', err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
    }

    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            success: false,
            error: 'Database error',
        });
    }

    // Zod validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
        });
    }

    // Default error
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
}

// Not found handler
export function notFoundHandler(req: Request, res: Response<ApiResponse>) {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
    });
}
