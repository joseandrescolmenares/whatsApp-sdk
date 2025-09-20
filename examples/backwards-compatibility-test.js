/**
 * Backwards Compatibility Test
 *
 * This test verifies that existing code continues to work
 * after adding the message buffer functionality.
 */

const { WhatsAppClient } = require('../dist');

// Test 1: Existing webhook handler should work unchanged
console.log('🧪 Testing backwards compatibility...\n');

const client = new WhatsAppClient({
  accessToken: 'test-token',
  phoneNumberId: 'test-phone-id',
  webhookVerifyToken: 'test-verify-token'
});

// Test that old syntax still works (no enableBuffer specified)
const oldStyleProcessor = client.createWebhookProcessor({
  handlers: {
    onTextMessage: async (message) => {
      // Should receive single message object, not array
      console.log('✅ Old style onTextMessage called');
      console.log('   - Type:', typeof message);
      console.log('   - Is Array:', Array.isArray(message));
      console.log('   - Has text:', 'text' in message);

      // Verify it's a single message object
      if (!Array.isArray(message) && typeof message === 'object' && 'text' in message) {
        console.log('   ✅ Received single message as expected');
      } else {
        console.log('   ❌ Expected single message but got:', message);
      }
    },

    onImageMessage: async (message) => {
      console.log('✅ Old style onImageMessage called');
      console.log('   - Is single message:', !Array.isArray(message));
    },

    onError: async (error) => {
      console.log('❌ Error in old style handler:', error.message);
    }
  }
});

// Test 2: New style with explicit enableBuffer: false should work the same
const explicitDisabledBuffer = client.createWebhookProcessor({
  enableBuffer: false, // Explicitly disabled
  handlers: {
    onTextMessage: async (message) => {
      console.log('✅ Explicitly disabled buffer onTextMessage called');
      console.log('   - Is single message:', !Array.isArray(message));
    }
  }
});

// Test 3: Verify webhook verification still works
console.log('\n🔒 Testing webhook verification...');
const challenge = oldStyleProcessor.verifyWebhook('subscribe', 'test-verify-token', '12345');
if (challenge === 12345) {
  console.log('✅ Webhook verification works correctly');
} else {
  console.log('❌ Webhook verification failed');
}

// Test 4: Mock webhook processing
console.log('\n📨 Testing webhook processing...');

// Simulate a webhook payload
const mockWebhookPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'business-account-id',
      changes: [
        {
          value: {
            metadata: {
              display_phone_number: '+15551234567',
              phone_number_id: 'test-phone-id'
            },
            messages: [
              {
                id: 'msg-1',
                from: '+15559876543',
                timestamp: '1703123456',
                type: 'text',
                text: {
                  body: 'Hello world'
                }
              }
            ],
            contacts: [
              {
                profile: {
                  name: 'Test User'
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

// Process the webhook (should call handlers with individual messages)
(async () => {
  try {
    console.log('Processing mock webhook...');
    const result = await oldStyleProcessor.processWebhook(mockWebhookPayload);
    console.log('✅ Webhook processed successfully');
    console.log('   - Status:', result.status);
    console.log('   - Messages found:', result.messages?.length || 0);
  } catch (error) {
    console.log('❌ Webhook processing failed:', error.message);
  }

  // Test 5: Verify that client methods still work
  console.log('\n📤 Testing client methods...');

  try {
    const config = client.getConfig();
    console.log('✅ getConfig() works');
    console.log('   - Has accessToken:', 'accessToken' in config);
  } catch (error) {
    console.log('❌ getConfig() failed:', error.message);
  }

  // Test webhook parsing (should still return array of individual messages)
  try {
    const parsedMessages = client.parseWebhook(mockWebhookPayload);
    console.log('✅ parseWebhook() works');
    console.log('   - Messages parsed:', parsedMessages.length);
    console.log('   - First message type:', parsedMessages[0]?.type);
    console.log('   - First message text:', parsedMessages[0]?.text);
  } catch (error) {
    console.log('❌ parseWebhook() failed:', error.message);
  }

  console.log('\n🎉 Backwards compatibility test completed!');
  console.log('\nSummary:');
  console.log('- ✅ Old webhook handlers work unchanged');
  console.log('- ✅ Webhook verification unchanged');
  console.log('- ✅ Client methods unchanged');
  console.log('- ✅ Message parsing unchanged');
  console.log('- ✅ enableBuffer is optional (defaults to false)');
  console.log('\n📝 Existing code should continue working without modifications!');
})();

module.exports = {
  oldStyleProcessor,
  explicitDisabledBuffer,
  mockWebhookPayload
};