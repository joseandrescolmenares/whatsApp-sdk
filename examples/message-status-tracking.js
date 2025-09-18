/**
 * WhatsApp Business SDK - Message Status Tracking Example
 *
 * Example showing how to track message delivery status (sent, delivered, read, failed)
 */

const { WhatsAppClient, MessageStatus } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// In-memory store for tracking message status (use a database in production)
const messageTracker = new Map();

// Webhook processor with status tracking
const webhookProcessor = client.createWebhookProcessor({
  // Track outgoing message status updates
  onMessageStatusUpdate: async (statusUpdate) => {
    console.log(`📊 Message Status Update:`);
    console.log(`   Message ID: ${statusUpdate.id}`);
    console.log(`   Status: ${statusUpdate.status}`);
    console.log(`   Recipient: ${statusUpdate.recipient_id}`);
    console.log(`   Timestamp: ${new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString()}`);

    // Update message tracking
    const existing = messageTracker.get(statusUpdate.id) || {};
    messageTracker.set(statusUpdate.id, {
      ...existing,
      [statusUpdate.status]: statusUpdate.timestamp,
      lastStatus: statusUpdate.status,
      recipient_id: statusUpdate.recipient_id
    });

    // Handle different status types
    switch (statusUpdate.status) {
      case MessageStatus.SENT:
        console.log(`   ✅ Message sent successfully`);
        break;

      case MessageStatus.DELIVERED:
        console.log(`   📱 Message delivered to recipient's device`);
        break;

      case MessageStatus.READ:
        console.log(`   👀 Message was read by recipient`);
        await handleMessageRead(statusUpdate);
        break;

      case MessageStatus.FAILED:
        console.log(`   ❌ Message failed to send`);
        await handleMessageFailed(statusUpdate);
        break;

      default:
        console.log(`   ⚠️ Unknown status: ${statusUpdate.status}`);
    }

    // Log pricing information if available
    if (statusUpdate.pricing) {
      console.log(`   💰 Pricing: ${statusUpdate.pricing.category} (${statusUpdate.pricing.billable ? 'billable' : 'free'})`);
    }

    // Log conversation info if available
    if (statusUpdate.conversation) {
      console.log(`   💬 Conversation: ${statusUpdate.conversation.id} (${statusUpdate.conversation.origin?.type})`);
    }

    console.log('');
  },

  // Handle incoming text messages
  onTextMessage: async (message) => {
    console.log(`📥 Incoming message from ${message.from}: ${message.text}`);

    // Send a response and track it
    const response = await client.sendText(
      message.from,
      `Thanks for your message: "${message.text}". I'll track the delivery status.`
    );

    if (response.success) {
      messageTracker.set(response.messageId, {
        type: 'outgoing_response',
        originalMessage: message.text,
        sentAt: Date.now(),
        recipient_id: message.from
      });
    }

    // Mark the incoming message as read
    await client.markMessageAsRead(message.id);
  },

  // Handle errors
  onError: async (error, message) => {
    console.error('❌ Webhook error:', error.message);
    if (message) {
      console.error('   Related to message:', message.id);
    }
  }
});

// Handle when a message is read
async function handleMessageRead(statusUpdate) {
  const messageData = messageTracker.get(statusUpdate.id);

  if (messageData) {
    const sentTime = parseInt(messageData.sent || messageData.sentAt);
    const readTime = parseInt(statusUpdate.timestamp) * 1000;
    const timeTaken = readTime - sentTime;

    console.log(`   ⏱️ Time to read: ${Math.round(timeTaken / 1000)} seconds`);

    // Optional: Send a follow-up if the message was read quickly
    if (timeTaken < 30000) { // Less than 30 seconds
      // Quick response - user is likely active
      console.log(`   🚀 Quick response detected - user is active`);
    }
  }
}

// Handle failed messages
async function handleMessageFailed(statusUpdate) {
  if (statusUpdate.errors && statusUpdate.errors.length > 0) {
    statusUpdate.errors.forEach(error => {
      console.log(`   📝 Error ${error.code}: ${error.title}`);
      if (error.message) {
        console.log(`      ${error.message}`);
      }
      if (error.error_data?.details) {
        console.log(`      Details: ${error.error_data.details}`);
      }
    });

    // Handle specific error codes
    const firstError = statusUpdate.errors[0];
    switch (firstError.code) {
      case 131047: // Re-engagement message (24h window expired)
        console.log(`   💡 Suggestion: Use a message template to re-engage`);
        await sendReEngagementTemplate(statusUpdate.recipient_id);
        break;

      case 131026: // Message undeliverable
        console.log(`   💡 Suggestion: Number may be invalid or WhatsApp not installed`);
        break;

      case 131051: // Unsupported message type
        console.log(`   💡 Suggestion: Check if the message format is supported`);
        break;

      default:
        console.log(`   💡 Check WhatsApp Business API documentation for error code ${firstError.code}`);
    }
  }
}

