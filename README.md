# WhatsApp SDK

[![npm version](https://badge.fury.io/js/whatsapp-client-sdk.svg)](https://badge.fury.io/js/whatsapp-client-sdk)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Website](https://img.shields.io/badge/Website-wazap.dev-blue)](https://www.wazap.dev/)

A powerful, easy-to-use TypeScript/JavaScript SDK for the WhatsApp Business API. Simplify your WhatsApp Business integration with a clean, intuitive API.

> 🌐 **[Visit wazap.dev](https://www.wazap.dev/)** for interactive documentation, live examples, and advanced tutorials.

## ✨ Features

- 🚀 **Easy to use** - Simple, intuitive API design
- 📝 **Full TypeScript support** - Complete type definitions included
- 🔄 **All message types** - Text, images, videos, documents, interactive messages, templates, contacts, stickers
- 💬 **Typing indicators & read receipts** - Enhanced user experience with real-time status updates
- 🎣 **Framework-agnostic webhooks** - Zero boilerplate webhook handling that works with any framework
- ❤️ **Incoming reactions & replies** - Full support for receiving and handling user reactions and message replies
- 📊 **Message status tracking** - Track delivery status (sent, delivered, read, failed) with detailed error handling
- 📁 **Media management** - Upload, download, and manage media files
- 🛡️ **Error handling** - Comprehensive error types and handling
- ⚡ **Modern** - Built with latest TypeScript and modern JavaScript features
- 🔒 **Secure** - Input validation and security best practices
- 📖 **Well documented** - Comprehensive documentation and practical examples
- 🌐 **Production ready** - Built-in retry logic, rate limiting, and enterprise features

## 📦 Installation

```bash
npm install whatsapp-client-sdk
```

```bash
yarn add whatsapp-client-sdk
```

```bash
pnpm add whatsapp-client-sdk
```

## 🚀 Quick Start

### 1. Initialize the Client

```typescript
import { WhatsAppClient } from 'whatsapp-client-sdk';

const client = new WhatsAppClient({
  accessToken: 'your-access-token',        // Required: Get from Meta Developer Console
  phoneNumberId: 'your-phone-number-id',   // Required: Your WhatsApp Business phone number ID
  webhookVerifyToken: 'your-verify-token'  // Required: For receiving messages
});
```

### 2. Send Your First Message

```typescript
// Send a simple text message
await client.sendText('+1234567890', 'Hello from WhatsApp Business SDK! 🚀');
console.log('Message sent successfully!');
```

### 3. Setup Webhook to Receive Messages

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Create webhook processor (handles verification & message parsing automatically)
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`Received: ${message.text} from ${message.from}`);
    
    // Auto-reply
    if (message.text.toLowerCase().includes('hello')) {
      await client.sendText(message.from, 'Hi! How can I help you?');
    }
  }
});

// Single endpoint handles both webhook verification and incoming messages
app.all('/webhook', async (req, res) => {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
});

app.listen(3000, () => console.log('Webhook ready on port 3000'));
```

## 🔧 Environment Setup

For production apps, use environment variables. Create a `.env` file:

```bash
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verify_token_here
WHATSAPP_BUSINESS_ID=your_business_id_here
```

Now update your client initialization from the Quick Start to use these variables:

```diff
const client = new WhatsAppClient({
-  accessToken: 'your-access-token',
-  phoneNumberId: 'your-phone-number-id', 
-  webhookVerifyToken: 'your-verify-token'
+  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
+  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
+  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN!,
+  businessId: process.env.WHATSAPP_BUSINESS_ID, // Optional
+  timeout: 30000,                              // Optional: Request timeout
+  apiVersion: 'v23.0'                          // Optional: API version
});
```

Test your connection:
```typescript
const isConnected = await client.testConnection();
console.log('WhatsApp API connected:', isConnected);
```

## 📱 Sending Messages

Now you can start sending different types of messages:

### Text Messages

```typescript
// Simple text
await client.sendText('+1234567890', 'Hello World!');

// With URL preview
await client.sendText('+1234567890', 'Check out https://example.com', {
  previewUrl: true
});

// Reply to a message
await client.sendText('+1234567890', 'This is a reply', {
  replyToMessageId: 'message-id-to-reply-to'
});
```

### Media Messages

```typescript
// Send image
await client.sendImage('+1234567890', {
  link: 'https://example.com/image.jpg',
  caption: 'Beautiful image!'
});

// Send video
await client.sendVideo('+1234567890', {
  id: 'media-id', // Previously uploaded media ID
  caption: 'Amazing video!'
});

