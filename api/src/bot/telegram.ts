import { Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { env } from '../config/env.js';
import prisma from '../db/client.js';

// Create bot instance
export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// /start command - Welcome message
bot.start(async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;

    if (!telegramId) return;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (existingUser) {
        await ctx.reply(
            `👋 Welcome back to LayerSplit!\n\n` +
            `💳 Wallet: \`${existingUser.walletAddress.slice(0, 8)}...${existingUser.walletAddress.slice(-6)}\`\n\n` +
            `Use /status to see your debts or /help for commands.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `🎉 Welcome to LayerSplit!\n\n` +
            `Split bills with friends on Sui blockchain with 365% APR interest on late payments 💰\n\n` +
            `👉 Connect your wallet to get started:`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔗 Connect Wallet', web_app: { url: `${env.TMA_URL}?start=link` } }
                    ]]
                }
            }
        );
    }
});

// /help command
bot.help(async (ctx) => {
    await ctx.reply(
        `📚 *LayerSplit Commands*\n\n` +
        `/start - Get started\n` +
        `/split <amount> <description> - Create equal split\n` +
        `/status - View your debts & receivables\n` +
        `/pay - Open app to pay debts\n` +
        `/help - Show this message\n\n` +
        `💡 Add me to a group to split bills with friends!`,
        { parse_mode: 'Markdown' }
    );
});

// /status command - Show user's debts
bot.command('status', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
        await ctx.reply('❌ Please connect your wallet first with /start');
        return;
    }

    // Get debts owed by user
    const debtsOwed = await prisma.debt.findMany({
        where: { debtorId: user.id, isSettled: false },
        include: { creditor: true, bill: true },
    });

    // Get debts owed to user
    const receivables = await prisma.debt.findMany({
        where: { creditorId: user.id, isSettled: false },
        include: { debtor: true, bill: true },
    });

    let message = `📊 *Your LayerSplit Status*\n\n`;

    // Debts owed
    if (debtsOwed.length > 0) {
        // @ts-ignore
        const totalOwed = debtsOwed.reduce((sum, d) => sum + (d.principalAmount - d.amountPaid), 0n);
        message += `💸 *You Owe:* ${formatSui(totalOwed)} SUI\n`;
        debtsOwed.slice(0, 3).forEach((d: any) => {
            const creditorName = d.creditor.username || `User ${d.creditor.telegramId}`;
            message += `  • ${formatSui(BigInt(d.principalAmount - d.amountPaid))} to @${creditorName}\n`;
        });
        if (debtsOwed.length > 3) message += `  _... and ${debtsOwed.length - 3} more_\n`;
    } else {
        message += `✅ *You Owe:* Nothing! You're debt-free 🎉\n`;
    }

    message += `\n`;

    // Receivables
    if (receivables.length > 0) {
        const totalReceivable = receivables.reduce((sum: any, d: any) => sum + (d.principalAmount - d.amountPaid), 0n);
        message += `💰 *Owed to You:* ${formatSui(totalReceivable)} SUI\n`;
        receivables.slice(0, 3).forEach((d: any) => {
            const debtorName = d.debtor.username || `User ${d.debtor.telegramId}`;
            message += `  • ${formatSui(BigInt(d.principalAmount - d.amountPaid))} from @${debtorName}\n`;
        });
        if (receivables.length > 3) message += `  _... and ${receivables.length - 3} more_\n`;
    } else {
        message += `📭 *Owed to You:* Nothing pending\n`;
    }

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '📱 Open App', web_app: { url: env.TMA_URL } }
            ]]
        }
    });
});

// /pay command - Open TMA to pay
bot.command('pay', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
        await ctx.reply('❌ Please connect your wallet first with /start');
        return;
    }

    await ctx.reply(
        `💳 *Pay Your Debts*\n\n` +
        `Open the app to view and pay your outstanding debts:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '💰 Pay Now', web_app: { url: `${env.TMA_URL}/pay` } }
                ]]
            }
        }
    );
});

// /split command - Create a bill (in groups)
bot.command('split', async (ctx) => {
    const telegramId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    if (!telegramId) return;

    // Check if in group
    if (chatType === 'private') {
        await ctx.reply(
            `👥 The /split command works best in groups!\n\n` +
            `Add me to a group and use:\n` +
            `/split <amount> <description>\n\n` +
            `Or open the app to create bills:`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '➕ Create Bill', web_app: { url: `${env.TMA_URL}/create` } }
                    ]]
                }
            }
        );
        return;
    }

    // Parse command: /split 100 Dinner
    const text = ctx.message?.text || '';
    const parts = text.split(' ').slice(1);

    if (parts.length < 2) {
        await ctx.reply(
            `📝 *Usage:* /split <amount> <description>\n\n` +
            `*Example:* /split 50 Dinner at restaurant`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const amount = parseFloat(parts[0]);
    const description = parts.slice(1).join(' ');

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a positive number.');
        return;
    }

    // Open TMA with prefilled data
    const params = new URLSearchParams({
        amount: amount.toString(),
        description,
        groupId: chatId?.toString() || '',
    });

    await ctx.reply(
        `💵 *Split Bill*\n\n` +
        `Amount: ${amount} SUI\n` +
        `Description: ${description}\n\n` +
        `Open the app to select participants and confirm:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Continue in App', web_app: { url: `${env.TMA_URL}/create?${params}` } }
                ]]
            }
        }
    );
});

// Helper: Format SUI amount (MIST to SUI)
function formatSui(mist: bigint): string {
    const sui = Number(mist) / 1_000_000_000;
    return sui.toFixed(2);
}

// Start bot
export function startBot() {
    bot.launch();
    console.log('🤖 Telegram bot started');

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Webhook handler for Express (production)
export function getBotWebhookCallback() {
    return bot.webhookCallback('/api/telegram/webhook');
}
