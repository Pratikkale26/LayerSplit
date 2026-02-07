import { z } from 'zod';

// Environment schema
const envSchema = z.object({
    // Server
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string(),

    // Sui
    SUI_NETWORK: z.enum(['testnet', 'devnet', 'mainnet']).default('testnet'),
    PACKAGE_ID: z.string(),
    // Telegram
    TELEGRAM_BOT_TOKEN: z.string(),
    TMA_URL: z.string().default('https://layersplit.vercel.app'),
});

// Parse and validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

// Contract constants
export const CONTRACT = {
    PACKAGE_ID: env.PACKAGE_ID,
    GRACE_PERIOD_MS: 259_200_000, // 3 days
    DAILY_INTEREST_BPS: 100, // 1% per day
    MAX_PARTICIPANTS: 20,
} as const;