// Send audio
await client.sendAudio('+1234567890', {
  link: 'https://example.com/audio.mp3'
});

// Send document
await client.sendDocument('+1234567890', {
  link: 'https://example.com/document.pdf',
  filename: 'important-document.pdf',
  caption: 'Please review this document'
});
```

### Interactive Messages

```typescript
// Buttons
await client.sendButtons(
  '+1234567890',
  'What would you like to do?',
  [
    { id: 'view_catalog', title: '📋 View Catalog' },
    { id: 'contact_support', title: '💬 Contact Support' },
    { id: 'track_order', title: '📦 Track Order' }
  ],
  {
    header: { type: 'text', text: 'Main Menu' },
    footer: 'Choose an option to continue'
  }
);

// List Menu
await client.sendList(
  '+1234567890',
  'Browse our categories:',
  'View Categories',
  [
    {
      title: 'Electronics',
      rows: [
        { id: 'phones', title: 'Phones', description: 'Latest smartphones' },
        { id: 'laptops', title: 'Laptops', description: 'High-performance laptops' }
      ]
    },
    {
      title: 'Clothing',
      rows: [
        { id: 'mens', title: 'Men\'s Clothing', description: 'Fashion for men' },
        { id: 'womens', title: 'Women\'s Clothing', description: 'Fashion for women' }
      ]
    }
  ]
);
```

### Template Messages

```typescript
await client.sendTemplate(
  '+1234567890',
  'hello_world',              // Template name
  'en_US',                    // Language code
  [                           // Optional components
    {
      type: 'header',
      parameters: [
        {
          type: 'text',
          text: 'John Doe'
        }
      ]
    },
    {
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: 'Your order #12345'
        }
      ]
    }
  ]
);
```

### Location Messages

```typescript
await client.sendLocation('+1234567890', 40.7128, -74.0060, {
  name: 'New York City',
  address: 'New York, NY, USA'
});
```

### Contact Messages

```typescript
await client.sendContacts('+1234567890', [
  {
    name: {
      formatted_name: 'John Smith',
      first_name: 'John',
      last_name: 'Smith'
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
      company: 'Tech Company',
      department: 'Development',
      title: 'Developer'
    }
  }
]);
```

### Sticker Messages

```typescript
// Send sticker by media ID
await client.sendSticker('+1234567890', {
  id: 'media-id-of-sticker'
});

// Send sticker by URL
await client.sendSticker('+1234567890', {
  link: 'https://example.com/sticker.webp'
});
```

## 💬 Typing Indicators & Read Receipts

Enhance user experience with typing indicators and read receipts:

### Typing Indicators

```typescript
// Show typing indicator
await client.sendTypingIndicator('+1234567890');

// Show typing indicator with custom duration (max 25 seconds)
await client.sendTypingIndicatorWithDuration('+1234567890', 15000);

// Best practice: Show typing before sending response
await client.sendTypingIndicator('+1234567890');
await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
await client.sendText('+1234567890', 'Here is your response!');
```

### Read Receipts

```typescript
// Mark a message as read
await client.markMessageAsRead('wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA');

