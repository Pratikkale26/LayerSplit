import express from "express";
import type { Application } from "express";
import cors from "cors";
import helmet from "helmet";

// Routes
import healthRoutes from "./routes/health.js";
import userRoutes from "./routes/users";
import groupRoutes from "./routes/groups";
import billRoutes from "./routes/bills";
import paymentRoutes from "./routes/payments";

// Middleware
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { env } from "./config/env.js";

export function createApp(): Application {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(
        cors({
            origin: env.CORS_ORIGIN,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        })
    );

    // Body parsing
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging (development)
    if (env.NODE_ENV === "development") {
        app.use((req, _res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }

    // Routes
    app.use("/health", healthRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/groups", groupRoutes);
    app.use("/api/bills", billRoutes);
    app.use("/api/payments", paymentRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
