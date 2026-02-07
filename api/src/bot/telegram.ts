import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";

// Create bot instance
export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// Format SUI amount
function formatSui(mist: bigint): string {
    const sui = Number(mist) / 1_000_000_000;
    return sui.toFixed(4);
}

// /start command
bot.start(async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;

    if (!telegramId) return;

    const existingUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (existingUser) {
        await ctx.reply(
            `👋 Welcome back to LayerSplit!\n\n` +
            `💳 Wallet: \`${existingUser.walletAddress.slice(0, 8)}...${existingUser.walletAddress.slice(-6)}\`\n\n` +
            `Use /status to see your debts or /help for commands.`,
            { parse_mode: "Markdown" }
        );
    } else {
        await ctx.reply(
            `🎉 Welcome to LayerSplit!\n\n` +
            `Split bills with friends on Sui blockchain with 365% APR interest on late payments 💰\n\n` +
            `👉 Connect your wallet to get started:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🔗 Connect Wallet",
                                web_app: { url: `${env.TMA_URL}/?start=link` },
                            },
                        ],
                    ],
                },
            }
        );
    }
});

// /help command
bot.help(async (ctx) => {
    await ctx.reply(
        `📚 *LayerSplit Commands*\n\n` +
        `/start - Welcome & wallet link\n` +
        `/status - View your debts & receivables\n` +
        `/pay - Open app to pay debts\n` +
        `/split <amount> <description> - Create bill in groups\n` +
        `/help - Show this message\n\n` +
        `💡 *How it works:*\n` +
        `1. Create a bill with /split\n` +
        `2. Friends get 3 days grace period\n` +
        `3. After that, 1% daily interest accrues\n` +
        `4. Pay via the app to clear debts`,
        { parse_mode: "Markdown" }
    );
});

// /status command
bot.command("status", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
        await ctx.reply("❌ You haven't linked a wallet yet. Use /start to begin.");
        return;
    }

    const debtsOwed = await prisma.debt.findMany({
        where: { debtorId: user.id, isSettled: false },
        include: { creditor: true },
    });

    const receivables = await prisma.debt.findMany({
        where: { creditorId: user.id, isSettled: false },
        include: { debtor: true },
    });

    let message = `📊 *Your LayerSplit Status*\n\n`;

    if (debtsOwed.length > 0) {
        const totalOwed = debtsOwed.reduce(
            (sum, d) => sum + (d.principalAmount - d.amountPaid),
            BigInt(0)
        );
        message += `💸 *You Owe:* ${formatSui(totalOwed)} SUI\n`;
        debtsOwed.slice(0, 3).forEach((d) => {
            const name = d.creditor.username ?? `User ${d.creditor.telegramId}`;
            message += `  • ${formatSui(d.principalAmount - d.amountPaid)} to @${name}\n`;
        });
        if (debtsOwed.length > 3) message += `  _... and ${debtsOwed.length - 3} more_\n`;
    } else {
        message += `✅ *You Owe:* Nothing - you're all clear!\n`;
    }

    message += `\n`;

    if (receivables.length > 0) {
        const totalReceivable = receivables.reduce(
            (sum, d) => sum + (d.principalAmount - d.amountPaid),
            BigInt(0)
        );
        message += `💰 *Owed to You:* ${formatSui(totalReceivable)} SUI\n`;
        receivables.slice(0, 3).forEach((d) => {
            const name = d.debtor.username ?? `User ${d.debtor.telegramId}`;
            message += `  • ${formatSui(d.principalAmount - d.amountPaid)} from @${name}\n`;
        });
        if (receivables.length > 3) message += `  _... and ${receivables.length - 3} more_\n`;
    } else {
        message += `📭 *Owed to You:* Nothing pending\n`;
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
});

// /pay command
bot.command("pay", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
        await ctx.reply("❌ Link your wallet first with /start");
        return;
    }

    const debts = await prisma.debt.findMany({
        where: { debtorId: user.id, isSettled: false },
    });

    if (debts.length === 0) {
        await ctx.reply("✅ You have no outstanding debts!");
        return;
    }

    await ctx.reply(`💳 You have ${debts.length} outstanding debt(s). Open the app to pay:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "💸 Pay Debts", web_app: { url: `${env.TMA_URL}/app/pay` } }],
            ],
        },
    });
});

// /split command (in groups)
bot.command("split", async (ctx) => {
    const telegramId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    if (!telegramId || !chatId) return;

    // Check if in group
    if (chatType !== "group" && chatType !== "supergroup") {
        await ctx.reply("⚠️ Use /split in a group chat to split with friends!");
        return;
    }

    // Parse command: /split 100 Dinner
    const text = ctx.message?.text ?? "";
    const parts = text.split(" ").slice(1);

    if (parts.length < 2) {
        await ctx.reply("Usage: `/split <amount> <description>`\nExample: `/split 50 Pizza night`", {
            parse_mode: "Markdown",
        });
        return;
    }

    if (!parts[0]) return console.error();

    const amount = parseFloat(parts[0]);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply("❌ Invalid amount. Use a number like: `/split 25.5 Lunch`", {
            parse_mode: "Markdown",
        });
        return;
    }

    const description = parts.slice(1).join(" ");
    const amountMist = BigInt(Math.floor(amount * 1_000_000_000));

    // Check if user is linked
    const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
        await ctx.reply("❌ Link your wallet first with /start in DM");
        return;
    }

    await ctx.reply(
        `📝 *Create Bill*\n\n` +
        `💵 Amount: ${amount} SUI\n` +
        `📄 Description: ${description}\n\n` +
        `Open the app to add participants and confirm:`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "➕ Create Bill",
                            web_app: {
                                url: `${env.TMA_URL}/app/create?amount=${amountMist}&title=${encodeURIComponent(description)}&groupId=${chatId}`,
                            },
                        },
                    ],
                ],
            },
        }
    );
});

// Start bot
export function startBot() {
    bot
        .launch()
        .then(() => {
            console.log("🤖 Telegram bot started in polling mode");
        })
        .catch((err) => {
            console.error("Failed to start bot:", err);
        });
}

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
