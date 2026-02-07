import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import type { ApiResponse } from "../types/index.js";

// Custom error class
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
    } satisfies ApiResponse);
};

// Error handler
export const errorHandler: ErrorRequestHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
) => {
    console.error(`[ERROR] ${err.message}`);

    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
        success: false,
        error: message,
    });
};
