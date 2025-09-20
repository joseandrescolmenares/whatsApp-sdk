const { WhatsAppClient } = require('../dist');

// Initialize the WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
});

// Example 1: Basic usage without buffer (default behavior)
console.log('=== Without Buffer (Individual Messages) ===');
const processorWithoutBuffer = client.createWebhookProcessor({
  handlers: {
    onTextMessage: async (message) => {
      // Receives one message at a time
      console.log(`Received individual text: "${message.text}" from ${message.from}`);
    },
    onImageMessage: async (message) => {
      console.log(`Received individual image from ${message.from}`);
    }
  }
});

// Example 2: With buffer enabled - receives batched messages
console.log('\n=== With Buffer (Batched Messages) ===');
const processorWithBuffer = client.createWebhookProcessor({
  enableBuffer: true,        // Enable message buffering
  bufferTimeMs: 10000,      // Wait 10 seconds to group messages
  maxBatchSize: 50,         // Or process when 50 messages are reached
  handlers: {
    onTextMessage: async (messages) => {
      // Can receive either a single message or an array
      if (Array.isArray(messages)) {
        console.log(`\n📦 Received batch of ${messages.length} text messages:`);
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. "${msg.text}" from ${msg.from} at ${new Date(parseInt(msg.timestamp) * 1000).toLocaleTimeString()}`);
        });

        // Example: Process all messages together
        const combinedText = messages.map(msg => msg.text).join(' ');
        console.log(`📝 Combined text: "${combinedText}"`);
      } else {
        // Single message (when only one message is received)
        console.log(`📨 Single text: "${messages.text}" from ${messages.from}`);
      }
    },

    onImageMessage: async (messages) => {
      if (Array.isArray(messages)) {
        console.log(`\n🖼️  Received batch of ${messages.length} images:`);
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. Image from ${msg.from} (${msg.media.mime_type})`);
        });
      } else {
        console.log(`🖼️  Single image from ${messages.from}`);
      }
    },

    onVideoMessage: async (messages) => {
      if (Array.isArray(messages)) {
        console.log(`\n🎥 Received batch of ${messages.length} videos from same sender`);
      } else {
        console.log(`🎥 Single video from ${messages.from}`);
      }
    },

    onError: async (error) => {
      console.error('❌ Error processing messages:', error.message);
    }
  }
});

// Example usage in Express.js
function setupWebhookRoutes(app) {
  // Without buffer
  app.get('/webhook', (req, res) => {
    const result = processorWithoutBuffer.verifyWebhook(
      req.query['hub.mode'],
      req.query['hub.verify_token'],
      req.query['hub.challenge']
    );

    if (result !== null) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  });

  app.post('/webhook', async (req, res) => {
    try {
      const result = await processorWithoutBuffer.processWebhook(req.body);
      res.status(result.status).send(result.response);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // With buffer (separate endpoint)
  app.post('/webhook-buffered', async (req, res) => {
    try {
      const result = await processorWithBuffer.processWebhook(req.body);
      res.status(result.status).send(result.response);
    } catch (error) {
      console.error('Buffered webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
}

// Example: Smart message processing with buffer
const smartProcessor = client.createWebhookProcessor({
  enableBuffer: true,
  bufferTimeMs: 5000,  // Short buffer for quick responses
  handlers: {
    onTextMessage: async (messages) => {
      const phoneNumber = Array.isArray(messages) ? messages[0].from : messages.from;

      if (Array.isArray(messages)) {
        // Multiple messages - could be a conversation or multiple questions
        console.log(`\n🤖 Processing conversation from ${phoneNumber}:`);

        const conversationText = messages.map(msg => msg.text).join('\n');

        // Example: Send a summary response
        await client.sendText(phoneNumber,
          `I received ${messages.length} messages from you. Let me process them together: "${conversationText.substring(0, 100)}..."`
        );
      } else {
        // Single message - immediate response
        await client.sendText(phoneNumber, `Got your message: "${messages.text}"`);
      }
    }
  }
});

module.exports = {
  processorWithoutBuffer,
  processorWithBuffer,
  smartProcessor,
  setupWebhookRoutes
};

/*
Key Benefits of Message Buffering:

1. 📦 Batch Processing: Handle multiple messages from the same sender together
2. ⚡ Performance: Reduce handler calls for burst messages
3. 🧠 Context: Better conversation understanding with grouped messages
4. 🔄 Backwards Compatible: Existing code works without changes
5. ⚙️ Configurable: Adjust timing and batch sizes per use case

Example Use Cases:
- AI chatbots that need conversation context
- Analytics that benefit from message grouping
- Rate limiting protection for downstream services
- Bulk operations on related messages

Configuration Options:
- enableBuffer: true/false (default: false)
- bufferTimeMs: milliseconds to wait (default: 5000)
- maxBatchSize: max messages per batch (default: 100)
*/