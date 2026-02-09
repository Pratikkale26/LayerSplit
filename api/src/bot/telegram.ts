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
    const chatType = ctx.chat?.type;

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
        // web_app buttons only work in private chats
        if (chatType !== "private") {
            await ctx.reply(
                `🎉 Welcome to LayerSplit!\n\n` +
                `Split bills with friends on Sui blockchain with 365% APR interest on late payments 💰\n\n` +
                `👉 Please start me in DM to connect your wallet:\n` +
                `@${ctx.botInfo?.username || "layersplit_bot"}`
            );
            // Try to send DM
            try {
                await bot.telegram.sendMessage(
                    telegramId,
                    `🎉 Welcome to LayerSplit!\n\n` +
                    `Split bills with friends on Sui blockchain with 365% APR interest on late payments 💰\n\n` +
                    `👉 Connect your wallet to get started:`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🔗 Connect Wallet", web_app: { url: `${env.TMA_URL}/?start=link` } }],
                            ],
                        },
                    }
                );
            } catch (e) {
                // User hasn't started the bot in DM yet
            }
            return;
        }

        await ctx.reply(
            `🎉 Welcome to LayerSplit!\n\n` +
            `Split bills with friends on Sui blockchain with 365% APR interest on late payments 💰\n\n` +
            `👉 Connect your wallet to get started:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔗 Connect Wallet", web_app: { url: `${env.TMA_URL}/?start=link` } }],
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
        `/dashboard - Open full dashboard\n` +
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
    const chatType = ctx.chat?.type;
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

    // web_app buttons only work in private chats
    if (chatType !== "private") {
        await ctx.reply(`💳 You have ${debts.length} outstanding debt(s). Check your DM to pay!`);
        try {
            await bot.telegram.sendMessage(
                telegramId,
                `💳 You have ${debts.length} outstanding debt(s). Open the app to pay:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💸 Pay Debts", web_app: { url: `${env.TMA_URL}/app/pay` } }],
                        ],
                    },
                }
            );
        } catch (e) {
            await ctx.reply("⚠️ Couldn't DM you! Please start me first with /start in DM.");
        }
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

// /dashboard command - opens TMA dashboard
bot.command("dashboard", async (ctx) => {
    const telegramId = ctx.from?.id;
    const chatType = ctx.chat?.type;
    if (!telegramId) return;

    // web_app buttons only work in private chats
    if (chatType !== "private") {
        await ctx.reply("📊 Check your DM to open the Dashboard!");
        try {
            await bot.telegram.sendMessage(
                telegramId,
                "📊 Open your LayerSplit Dashboard:",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📊 Dashboard", web_app: { url: `${env.TMA_URL}/app` } }],
                        ],
                    },
                }
            );
        } catch (e) {
            await ctx.reply("⚠️ Couldn't DM you! Please start me first with /start in DM.");
        }
        return;
    }

    await ctx.reply("📊 Open your LayerSplit Dashboard:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Dashboard", web_app: { url: `${env.TMA_URL}/app` } }],
            ],
        },
    });
});

