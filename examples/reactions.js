/**
 * WhatsApp Business SDK - Reactions Example
 *
 * Simple example showing how to send message reactions
 */

const { WhatsAppClient, REACTION_EMOJIS } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Test values (replace with real values)
const phoneNumber = '+1234567890';
const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';

async function reactionExamples() {
  try {
    console.log('😊 Sending WhatsApp reactions...\n');

    // 1. Send basic reactions
    console.log('1. Sending basic reactions...');

    await client.reactWithLike(phoneNumber, messageId);
    console.log('👍 Like reaction sent');

    await client.reactWithLove(phoneNumber, messageId);
    console.log('❤️ Love reaction sent');

    await client.reactWithLaugh(phoneNumber, messageId);
    console.log('😂 Laugh reaction sent');

    // 2. Send custom emoji reactions
    console.log('\n2. Sending custom emoji reactions...');

    await client.sendReaction(phoneNumber, messageId, '🔥');
    console.log('🔥 Fire reaction sent');

    await client.sendReaction(phoneNumber, messageId, '🎉');
    console.log('🎉 Party reaction sent');

    // 3. Using emoji constants
    console.log('\n3. Using emoji constants...');

    await client.sendReaction(phoneNumber, messageId, REACTION_EMOJIS.CHECK);
    console.log('✅ Check reaction sent');

    // 4. Remove reaction
    console.log('\n4. Removing reaction...');
    await client.removeReaction(phoneNumber, messageId);
    console.log('🗑️ Reaction removed');

    console.log('\n🎉 All reactions completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Webhook processor with automatic reactions
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📥 Message from ${message.from}: ${message.text}`);

    await client.markMessageAsRead(message.id);

    const text = message.text.toLowerCase();

    // Auto-react based on content
    if (text.includes('awesome') || text.includes('amazing')) {
      await client.reactWithFire(message.from, message.id);
      console.log('🔥 Auto-reacted with fire');
    } else if (text.includes('thanks') || text.includes('thank you')) {
      await client.reactWithHeart(message.from, message.id);
      console.log('❤️ Auto-reacted with heart');
    } else if (text.includes('funny') || text.includes('lol')) {
      await client.reactWithLaugh(message.from, message.id);
      console.log('😂 Auto-reacted with laugh');
    } else {
      await client.reactWithLike(message.from, message.id);
      console.log('👍 Auto-reacted with like');
    }
  },

  onError: async (error, message) => {
    console.error('❌ Webhook error:', error.message);
  }
});

// Run example
if (require.main === module) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error('❌ Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables');
    process.exit(1);
  }

  reactionExamples();
}

module.exports = { reactionExamples, webhookProcessor };