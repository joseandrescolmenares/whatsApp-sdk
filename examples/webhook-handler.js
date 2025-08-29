/**
 * Webhook Handler Example
 * 
 * This example shows how to handle WhatsApp webhooks using Express.js
 */

const express = require('express');
const { WhatsAppClient } = require('whatsapp-sdk');

const app = express();
app.use(express.json());

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
  businessId: process.env.WHATSAPP_BUSINESS_ID
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = client.verifyWebhook(mode, token, challenge);
  
  if (result !== null) {
    res.status(200).send(challenge);
    console.log('Webhook verified successfully!');
  } else {
    res.status(403).send('Forbidden');
    console.log('Webhook verification failed!');
  }
});

// Webhook message handling (POST)
app.post('/webhook', async (req, res) => {
  try {
    // Parse incoming webhook
    const messages = client.parseWebhook(req.body);
    
    // Process each message
    for (const message of messages) {
      console.log('Received message:', {
        from: message.from,
        type: message.type,
        text: message.text,
        timestamp: message.timestamp
      });

      // Validate message is for our phone number
      if (message.phoneNumberId !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
        continue;
      }

      // Handle different message types
      await handleMessage(message);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).send('OK'); // Always respond with 200 to avoid retries
  }
});

async function handleMessage(message) {
  try {
    switch (message.type) {
      case 'text':
        await handleTextMessage(message);
        break;
      
      case 'interactive':
        await handleInteractiveMessage(message);
        break;
      
      case 'image':
        await handleMediaMessage(message);
        break;
      
      case 'audio':
        await handleMediaMessage(message);
        break;
      
      case 'document':
        await handleMediaMessage(message);
        break;
      
      case 'location':
        await handleLocationMessage(message);
        break;
      
      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  } catch (error) {
    console.error(`Error handling ${message.type} message:`, error);
  }
}

async function handleTextMessage(message) {
  const text = message.text.toLowerCase();
  
  // Simple echo bot with some commands
  if (text === 'hello' || text === 'hi') {
    await client.sendText(
      message.from,
      `Hello ${message.contact?.name || 'there'}! 👋\\n\\nThanks for trying our WhatsApp Business SDK!`
    );
  } else if (text === 'help') {
    await client.sendText(
      message.from,
      `🤖 Available commands:\\n\\n` +
      `• "hello" - Get a greeting\\n` +
      `• "help" - Show this help message\\n` +
      `• "buttons" - See interactive buttons\\n` +
      `• "list" - See a list menu\\n` +
      `• "image" - Get a sample image`
    );
  } else if (text === 'buttons') {
    await client.sendButtons(
      message.from,
      'Here are some interactive buttons:',
      [
        { id: 'btn_info', title: '📋 Info' },
        { id: 'btn_support', title: '💬 Support' },
        { id: 'btn_demo', title: '🚀 Demo' }
      ],
      {
        header: { type: 'text', text: 'Interactive Demo' },
        footer: 'Choose an option to continue'
      }
    );
  } else if (text === 'list') {
    await client.sendList(
      message.from,
      'Choose from our services:',
      'View Services',
      [
        {
          title: 'Development',
          rows: [
            { id: 'web_dev', title: 'Web Development', description: 'Custom websites & web apps' },
            { id: 'mobile_dev', title: 'Mobile Development', description: 'iOS & Android apps' }
          ]
        },
        {
          title: 'Consulting',
          rows: [
            { id: 'tech_consult', title: 'Tech Consulting', description: 'Technology strategy & advice' },
            { id: 'api_consult', title: 'API Integration', description: 'Connect your systems' }
          ]
        }
      ]
    );
  } else if (text === 'image') {
    await client.sendImage(message.from, {
      link: 'https://picsum.photos/800/600',
      caption: '📸 Here\'s a random beautiful image for you!'
    });
  } else {
    // Echo the message back
    await client.sendText(
      message.from,
      `You said: "${message.text}"\\n\\nType "help" for available commands.`
    );
  }
}

async function handleInteractiveMessage(message) {
  const buttonId = message.interactive?.button_id || message.interactive?.list_id;
  
  console.log('Interactive response received:', buttonId);
  
  // Handle button responses
  switch (buttonId) {
    case 'btn_info':
      await client.sendText(
        message.from,
        '📋 **WhatsApp Business SDK Info**\\n\\n' +
        '✅ Easy to use TypeScript/JavaScript SDK\\n' +
        '✅ Full WhatsApp Business API support\\n' +
        '✅ Built-in error handling & validation\\n' +
        '✅ Open source & community driven'
      );
      break;
      
    case 'btn_support':
      await client.sendText(
        message.from,
        '💬 **Need Support?**\\n\\n' +
        'Visit our GitHub repository:\\n' +
        'https://github.com/your-org/whatsapp-business-sdk\\n\\n' +
        'Or email us at: support@example.com'
      );
      break;
      
    case 'btn_demo':
      await client.sendText(
        message.from,
        '🚀 **SDK Demo**\\n\\n' +
        'This entire conversation is powered by our WhatsApp Business SDK!\\n\\n' +
        'Try typing "image", "buttons", or "list" to see more features.'
      );
      break;
      
    case 'web_dev':
    case 'mobile_dev':
    case 'tech_consult':
    case 'api_consult':
      await client.sendText(
        message.from,
        `Thanks for your interest in ${buttonId.replace('_', ' ')}! 🎯\\n\\n` +
        'A member of our team will contact you soon to discuss your requirements.'
      );
      break;
      
    default:
      await client.sendText(
        message.from,
        'Thanks for your selection! How can I help you further?'
      );
  }
}

async function handleMediaMessage(message) {
  try {
    // Download the media file
    console.log('Downloading media:', message.media?.id);
    
    if (message.media?.id) {
      const mediaBuffer = await client.downloadMedia(message.media.id);
      console.log(`Downloaded ${message.type} file:`, {
        size: mediaBuffer.length,
        mimeType: message.media.mime_type
      });
    }
    
    // Respond based on media type
    switch (message.type) {
      case 'image':
        await client.sendText(
          message.from,
          '📸 Great image! I received it successfully.\\n\\nImage processing features coming soon!'
        );
        break;
        
      case 'audio':
        await client.sendText(
          message.from,
          '🎵 Audio message received! I got your voice note.\\n\\nAudio transcription features coming soon!'
        );
        break;
        
      case 'document':
        await client.sendText(
          message.from,
          `📄 Document "${message.media?.filename}" received successfully!\\n\\nDocument analysis features coming soon!`
        );
        break;
    }
  } catch (error) {
    console.error('Error processing media:', error);
    await client.sendText(
      message.from,
      'Sorry, I had trouble processing your media file. Please try again.'
    );
  }
}

async function handleLocationMessage(message) {
  const { latitude, longitude, name, address } = message.location;
  
  await client.sendText(
    message.from,
    `📍 **Location Received**\\n\\n` +
    `📌 ${name || 'Location'}\\n` +
    `📍 ${address || 'No address provided'}\\n` +
    `🌐 Coordinates: ${latitude}, ${longitude}\\n\\n` +
    'Thanks for sharing your location!'
  );
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp webhook server running on port ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log('\\n🔧 Make sure to set these environment variables:');
  console.log('  - WHATSAPP_ACCESS_TOKEN');
  console.log('  - WHATSAPP_PHONE_NUMBER_ID');
  console.log('  - WHATSAPP_WEBHOOK_TOKEN');
  console.log('  - WHATSAPP_BUSINESS_ID');
});