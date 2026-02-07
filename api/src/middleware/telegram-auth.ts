import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from './error.js';

// Telegram WebApp data interface
interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramAuthData {
    user: TelegramUser;
    auth_date: number;
    hash: string;
}

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            telegramUser?: TelegramUser;
        }
    }
}

/**
 * Validate Telegram Mini App initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramAuth(initData: string): TelegramAuthData | null {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return null;

        // Remove hash from params
        params.delete('hash');

        // Sort and create data check string
        const dataCheckArr: string[] = [];
        params.forEach((value, key) => {
            dataCheckArr.push(`${key}=${value}`);
        });
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // Create secret key
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(env.TELEGRAM_BOT_TOKEN)
            .digest();

        // Calculate hash
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Verify hash
        if (calculatedHash !== hash) {
            return null;
        }

        // Parse user data
        const userStr = params.get('user');
        if (!userStr) return null;

        const user = JSON.parse(userStr) as TelegramUser;
        const authDate = parseInt(params.get('auth_date') || '0', 10);

        // Check if data is not too old (1 hour)
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 3600) {
            return null;
        }

        return { user, auth_date: authDate, hash };
    } catch {
        return null;
    }
}

/**
 * Middleware to validate Telegram Mini App requests
 * Expects initData in Authorization header or query param
 */
export function telegramAuth(req: Request, res: Response, next: NextFunction) {
    // Get initData from header or query
    const authHeader = req.headers.authorization;
    const initData = authHeader?.replace('tma ', '') || (req.query.initData as string);

    if (!initData) {
        throw new AppError('Telegram authentication required', 401);
    }

    const authData = validateTelegramAuth(initData);
    if (!authData) {
        throw new AppError('Invalid Telegram authentication', 401);
    }

    // Attach user to request
    req.telegramUser = authData.user;
    next();
}

/**
 * Optional Telegram auth - doesn't throw if missing
 */
export function optionalTelegramAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const initData = authHeader?.replace('tma ', '') || (req.query.initData as string);

    if (initData) {
        const authData = validateTelegramAuth(initData);
        if (authData) {
            req.telegramUser = authData.user;
        }
    }

    next();
}
