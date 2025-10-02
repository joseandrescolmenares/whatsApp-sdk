/**
 * WhatsApp Business SDK - Broadcast Messages Example
 *
 * This example demonstrates how to send messages to multiple recipients
 * with intelligent rate limiting and progress tracking.
 *
 * Features:
 * - Send bulk text messages to multiple recipients
 * - Send personalized template messages with variables
 * - Real-time progress tracking
 * - Error handling for individual recipients
 * - Rate limiting to comply with WhatsApp API limits
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Example 1: Simple broadcast to multiple recipients
async function simpleBroadcast() {
  console.log('📢 Example 1: Simple Broadcast\n');

  const phoneNumbers = [
    '+1234567890',
    '+0987654321',
    '+1122334455',
    // Add more phone numbers here
  ];

  const message = 'Hello! This is an important announcement for all our customers. 🎉';

  try {
    const result = await client.sendBroadcastText(
      phoneNumbers,
      message,
      {
        batchSize: 50, // Send 50 messages per batch
        onProgress: (progress) => {
          console.log(`📊 Progress: ${progress.sent}/${progress.total} sent (${progress.percentage.toFixed(1)}%)`);
          console.log(`   ✅ Successful: ${progress.sent - progress.failed}`);
          console.log(`   ❌ Failed: ${progress.failed}`);
          if (progress.estimatedTimeRemaining) {
            console.log(`   ⏱️  ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s\n`);
          }
        }
      }
    );

    console.log('\n✅ Broadcast completed!');
    console.log(`   Total: ${result.total}`);
    console.log(`   Successful: ${result.successful}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);

    // Show failed recipients if any
    if (result.failed > 0) {
      console.log('\n❌ Failed recipients:');
      result.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.phoneNumber}: ${r.error}`);
        });
    }

  } catch (error) {
    console.error('❌ Broadcast failed:', error.message);
  }
}

// Example 2: Broadcast with detailed progress tracking
async function broadcastWithDetailedTracking() {
  console.log('\n📢 Example 2: Broadcast with Detailed Tracking\n');

  const phoneNumbers = [
    '+1234567890',
    '+0987654321',
    '+1122334455',
    '+5544332211',
    '+9988776655',
  ];

  const message = '🎁 Special offer just for you! Use code WELCOME10 for 10% off your next purchase.';

  const failedRecipients = [];
  const successfulRecipients = [];

  try {
    const result = await client.sendBroadcastText(
      phoneNumbers,
      message,
      {
        onMessageSent: (msgResult) => {
          if (msgResult.success) {
            successfulRecipients.push(msgResult.phoneNumber);
            console.log(`✅ Sent to ${msgResult.phoneNumber} (ID: ${msgResult.messageId})`);
          } else {
            failedRecipients.push(msgResult);
            console.log(`❌ Failed to send to ${msgResult.phoneNumber}: ${msgResult.error}`);
          }
        },
        onProgress: (progress) => {
          const bar = '█'.repeat(Math.floor(progress.percentage / 5)) + '░'.repeat(20 - Math.floor(progress.percentage / 5));
          console.log(`\n[${bar}] ${progress.percentage.toFixed(1)}%`);
        }
      }
    );

    console.log('\n📊 Final Report:');
    console.log(`   Broadcast ID: ${result.broadcastId}`);
    console.log(`   Total Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Success Rate: ${((result.successful / result.total) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 3: Send personalized template messages
async function sendPersonalizedTemplates() {
  console.log('\n📢 Example 3: Personalized Template Messages\n');

  // Each recipient with their personalized variables
  const recipients = [
    {
      phoneNumber: '+1234567890',
      variables: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        deliveryDate: 'December 25, 2024'
      }
    },
    {
      phoneNumber: '+0987654321',
      variables: {
        name: 'Jane Smith',
        orderNumber: 'ORD-12346',
        deliveryDate: 'December 26, 2024'
      }
    },
    {
      phoneNumber: '+1122334455',
      variables: {
        name: 'Bob Johnson',
        orderNumber: 'ORD-12347',
        deliveryDate: 'December 27, 2024'
      }
    }
  ];

  try {
    console.log('📤 Sending personalized templates...\n');

    const result = await client.sendBulkTemplates(
      recipients,
      'order_confirmation', // Your template name in WhatsApp Business
      'en_US',
      {
        batchSize: 30,
        onProgress: (progress) => {
          console.log(`📊 Sending: ${progress.sent}/${progress.total}`);
        },
        onMessageSent: (msgResult) => {
          if (msgResult.success) {
            console.log(`   ✅ Template sent to ${msgResult.phoneNumber}`);
          } else {
            console.log(`   ❌ Failed for ${msgResult.phoneNumber}: ${msgResult.error}`);
          }
        }
      }
    );

    console.log('\n✅ Template broadcast completed!');
    console.log(`   Success: ${result.successful}/${result.total}`);
    console.log(`   Average time per message: ${(result.duration / result.total).toFixed(0)}ms`);

  } catch (error) {
    console.error('❌ Template broadcast failed:', error.message);
  }
}

// Example 4: Advanced broadcast with custom batching
async function advancedBroadcast() {
  console.log('\n📢 Example 4: Advanced Broadcast with Custom Settings\n');

  const phoneNumbers = [
    '+1234567890',
    '+0987654321',
    // Add more recipients here
  ];

  const message = '🚀 New feature alert! Check out our latest updates.';

  try {
    const startTime = Date.now();

    const result = await client.sendBroadcastText(
      phoneNumbers,
      message,
      {
        batchSize: 100, // Large batch size for faster sending
        delayBetweenBatches: 2000, // 2 seconds between batches
        stopOnError: false, // Continue even if some messages fail
        onProgress: (progress) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = progress.sent / elapsed;
          console.log(`📈 Rate: ${rate.toFixed(1)} msg/sec | Progress: ${progress.percentage.toFixed(1)}%`);
        }
      }
    );

    console.log('\n✅ Broadcast statistics:');
    console.log(`   Messages/second: ${(result.total / (result.duration / 1000)).toFixed(2)}`);
    console.log(`   Success rate: ${((result.successful / result.total) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 5: Abort a running broadcast
async function abortBroadcastExample() {
  console.log('\n📢 Example 5: Aborting a Broadcast\n');

  const phoneNumbers = Array.from({ length: 100 }, (_, i) => `+1${i.toString().padStart(9, '0')}`);

  const message = 'This broadcast will be aborted...';

  try {
    // Start broadcast
    const broadcastPromise = client.sendBroadcastText(
      phoneNumbers,
      message,
      {
        onProgress: (progress) => {
          console.log(`Progress: ${progress.sent}/${progress.total}`);

          // Abort after sending 20 messages
          if (progress.sent >= 20) {
            console.log('\n⚠️  Aborting broadcast...');
            client.abortBroadcast();
          }
        }
      }
    );

    const result = await broadcastPromise;

    console.log('\n📊 Broadcast was aborted:');
    console.log(`   Sent before abort: ${result.sent}`);
    console.log(`   Not sent: ${result.pending}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 6: Check if broadcast is running
async function checkBroadcastStatus() {
  console.log('\n📢 Example 6: Check Broadcast Status\n');

  const phoneNumbers = ['+1234567890', '+0987654321'];
  const message = 'Testing broadcast status...';

  // Start broadcast in background
  client.sendBroadcastText(phoneNumbers, message).catch(console.error);

  // Check status
  setTimeout(() => {
    const isRunning = client.isBroadcastRunning();
    console.log(`Broadcast running: ${isRunning ? 'Yes ✅' : 'No ❌'}`);
  }, 1000);

  // Check again after 5 seconds
  setTimeout(() => {
    const isRunning = client.isBroadcastRunning();
    console.log(`Broadcast running: ${isRunning ? 'Yes ✅' : 'No ❌'}`);
  }, 5000);
}

// Main execution
async function main() {
  console.log('🎯 WhatsApp Broadcast Examples\n');
  console.log('Choose an example to run:\n');

  // Run the example you want to test
  // Uncomment the one you want to try:

  // await simpleBroadcast();
  // await broadcastWithDetailedTracking();
  // await sendPersonalizedTemplates();
  // await advancedBroadcast();
  // await abortBroadcastExample();
  // await checkBroadcastStatus();

  console.log('\n💡 Tip: Uncomment the example you want to run in the main() function');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  simpleBroadcast,
  broadcastWithDetailedTracking,
  sendPersonalizedTemplates,
  advancedBroadcast,
  abortBroadcastExample,
  checkBroadcastStatus
};
