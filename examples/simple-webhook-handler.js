/**
 * WhatsApp Business SDK - Simple Webhook Handler
 *
 * Basic webhook example that automatically responds to incoming messages
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Create simple webhook processor
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📥 Message from ${message.from}: ${message.text}`);

    // Mark as read
    await client.markMessageAsRead(message.id);

    // Send a simple response
    await client.sendText(message.from, `✅ Message received: "${message.text}"`);

    console.log('✅ Response sent');
  },

  onImageMessage: async (message) => {
    console.log(`🖼️ Image received from ${message.from}`);
    await client.markMessageAsRead(message.id);
    await client.sendText(message.from, '📸 Thanks for the image!');
  },

  onError: async (error, message) => {
    console.error('❌ Error:', error.message);
    if (message) {
      await client.sendText(message.from, 'Sorry, there was an error processing your message.');
    }
  }
});

// Express.js webhook setup
function setupWebhook() {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Webhook verification (GET)
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
      console.log('✅ Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  });

  // Webhook messages (POST)
  app.post('/webhook', async (req, res) => {
    try {
      await webhookProcessor.processWebhook(req, res);
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(200).send('OK');
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  });
}

// Run if this file is executed directly
if (require.main === module) {
  setupWebhook();
}

module.exports = { webhookProcessor, setupWebhook };