// /split command (in groups)
// Supports: /split 100 dinner @user1 @user2:40
bot.command("split", async (ctx) => {
    const telegramId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const creatorUsername = ctx.from?.username;

    if (!telegramId || !chatId) return;

    // Check if in group
    if (chatType !== "group" && chatType !== "supergroup") {
        await ctx.reply("⚠️ Use /split in a group chat to split with friends!");
        return;
    }

    // Parse command
    const text = ctx.message?.text ?? "";

    // Regex to parse: /split <amount> <description> @user1:amount @user2
    const amountMatch = text.match(/^\/split\s+(\d+(?:\.\d+)?)/);
    if (!amountMatch) {
        await ctx.reply(
            "📝 *Usage:*\n" +
            "`/split <amount> <description> @user1 @user2`\n\n" +
            "*Examples:*\n" +
            "`/split 100 dinner @alice @bob` - Equal split\n" +
            "`/split 100 dinner @alice:60 @bob:40` - Custom split",
            { parse_mode: "Markdown" }
        );
        return;
    }

    const amount = parseFloat(amountMatch[1]!);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply("❌ Invalid amount. Use a positive number.");
        return;
    }

    // Extract @mentions with optional amounts: @username or @username:amount
    const mentionRegex = /@(\w+)(?::(\d+(?:\.\d+)?))?/g;
    const mentions: { username: string; amount?: number }[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push({
            username: match[1]!,
            amount: match[2] ? parseFloat(match[2]) : undefined,
        });
    }

    // Extract description (text between amount and first @mention, or after amount if no mentions)
    const afterAmount = text.slice(amountMatch[0].length).trim();
    const descriptionMatch = afterAmount.match(/^([^@]*)/);
    const description = descriptionMatch?.[1]?.trim() || "Split bill";

    // Check if creator is linked
    const creator = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
    });

    if (!creator) {
        await ctx.reply(
            "❌ You need to link your wallet first!\n\n" +
            "DM me with /start to connect your wallet.",
            { parse_mode: "Markdown" }
        );
        return;
    }

    // If no mentions, ask for confirmation (we'll add group member detection later)
    if (mentions.length === 0) {
        await ctx.reply(
            "⚠️ Please mention users to split with:\n" +
            "`/split 100 dinner @alice @bob`",
            { parse_mode: "Markdown" }
        );
        return;
    }

    // Validate custom amounts if provided
    const hasCustomAmounts = mentions.some(m => m.amount !== undefined);
    if (hasCustomAmounts) {
        const allHaveAmounts = mentions.every(m => m.amount !== undefined);
        if (!allHaveAmounts) {
            await ctx.reply(
                "❌ If using custom amounts, specify for ALL users:\n" +
                "`/split 100 dinner @alice:60 @bob:40`",
                { parse_mode: "Markdown" }
            );
            return;
        }

        const totalCustom = mentions.reduce((sum, m) => sum + (m.amount || 0), 0);
        if (Math.abs(totalCustom - amount) > 0.01) {
            await ctx.reply(
                `❌ Custom amounts (${totalCustom}) don't match total (${amount})`,
                { parse_mode: "Markdown" }
            );
            return;
        }
    }

    // Look up mentioned users in database
    const debtors: { userId?: string; username: string; walletAddress?: string; amount: bigint }[] = [];
    const unlinkedUsers: string[] = [];
    const amountMist = BigInt(Math.floor(amount * 1_000_000_000));
    const equalShare = amountMist / BigInt(mentions.length);

    for (const mention of mentions) {
        const user = await prisma.user.findFirst({
            where: { username: mention.username },
        });

        const debtorAmount = hasCustomAmounts
            ? BigInt(Math.floor(mention.amount! * 1_000_000_000))
            : equalShare;

        if (user) {
            debtors.push({
                userId: user.id,
                username: mention.username,
                walletAddress: user.walletAddress,
                amount: debtorAmount,
            });
        } else {
            unlinkedUsers.push(mention.username);
            debtors.push({
                username: mention.username,
                amount: debtorAmount,
            });
        }
    }

    // Create bill in database with PENDING status
    // Note: We don't set groupId because it requires a Group table record
    // telegramChatId is saved to send feedback after signing
    const bill = await prisma.bill.create({
        data: {
            // groupId is omitted to avoid foreign key constraint
            telegramChatId: BigInt(chatId),
            creatorId: creator.id,
            title: description || "Split bill",
            totalAmount: amountMist,
            splitType: hasCustomAmounts ? "CUSTOM" : "EQUAL",
            isSettled: false,
            // suiObjectId will be set after on-chain confirmation
        },
    });

    // Create debt records for linked users only
    for (const debtor of debtors) {
        if (debtor.userId) {
            await prisma.debt.create({
                data: {
                    billId: bill.id,
                    debtorId: debtor.userId,
                    creditorId: creator.id,
                    principalAmount: debtor.amount,
                },
            });
        }
    }

    // Build confirmation message
    let confirmMsg = `📝 *Bill Created*\n\n`;
    confirmMsg += `💵 *Amount:* ${amount} SUI\n`;
    confirmMsg += `📄 *Description:* ${description}\n`;
    confirmMsg += `👥 *Split with:*\n`;

    for (const debtor of debtors) {
        const shareAmount = Number(debtor.amount) / 1_000_000_000;
        const status = debtor.userId ? "✅" : "⏳";
        confirmMsg += `  ${status} @${debtor.username}: ${shareAmount.toFixed(2)} SUI\n`;
    }

    if (unlinkedUsers.length > 0) {
        confirmMsg += `\n⚠️ _${unlinkedUsers.join(", ")} need to link wallets_\n`;
        confirmMsg += `\n❌ *Cannot create on-chain bill until everyone links their wallet.*`;

        await ctx.reply(confirmMsg, { parse_mode: "Markdown" });
        return; // Stop here - don't send signing button
    }

    // Only proceed to sending signing button if everyone is linked
    confirmMsg += `\n\n📩 _Check your DM to sign the transaction!_`;

    // Reply in group with bill details
    await ctx.reply(confirmMsg, { parse_mode: "Markdown" });

    // Send DM with web_app button (web_app buttons ONLY work in private chats)
    try {
        await bot.telegram.sendMessage(
            telegramId,
            `📝 *Sign Bill: ${description}*\n\n` +
            `💵 Amount: ${amount} SUI\n` +
            `👥 Split with: ${mentions.map(m => `@${m.username}`).join(", ")}\n\n` +
            `Click below to sign and create the on-chain bill:`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "✍️ Sign & Create On-Chain",
                                web_app: { url: `${env.TMA_URL}/app/sign?billId=${bill.id}` },
                            },
                        ],
                    ],
                },
            }
        );
    } catch (err) {
        // User hasn't started the bot or blocked DMs
        console.error("Failed to send DM:", err);
        await ctx.reply(
            `⚠️ I couldn't DM you! Please start me first:\n` +
            `1. Open @${ctx.botInfo?.username || "layersplit_bot"} in DM\n` +
            `2. Send /start\n` +
            `3. Then try /split again`
        );
    }
});

