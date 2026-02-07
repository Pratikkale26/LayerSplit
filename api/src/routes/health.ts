import { Router } from "express";
import type { Request, Response } from "express";
import type { ApiResponse } from "../types/index.js";

const router = Router();

// Health check endpoint
router.get("/", (_req: Request, res: Response<ApiResponse>) => {
    res.json({
        success: true,
        data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
        },
    });
});

export default router;
