/**
 * Basic Usage Example
 * 
 * This example demonstrates the basic functionality of the WhatsApp Business SDK
 */

const { WhatsAppClient } = require('whatsapp-sdk');

// Initialize the client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN, // Optional
  businessId: process.env.WHATSAPP_BUSINESS_ID // Optional
});

async function basicExample() {
  try {
    const recipientPhone = '+1234567890';

    // 1. Send a simple text message
    console.log('Sending text message...');
    const textResponse = await client.sendText(
      recipientPhone,
      'Hello! This is a message from the WhatsApp Business SDK 🚀'
    );
    console.log('Text message sent:', textResponse.messageId);

    // 2. Send a text message with URL preview
    console.log('Sending text with URL preview...');
    await client.sendText(
      recipientPhone,
      'Check out this amazing SDK: https://github.com/your-org/whatsapp-business-sdk',
      { previewUrl: true }
    );

    // 3. Send an image message
    console.log('Sending image message...');
    await client.sendImage(recipientPhone, {
      link: 'https://example.com/sample-image.jpg',
      caption: 'This is a sample image sent via SDK!'
    });

    // 4. Send interactive buttons
    console.log('Sending button message...');
    await client.sendButtons(
      recipientPhone,
      'Choose an option:',
      [
        { id: 'option_1', title: 'Option 1' },
        { id: 'option_2', title: 'Option 2' },
        { id: 'option_3', title: 'Option 3' }
      ],
      {
        header: { type: 'text', text: 'Interactive Menu' },
        footer: 'Powered by WhatsApp Business SDK'
      }
    );

    // 5. Send a list message
    console.log('Sending list message...');
    await client.sendList(
      recipientPhone,
      'Select a category:',
      'View Categories',
      [
        {
          title: 'Products',
          rows: [
            { id: 'prod_1', title: 'Product 1', description: 'Description for product 1' },
            { id: 'prod_2', title: 'Product 2', description: 'Description for product 2' }
          ]
        },
        {
          title: 'Services',
          rows: [
            { id: 'serv_1', title: 'Service 1', description: 'Description for service 1' },
            { id: 'serv_2', title: 'Service 2', description: 'Description for service 2' }
          ]
        }
      ]
    );

    // 6. Send location
    console.log('Sending location...');
    await client.sendLocation(recipientPhone, 40.7128, -74.0060, {
      name: 'New York City',
      address: 'New York, NY, USA'
    });

    console.log('All messages sent successfully! ✅');
    
  } catch (error) {
    console.error('Error in basic example:', error);
    
    // Handle specific error types
    if (error.name === 'WhatsAppApiError') {
      console.error('WhatsApp API Error:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
    }
  }
}

// Run the example
basicExample();