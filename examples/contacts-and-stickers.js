/**
 * WhatsApp Business SDK - Contacts and Stickers Example
 *
 * Simple example showing how to send contacts and handle stickers
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Test phone number
const phoneNumber = '+1234567890';

async function contactsExample() {
  try {
    console.log('📇 Sending contacts...\n');

    // 1. Send a simple contact
    console.log('1. Sending business contact...');
    await client.sendContact(phoneNumber, {
      name: {
        first_name: 'John',
        last_name: 'Doe'
      },
      phones: [
        {
          phone: '+1234567890',
          type: 'WORK'
        }
      ],
      emails: [
        {
          email: 'john@company.com',
          type: 'WORK'
        }
      ],
      org: {
        company: 'Example Company'
      }
    });
    console.log('✅ Contact sent');

    // 2. Send multiple contacts
    console.log('\n2. Sending multiple contacts...');
    await client.sendContacts(phoneNumber, [
      {
        name: { first_name: 'Alice', last_name: 'Smith' },
        phones: [{ phone: '+1111111111', type: 'CELL' }]
      },
      {
        name: { first_name: 'Bob', last_name: 'Johnson' },
        phones: [{ phone: '+2222222222', type: 'WORK' }]
      }
    ]);
    console.log('✅ Multiple contacts sent');

    console.log('\n🎉 Contacts demo completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Webhook processor for contacts and stickers
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📥 Message from ${message.from}: ${message.text}`);
    await client.markMessageAsRead(message.id);
    await client.sendText(message.from, 'Message received!');
  },

  onContactMessage: async (message) => {
    console.log(`📇 Contact received from ${message.from}`);
    await client.markMessageAsRead(message.id);

    const contact = message.contacts[0];
    const name = contact.name?.formatted_name || 'Unknown';

    await client.sendText(
      message.from,
      `📇 Thanks for sharing the contact: ${name}`
    );

    console.log('✅ Contact processed');
  },

  onStickerMessage: async (message) => {
    console.log(`😀 Sticker received from ${message.from}`);
    await client.markMessageAsRead(message.id);
    await client.sendText(message.from, '😊 Nice sticker!');

    console.log('✅ Sticker processed');
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

  contactsExample();
}

module.exports = { contactsExample, webhookProcessor };