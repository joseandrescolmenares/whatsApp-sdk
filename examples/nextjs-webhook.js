/**
 * WhatsApp Business SDK - Next.js Webhook Example
 *
 * Simple webhook handler for Next.js API routes
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Create webhook processor
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📥 Next.js: Message from ${message.from}: ${message.text}`);

    await client.markMessageAsRead(message.id);
    await client.sendText(message.from, `Hello from Next.js! You said: "${message.text}"`);
  },

  onImageMessage: async (message) => {
    console.log(`🖼️ Next.js: Image received from ${message.from}`);
    await client.markMessageAsRead(message.id);
    await client.sendText(message.from, '📸 Image received in Next.js!');
  },

  onError: async (error, message) => {
    console.error('❌ Next.js webhook error:', error.message);
  }
});

/**
 * Next.js API Route Handler
 * Save this as: pages/api/webhook.js (Pages Router)
 * Or: app/api/webhook/route.js (App Router)
 */

// For Pages Router (pages/api/webhook.js)
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
      console.log('✅ Next.js webhook verified');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    // Process webhook messages
    try {
      await webhookProcessor.processWebhook(req, res);
    } catch (error) {
      console.error('❌ Next.js webhook error:', error);
      return res.status(200).send('OK');
    }
  }
}

// For App Router (app/api/webhook/route.js)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log('✅ Next.js App Router webhook verified');
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Forbidden', { status: 403 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Create a mock req/res for the webhook processor
    const mockReq = { body };
    const mockRes = {
      status: (code) => ({ send: (data) => new Response(data, { status: code }) })
    };

    await webhookProcessor.processWebhook(mockReq, mockRes);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Next.js App Router webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

module.exports = { webhookProcessor };