// In webhook handler - auto-mark messages as read
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    // Mark message as read immediately
    await client.markMessageAsRead(message.id);
    
    // Show typing indicator while processing
    await client.sendTypingIndicator(message.from);
    
    // Process and respond
    const response = await processMessage(message.text);
    await client.sendText(message.from, response);
  }
});
```

### Smart Conversation Flow

```typescript
async function smartConversation(phoneNumber) {
  // 1. Show typing indicator
  await client.sendTypingIndicator(phoneNumber);
  
  // 2. Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Send response
  await client.sendText(phoneNumber, '¡Hola! ¿Cómo puedo ayudarte?');
  
  // 4. Show typing for follow-up
  await client.sendTypingIndicatorWithDuration(phoneNumber, 5000);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5. Send detailed information
  await client.sendText(phoneNumber, 'Aquí tienes las opciones disponibles...');
}
```

## 😍 Message Reactions

React to messages with emojis to enhance user engagement:

### Basic Reactions

```typescript
// Send reaction to a message
await client.sendReaction('+1234567890', 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA', '👍');

// Remove a reaction
await client.removeReaction('+1234567890', 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA');
```

### Convenience Methods

Use predefined methods for common reactions:

```typescript
// Common reactions
await client.reactWithLike('+1234567890', messageId);
await client.reactWithLove('+1234567890', messageId);
await client.reactWithLaugh('+1234567890', messageId);
await client.reactWithFire('+1234567890', messageId);
await client.reactWithCheck('+1234567890', messageId);

// More reactions available
await client.reactWithWow('+1234567890', messageId);
await client.reactWithSad('+1234567890', messageId);
await client.reactWithAngry('+1234567890', messageId);
await client.reactWithThumbsDown('+1234567890', messageId);
await client.reactWithHeartEyes('+1234567890', messageId);
await client.reactWithClap('+1234567890', messageId);
await client.reactWithCross('+1234567890', messageId);
```

### Using Reaction Constants

```typescript
import { REACTION_EMOJIS } from 'whatsapp-client-sdk';

// Use predefined emoji constants
await client.sendReaction('+1234567890', messageId, REACTION_EMOJIS.HEART);
await client.sendReaction('+1234567890', messageId, REACTION_EMOJIS.FIRE);
await client.sendReaction('+1234567890', messageId, REACTION_EMOJIS.CLAP);

// Available constants:
// LIKE, LOVE, LAUGH, WOW, SAD, ANGRY, THUMBS_UP, THUMBS_DOWN, 
// HEART, HEART_EYES, FIRE, CLAP, CHECK, CROSS
```

### Receiving Reactions and Replies

Handle incoming reactions and replies from users:

```typescript
const webhookProcessor = client.createWebhookProcessor({
  // Handle incoming reactions
  onReactionMessage: async (message) => {
    console.log(`User ${message.from} reacted with ${message.reaction.emoji}`);
    console.log(`Original message: ${message.reaction.message_id}`);

    // Thank them for the reaction
    await client.sendText(message.from, `Thanks for the ${message.reaction.emoji}!`);
  },

  // Handle replies (messages with context)
  onReplyMessage: async (message) => {
    console.log(`User replied to message: ${message.context.message_id}`);

    if (message.type === 'text') {
      console.log(`Reply text: ${message.text}`);
    }

    // Acknowledge the reply
    await client.replyToMessage(message.from, message.id, "Got your reply! 📨");
  },

  // Regular text messages (can also be replies)
  onTextMessage: async (message) => {
    if (message.context) {
      console.log('This text message is a reply!');
    }

    // Auto-react based on message content
    if (message.text.toLowerCase().includes('awesome')) {
      await client.reactWithFire(message.from, message.id);
    } else if (message.text.toLowerCase().includes('thanks')) {
      await client.reactWithHeart(message.from, message.id);
    } else {
      await client.reactWithLike(message.from, message.id);
    }
  }
});
```

### Message Status Tracking

Track delivery status of your outgoing messages:

```typescript
const webhookProcessor = client.createWebhookProcessor({
  // Handle message status updates (sent → delivered → read → failed)
  onMessageStatusUpdate: async (statusUpdate) => {
    console.log(`Message ${statusUpdate.id}: ${statusUpdate.status}`);
    console.log(`Recipient: ${statusUpdate.recipient_id}`);
    console.log(`Timestamp: ${new Date(parseInt(statusUpdate.timestamp) * 1000)}`);

    switch (statusUpdate.status) {
      case MessageStatus.SENT:
        console.log('✅ Message sent successfully');
        break;

      case MessageStatus.DELIVERED:
        console.log('📱 Message delivered to device');
        break;

      case MessageStatus.READ:
        console.log('👀 Message was read by recipient');
        // Maybe send a follow-up or mark as completed
        break;

      case MessageStatus.FAILED:
        console.log('❌ Message failed to send');
        if (statusUpdate.errors) {
          statusUpdate.errors.forEach(error => {
            console.log(`Error ${error.code}: ${error.title}`);

            // Handle specific errors
            if (error.code === 131047) {
              // 24-hour window expired - send template message
              await client.sendTemplate(statusUpdate.recipient_id, 'template_name');
            }
          });
        }
        break;
    }

    // Track pricing info for analytics
    if (statusUpdate.pricing) {
      console.log(`Cost: ${statusUpdate.pricing.category} (${statusUpdate.pricing.billable ? 'billable' : 'free'})`);
    }
  },

  // Regular message handling continues to work
  onTextMessage: async (message) => {
    const response = await client.sendText(message.from, 'Message received!');

    // The response will trigger status updates via webhook
    console.log(`Sent message ${response.messageId} - tracking status...`);
  }
});
```

### Auto-React in Webhooks

```typescript
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    // Auto-react based on message content
    if (message.text.toLowerCase().includes('awesome')) {
      await client.reactWithFire(message.from, message.id);
    } else if (message.text.toLowerCase().includes('thanks')) {
      await client.reactWithHeart(message.from, message.id);
    } else if (message.text.toLowerCase().includes('funny')) {
      await client.reactWithLaugh(message.from, message.id);
    } else {
      // Default reaction for any text message
      await client.reactWithLike(message.from, message.id);
    }
  }
});
```

## 📁 Media Management

```typescript
// Upload media
const mediaResponse = await client.uploadMedia(fileBuffer, 'image');
console.log('Media ID:', mediaResponse.id);

