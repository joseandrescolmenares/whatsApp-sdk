/**
 * WhatsApp Business SDK - Typing Indicators Example
 *
 * Simple example showing how to use typing indicators for better user experience
 */

const { WhatsAppClient } = require("whatsapp-client-sdk");

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Test phone number
const phoneNumber = "+1234567890";

async function typingExample() {
  try {
    console.log("⌨️ Testing typing indicators...\n");

    // 1. Basic typing indicator
    console.log("1. Sending typing indicator...");
    await client.sendTypingIndicator(phoneNumber);

    // Wait 2 seconds (user sees "typing...")
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Send message
    await client.sendText(
      phoneNumber,
      "Hello! This message was sent after showing a typing indicator."
    );
    console.log("✅ Message sent after typing indicator");

    // 2. Typing indicator with custom duration
    console.log("\n2. Typing indicator with 5 second duration...");
    await client.sendTypingIndicatorWithDuration(phoneNumber, 5000);

    // Wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await client.sendText(
      phoneNumber,
      "This message took a bit longer to compose..."
    );
    console.log("✅ Message sent after extended typing");

    console.log("\n🎉 Typing indicators demo completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Webhook processor with typing indicators
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📥 Message from ${message.from}: ${message.text}`);

    // Mark as read
    await client.markMessageAsRead(message.id);

    // Show typing indicator
    await client.sendTypingIndicator(message.from);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Send response
    await client.sendText(
      message.from,
      `Thanks for your message: "${message.text}"`
    );

    console.log("✅ Response sent with typing indicator");
  },

  onImageMessage: async (message) => {
    console.log(`🖼️ Image received from ${message.from}`);
    await client.markMessageAsRead(message.id);

    await client.sendTypingIndicator(message.from);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await client.sendText(message.from, "📸 Thanks for the image!");
  },

  onError: async (error, message) => {
    console.error("❌ Webhook error:", error.message);
  },
});

// Run example
if (require.main === module) {
  if (
    !process.env.WHATSAPP_ACCESS_TOKEN ||
    !process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    console.error(
      "❌ Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables"
    );
    process.exit(1);
  }

  typingExample();
}

module.exports = { typingExample, webhookProcessor };
