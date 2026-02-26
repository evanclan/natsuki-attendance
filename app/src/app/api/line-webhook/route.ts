import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processLineMessage } from '@/app/actions/line-bot';
import { WebhookEvent } from '@line/bot-sdk';

// LINE channel secret from environment variables
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

export async function POST(req: NextRequest) {
    try {
        // 1. Get request body and signature
        const bodyText = await req.text();
        const signature = req.headers.get('x-line-signature');

        if (!signature || !channelSecret) {
            console.error('Missing signature or channel secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify LINE signature to ensure request came from LINE
        const hash = crypto
            .createHmac('sha256', channelSecret)
            .update(bodyText)
            .digest('base64');

        if (hash !== signature) {
            console.error('Invalid signature');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 3. Parse events
        const body = JSON.parse(bodyText);
        const events: WebhookEvent[] = body.events;
        console.log(`[LINE BOT] Received ${events.length} events`);

        // 4. Process each event (we only care about text messages)
        const results = await Promise.all(
            events.map(async (event) => {
                if (event.type !== 'message' || event.message.type !== 'text') {
                    return null;
                }

                const userId = event.source.userId;
                console.log(`[LINE BOT] Received message from user: ${userId}`);
                console.log(`[LINE BOT] Message text: ${event.message.text}`);

                // Secret command: anyone can discover their LINE user ID
                if (event.message.text.toLowerCase().trim() === 'my line id') {
                    const lineClient = new (await import('@line/bot-sdk')).Client({
                        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
                        channelSecret: process.env.LINE_CHANNEL_SECRET || '',
                    });
                    await lineClient.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `🔑 Your LINE User ID is:\n${userId}`
                    });
                    return null;
                }

                // Security: Only allow authorized admins
                const authorizedAdminStr = process.env.AUTHORIZED_LINE_ADMINS || '';
                const authorizedAdmins = authorizedAdminStr.split(',').map((id) => id.trim());
                if (!userId || !authorizedAdmins.includes(userId)) {
                    console.warn(`[LINE BOT] Unauthorized access attempt from user ID: ${userId}`);
                    const lineClient = new (await import('@line/bot-sdk')).Client({
                        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
                        channelSecret: process.env.LINE_CHANNEL_SECRET || '',
                    });
                    await lineClient.replyMessage(event.replyToken, {
                        type: 'text',
                        text: '🚫 You are not allowed to use this service.'
                    });
                    return null;
                }

                // Process the authorized text message
                return processLineMessage(event.message.text, event.replyToken, userId);
            })
        );

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('LINE Webhook Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