// Get media info
const mediaInfo = await client.getMediaInfo('media-id');
console.log('Media URL:', mediaInfo.url);

// Download media
const buffer = await client.downloadMedia('media-id');
// Use the buffer as needed
```

## 🔌 Advanced Webhook Features

### Multiple Message Types Handler

```typescript
const webhookProcessor = client.createWebhookProcessor({
  // Text messages
  onTextMessage: async (message) => {
    if (message.text.toLowerCase() === 'menu') {
      await client.sendButtons(message.from, 'Choose an option:', [
        { id: 'catalog', title: '📋 View Catalog' },
        { id: 'support', title: '💬 Contact Support' }
      ]);
    }
  },

  // Handle button clicks
  onButtonClick: async (message) => {
    const buttonId = message.interactive.button_id;
    switch (buttonId) {
      case 'catalog':
        await client.sendText(message.from, 'Here\'s our catalog...');
        break;
      case 'support':
        await client.sendText(message.from, 'Connecting you to support...');
        break;
    }
  },

  // Handle media messages (images, videos, documents)
  onImageMessage: async (message) => {
    // Download and process the image
    const buffer = await client.downloadMedia(message.media.id);
    await client.sendText(message.from, 'Thanks for the image!');
  },

  // Error handling
  onError: async (error, message) => {
    console.error('Webhook error:', error.message);
  }
});
```

### Framework Compatibility

Works with any Node.js framework:

```typescript
// Express.js / Fastify / Next.js / Nest.js / AWS Lambda
app.all('/webhook', async (req, res) => {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
});
```

## 🎯 Advanced Usage

### Error Handling

```typescript
import { 
  WhatsAppApiError, 
  RateLimitError, 
  MessageValidationError 
} from 'whatsapp-client-sdk';

try {
  await client.sendText('+invalid', 'This will fail');
} catch (error) {
  if (error instanceof MessageValidationError) {
    console.log('Validation error:', error.message);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof WhatsAppApiError) {
    console.log('WhatsApp API error:', error.details);
  }
}
```

### Custom Configuration

```typescript
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  timeout: 60000, // 60 second timeout
});

