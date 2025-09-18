/**
 * WhatsApp Business SDK - Incoming Reactions & Replies Example
 *
 * Example showing how to handle incoming reactions and replies via webhooks
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Webhook processor with reaction and reply handlers
const webhookProcessor = client.createWebhookProcessor({
  // Handle regular text messages
  onTextMessage: async (message) => {
    console.log(`📥 Text message from ${message.from}: ${message.text}`);

    // Mark as read
    await client.markMessageAsRead(message.id);

    // Send a simple reply
    await client.sendText(message.from, `Echo: ${message.text}`);
  },

  // Handle incoming reactions
  onReactionMessage: async (message) => {
    console.log(`❤️ Reaction received from ${message.from}:`);
    console.log(`   Emoji: ${message.reaction.emoji}`);
    console.log(`   Original message ID: ${message.reaction.message_id}`);

    // React back with a thumbs up
    await client.sendReaction(message.from, message.id, '👍');

    // Send a thank you message
    await client.sendText(message.from, `Thanks for the ${message.reaction.emoji} reaction!`);
  },

  // Handle replies (messages with context)
  onReplyMessage: async (message) => {
    console.log(`💬 Reply received from ${message.from}:`);
    console.log(`   Reply to message ID: ${message.context.message_id}`);
    console.log(`   Message type: ${message.type}`);

    if (message.text) {
      console.log(`   Reply text: ${message.text}`);
    }

    // Send confirmation that we received the reply
    await client.replyToMessage(
      message.from,
      message.id,
      "Got your reply! 📨"
    );
  },

  // Handle image messages (could also be replies)
  onImageMessage: async (message) => {
    console.log(`🖼️ Image message from ${message.from}`);

    if (message.context) {
      console.log(`   This is a reply to: ${message.context.message_id}`);
    }

    // Download and process the image if needed
    // const mediaInfo = await client.getMediaInfo(message.media.id);
    // console.log(`   Image URL: ${mediaInfo.url}`);

    await client.sendText(message.from, "Nice image! 📸");
  },

  // Handle button clicks
  onButtonClick: async (message) => {
    console.log(`🔘 Button clicked by ${message.from}`);
    console.log(`   Button ID: ${message.interactive.button_id}`);

    if (message.context) {
      console.log(`   Reply to message: ${message.context.message_id}`);
    }
  },

  // Handle errors
  onError: async (error, message) => {
    console.error('❌ Webhook error:', error.message);
    if (message) {
      console.error('   Message that caused error:', {
        id: message.id,
        from: message.from,
        type: message.type
      });
    }
  }
});

// Express.js webhook endpoint example
function setupWebhookEndpoint() {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Webhook verification endpoint
  app.get('/webhook', (req, res) => {
    const result = webhookProcessor.verifyWebhook(
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

  // Webhook message processing endpoint
  app.post('/webhook', async (req, res) => {
    try {
      const result = await webhookProcessor.processWebhook(req.body);
      res.status(result.status).send(result.response);

      if (result.messages && result.messages.length > 0) {
        console.log(`✅ Processed ${result.messages.length} message(s)`);
      }
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  });
}

// Demo function to test the webhook processing
async function testWebhookProcessing() {
  console.log('🧪 Testing webhook processing...\n');

  // Simulate incoming reaction webhook
  const reactionWebhook = {
    object: "whatsapp",
    entry: [{
      id: "PHONE_NUMBER_ID",
      changes: [{
        value: {
          metadata: { phone_number_id: "123456789" },
          messages: [{
            from: "1234567890",
            id: "wamid.reaction123",
            timestamp: "1640995200",
            type: "reaction",
            reaction: {
              message_id: "wamid.original123",
              emoji: "👍"
            }
          }]
        },
        field: "messages"
      }]
    }]
  };

  // Simulate incoming reply webhook
  const replyWebhook = {
    object: "whatsapp",
    entry: [{
      id: "PHONE_NUMBER_ID",
      changes: [{
        value: {
          metadata: { phone_number_id: "123456789" },
          messages: [{
            from: "1234567890",
            id: "wamid.reply123",
            timestamp: "1640995200",
            type: "text",
            text: { body: "This is my reply!" },
            context: { message_id: "wamid.original456" }
          }]
        },
        field: "messages"
      }]
    }]
  };

  console.log('Processing reaction webhook...');
  await webhookProcessor.processWebhook(reactionWebhook);

  console.log('\nProcessing reply webhook...');
  await webhookProcessor.processWebhook(replyWebhook);

  console.log('\n✅ Test completed!');
}

// Run example
if (require.main === module) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error('❌ Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables');
    process.exit(1);
  }

  // Choose what to run
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    testWebhookProcessing();
  } else if (args.includes('--server')) {
    setupWebhookEndpoint();
  } else {
    console.log('Usage:');
    console.log('  node incoming-reactions-replies.js --test    # Test webhook processing');
    console.log('  node incoming-reactions-replies.js --server  # Start webhook server');
  }
}

module.exports = { webhookProcessor, setupWebhookEndpoint, testWebhookProcessing };