import { createApp } from './app.js';
import { env } from './config/env.js';
import { startBot } from './bot/telegram.js';

const app = createApp();
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 LayerSplit API Server                         ║
║                                                    ║
║   Port: ${PORT.toString().padEnd(42)}║
║   Network: ${env.SUI_NETWORK.padEnd(39)}║
║   Environment: ${env.NODE_ENV.padEnd(35)}║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);

    // Start Telegram bot in polling mode (dev)
    if (env.NODE_ENV !== 'production') {
        startBot();
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