// Track if bot is running
let isRunning = false;

// Start bot - uses webhook in production, polling in development
export async function startBot() {
    const isProduction = env.NODE_ENV === 'production';

    if (isProduction) {
        // PRODUCTION: Use webhook mode
        // The webhook will be handled by Express in index.ts
        // We just need to set the webhook URL with Telegram
        // Use API_URL (this server) for webhook, NOT TMA_URL (frontend)
        const webhookUrl = `${env.API_URL.replace(/\/$/, '')}/api/telegram-webhook`;

        try {
            // Delete any existing webhook first
            await bot.telegram.deleteWebhook();

            // Set the new webhook
            await bot.telegram.setWebhook(webhookUrl);

            console.log(`🤖 Telegram bot webhook set to: ${webhookUrl}`);
            isRunning = true;
        } catch (err) {
            console.error("Failed to set webhook:", err);
            // Fallback to polling if webhook fails
            console.log("Falling back to polling mode...");
            await bot.launch();
            isRunning = true;
            console.log("🤖 Telegram bot started in polling mode (fallback)");
        }
    } else {
        // DEVELOPMENT: Use polling mode
        bot
            .launch()
            .then(() => {
                isRunning = true;
                console.log("🤖 Telegram bot started in polling mode (development)");
            })
            .catch((err) => {
                console.error("Failed to start bot:", err);
            });
    }
}

// Export webhook callback for Express
export const webhookCallback = bot.webhookCallback('/api/telegram-webhook');

// Graceful shutdown - only stop if bot is running
const gracefulShutdown = (signal: string) => {
    if (isRunning) {
        console.log(`Received ${signal}, stopping bot...`);
        bot.stop(signal);
        isRunning = false;
    }
    process.exit(0);
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

