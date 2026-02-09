import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startBot } from "./bot/telegram";

const app = createApp();
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 LayerSplit API Server                         ║
║                                                    ║
║   Port: ${PORT.toString().padEnd(42)}║
║   Network: ${env.SUI_NETWORK.padEnd(39)}║
║   Environment: ${env.NODE_ENV.padEnd(35)}║
╚════════════════════════════════════════════════════╝
  `);

    // Start Telegram bot
    // Development: uses polling mode
    // Production: uses webhook mode (set via TMA_URL)
    startBot();
});