// Send re-engagement template for failed messages
async function sendReEngagementTemplate(recipientId) {
  try {
    // This is a placeholder - replace with your actual template
    const templateResponse = await client.sendTemplate(recipientId, 'your_template_name', 'en_US');

    if (templateResponse.success) {
      console.log(`   📤 Re-engagement template sent to ${recipientId}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to send re-engagement template: ${error.message}`);
  }
}

// Function to get message statistics
function getMessageStats() {
  const stats = {
    total: messageTracker.size,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0
  };

  for (const [messageId, data] of messageTracker.entries()) {
    switch (data.lastStatus) {
      case MessageStatus.SENT:
        stats.sent++;
        break;
      case MessageStatus.DELIVERED:
        stats.delivered++;
        break;
      case MessageStatus.READ:
        stats.read++;
        break;
      case MessageStatus.FAILED:
        stats.failed++;
        break;
      default:
        stats.pending++;
    }
  }

  return stats;
}

// Function to display message tracking report
function displayReport() {
  console.log('\n📊 MESSAGE TRACKING REPORT');
  console.log('=' .repeat(40));

  const stats = getMessageStats();
  console.log(`Total Messages: ${stats.total}`);
  console.log(`✅ Sent: ${stats.sent}`);
  console.log(`📱 Delivered: ${stats.delivered}`);
  console.log(`👀 Read: ${stats.read}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏳ Pending: ${stats.pending}`);

  if (stats.total > 0) {
    const readRate = ((stats.read / stats.total) * 100).toFixed(1);
    const deliveryRate = (((stats.delivered + stats.read) / stats.total) * 100).toFixed(1);

    console.log(`\n📈 METRICS:`);
    console.log(`Delivery Rate: ${deliveryRate}%`);
    console.log(`Read Rate: ${readRate}%`);
  }

  console.log('=' .repeat(40));
}

// Express.js webhook endpoint example
function setupWebhookEndpoint() {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Webhook endpoint
  app.all('/webhook', async (req, res) => {
    try {
      const result = await webhookProcessor.processWebhook(req.body, req.query);
      res.status(result.status).send(result.response);

      // Log processing results
      if (result.messages && result.messages.length > 0) {
        console.log(`📨 Processed ${result.messages.length} message(s)`);
      }
      if (result.statusUpdates && result.statusUpdates.length > 0) {
        console.log(`📊 Processed ${result.statusUpdates.length} status update(s)`);
      }
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Status endpoint
  app.get('/status', (req, res) => {
    const stats = getMessageStats();
    res.json({
      timestamp: new Date().toISOString(),
      stats,
      recentMessages: Array.from(messageTracker.entries())
        .slice(-10)
        .map(([id, data]) => ({ id, ...data }))
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Message tracking server running on port ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`📊 Status URL: http://localhost:${PORT}/status`);
  });

  // Display report every 30 seconds
  setInterval(displayReport, 30000);
}

// Demo function
async function sendTestMessages() {
  const testNumber = '+1234567890'; // Replace with test number

  console.log('📤 Sending test messages...\n');

  try {
    // Send different types of messages to test status tracking
    const messages = [
      await client.sendText(testNumber, 'Hello! This is a test message.'),
      await client.sendText(testNumber, 'Testing message status tracking 📊'),
      await client.sendImage(testNumber, 'https://via.placeholder.com/300', {
        caption: 'Test image with status tracking'
      })
    ];

    messages.forEach((response, index) => {
      if (response.success) {
        messageTracker.set(response.messageId, {
          type: 'test_message',
          index: index + 1,
          sentAt: Date.now()
        });
        console.log(`✅ Test message ${index + 1} sent: ${response.messageId}`);
      } else {
        console.log(`❌ Test message ${index + 1} failed: ${response.error}`);
      }
    });

    console.log('\n⏳ Watch for status updates in the webhook...\n');

  } catch (error) {
    console.error('❌ Error sending test messages:', error.message);
  }
}

// Run example
if (require.main === module) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error('❌ Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.includes('--server')) {
    setupWebhookEndpoint();
  } else if (args.includes('--test')) {
    sendTestMessages();
  } else {
    console.log('Message Status Tracking Example\n');
    console.log('Usage:');
    console.log('  node message-status-tracking.js --server  # Start webhook server');
    console.log('  node message-status-tracking.js --test    # Send test messages');
    console.log('\nThis example demonstrates:');
    console.log('  • Tracking message delivery status (sent → delivered → read)');
    console.log('  • Handling failed messages with error details');
    console.log('  • Computing delivery and read rates');
    console.log('  • Re-engagement strategies for failed messages');
  }
}

module.exports = {
  webhookProcessor,
  messageTracker,
  getMessageStats,
  setupWebhookEndpoint
};