// Test connection
const isConnected = await client.testConnection();
console.log('Connected:', isConnected);
```

## 🎯 Next Steps

Now that you have the basics working, explore these advanced features:

1. **📱 Send Media**: Upload and send images, videos, documents
2. **🔘 Interactive Messages**: Use buttons and lists for better UX
3. **📞 Business Features**: Send contacts, locations, and stickers  
4. **🏗️ Scale Up**: Add error handling, logging, and production configs
5. **🌐 Deploy**: Use Next.js, Nest.js, or any framework you prefer

## 📚 API Reference

### WhatsAppClient Methods

| Method | Description | Returns |
|--------|-------------|---------|
| \`sendText(to, text, options?)\` | Send text message | \`Promise<MessageResponse>\` |
| \`sendImage(to, image, options?)\` | Send image message | \`Promise<MessageResponse>\` |
| \`sendVideo(to, video, options?)\` | Send video message | \`Promise<MessageResponse>\` |
| \`sendAudio(to, audio, options?)\` | Send audio message | \`Promise<MessageResponse>\` |
| \`sendDocument(to, document, options?)\` | Send document message | \`Promise<MessageResponse>\` |
| \`sendButtons(to, text, buttons, options?)\` | Send interactive buttons | \`Promise<MessageResponse>\` |
| \`sendList(to, text, buttonText, sections, options?)\` | Send interactive list | \`Promise<MessageResponse>\` |
| \`sendTemplate(to, name, language, components?)\` | Send template message | \`Promise<MessageResponse>\` |
| \`sendLocation(to, lat, lng, options?)\` | Send location message | \`Promise<MessageResponse>\` |
| \`sendContacts(to, contacts, options?)\` | Send contact message | \`Promise<MessageResponse>\` |
| \`sendSticker(to, sticker, options?)\` | Send sticker message | \`Promise<MessageResponse>\` |
| \`sendTypingIndicator(to)\` | Show typing indicator | \`Promise<TypingIndicatorResponse>\` |
| \`sendTypingIndicatorWithDuration(to, duration?)\` | Show typing indicator with custom duration | \`Promise<TypingIndicatorResponse>\` |
| \`markMessageAsRead(messageId)\` | Mark message as read | \`Promise<TypingIndicatorResponse>\` |
| \`sendReaction(to, messageId, emoji)\` | Send reaction to message | \`Promise<ReactionResponse>\` |
| \`reactWithLike(to, messageId)\` | React with like emoji | \`Promise<ReactionResponse>\` |
| \`reactWithLove(to, messageId)\` | React with love emoji | \`Promise<ReactionResponse>\` |
| \`reactWithLaugh(to, messageId)\` | React with laugh emoji | \`Promise<ReactionResponse>\` |
| \`reactWithFire(to, messageId)\` | React with fire emoji | \`Promise<ReactionResponse>\` |
| \`reactWithCheck(to, messageId)\` | React with check emoji | \`Promise<ReactionResponse>\` |
| \`removeReaction(to, messageId)\` | Remove reaction from message | \`Promise<ReactionResponse>\` |
| \`uploadMedia(file, type)\` | Upload media file | \`Promise<MediaResponse>\` |
| \`downloadMedia(mediaId)\` | Download media file | \`Promise<Buffer>\` |
| \`getMediaInfo(mediaId)\` | Get media information | \`Promise<MediaInfo>\` |
| \`verifyWebhook(mode, token, challenge)\` | Verify webhook | \`number \\| null\` |
| \`parseWebhook(payload)\` | Parse webhook payload | \`ProcessedIncomingMessage[]\` |
| \`createWebhookProcessor(handlers)\` | Create framework-agnostic webhook processor | \`WebhookProcessor\` |
| \`testConnection()\` | Test API connection | \`Promise<boolean>\` |

### Webhook Handlers

| Handler | Description | Parameters |
|---------|-------------|------------|
| \`onTextMessage\` | Handle incoming text messages | \`(message: ProcessedIncomingMessage & { text: string })\` |
| \`onImageMessage\` | Handle incoming image messages | \`(message: ProcessedIncomingMessage & { media: MediaInfo })\` |
| \`onVideoMessage\` | Handle incoming video messages | \`(message: ProcessedIncomingMessage & { media: MediaInfo })\` |
| \`onAudioMessage\` | Handle incoming audio messages | \`(message: ProcessedIncomingMessage & { media: MediaInfo })\` |
| \`onDocumentMessage\` | Handle incoming document messages | \`(message: ProcessedIncomingMessage & { media: MediaInfo })\` |
| \`onLocationMessage\` | Handle incoming location messages | \`(message: ProcessedIncomingMessage & { location: LocationInfo })\` |
| \`onStickerMessage\` | Handle incoming sticker messages | \`(message: ProcessedIncomingMessage & { media: MediaInfo })\` |
| \`onContactMessage\` | Handle incoming contact messages | \`(message: ProcessedIncomingMessage)\` |
| \`onButtonClick\` | Handle button interactions | \`(message: ProcessedIncomingMessage & { interactive: InteractiveInfo })\` |
| \`onListSelect\` | Handle list selections | \`(message: ProcessedIncomingMessage & { interactive: InteractiveInfo })\` |
| \`onReactionMessage\` | **NEW:** Handle incoming reactions | \`(message: ProcessedIncomingMessage & { reaction: { message_id: string, emoji: string } })\` |
| \`onReplyMessage\` | **NEW:** Handle reply messages | \`(message: ProcessedIncomingMessage & { context: { message_id: string } })\` |
| \`onMessageStatusUpdate\` | **NEW:** Handle message delivery status | \`(statusUpdate: MessageStatusUpdate)\` |
| \`onUnknownMessage\` | Handle unknown message types | \`(message: ProcessedIncomingMessage)\` |
| \`onError\` | Handle errors | \`(error: Error, message?: ProcessedIncomingMessage)\` |

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/joseandrescolmenares/whatsapp-sdk.git
# or visit https://www.wazap.dev/ for documentation

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)
- [wazap.dev](https://www.wazap.dev/) - Official SDK Website & Documentation

## 📞 Support

- 🌐 Website: [wazap.dev](https://www.wazap.dev/)
- 📧 Email: joseandrescolmenares02@gmail.com
- 💼 LinkedIn: [Jose Andres Colmenares](https://www.linkedin.com/in/joseandrescolmenares/)
- 🐛 Issues: [GitHub Issues](https://github.com/joseandrescolmenares/whatsapp-sdk/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/joseandrescolmenares/whatsapp-sdk/discussions)

---

Made with ❤️ for the developer community | Visit [wazap.dev](https://www.wazap.dev/)