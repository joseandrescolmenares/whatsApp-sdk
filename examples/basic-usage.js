/**
 * WhatsApp Business SDK - Basic Usage Example
 *
 * Simple example showing how to send messages using the WhatsApp Business SDK
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Test phone number (replace with real number)
const phoneNumber = '+1234567890';

async function basicExample() {
  try {
    console.log('📱 Sending WhatsApp messages...\n');

    // 1. Send a simple text message
    console.log('1. Sending text message...');
    const textResult = await client.sendText(phoneNumber, 'Hello! This is a test message from WhatsApp Business SDK.');
    console.log('✅ Text message sent:', textResult.messageId);

    // 2. Send a message with emojis
    console.log('2. Sending message with emojis...');
    await client.sendText(phoneNumber, '🎉 Welcome to our service! 🚀\n\nThanks for joining us! 😊');
    console.log('✅ Emoji message sent');

    // 3. Send an image
    console.log('3. Sending image...');
    await client.sendImage(
      phoneNumber,
      'https://picsum.photos/800/600',
      'Sample image from our service'
    );
    console.log('✅ Image sent');

    // 4. Send buttons
    console.log('4. Sending buttons...');
    await client.sendButtons(
      phoneNumber,
      'Choose an option:',
      [
        { id: 'option1', title: '📋 Info' },
        { id: 'option2', title: '💬 Support' },
        { id: 'option3', title: '📞 Contact' }
      ]
    );
    console.log('✅ Buttons sent');

    console.log('\n🎉 All messages sent successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the example
if (require.main === module) {
  // Check environment variables
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error('❌ Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables');
    process.exit(1);
  }

  basicExample();
}

module.exports = { basicExample };