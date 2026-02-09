import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
    PORT: z.string().default("3000"),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    DATABASE_URL: z.string(),
    SUI_NETWORK: z.enum(["testnet", "mainnet", "devnet"]).default("testnet"),
    PACKAGE_ID: z.string(),
    CORS_ORIGIN: z.string().default("*"),
    TELEGRAM_BOT_TOKEN: z.string(),
    TMA_URL: z.string().default("https://artistic-marcelene-parodiable.ngrok-free.dev"),
});

export const env = envSchema.parse(process.env);
