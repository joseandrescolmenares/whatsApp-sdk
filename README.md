# WhatsApp SDK

[![npm version](https://badge.fury.io/js/whatsapp-sdk.svg)](https://badge.fury.io/js/whatsapp-sdk)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, easy-to-use TypeScript/JavaScript SDK for the WhatsApp Business API. Simplify your WhatsApp Business integration with a clean, intuitive API.

## ✨ Features

- 🚀 **Easy to use** - Simple, intuitive API design
- 📝 **Full TypeScript support** - Complete type definitions included
- 🔄 **All message types** - Text, images, videos, documents, interactive messages, templates
- 🎯 **Webhook handling** - Built-in webhook verification and message parsing
- 📁 **Media management** - Upload, download, and manage media files
- 🛡️ **Error handling** - Comprehensive error types and handling
- ⚡ **Modern** - Built with latest TypeScript and modern JavaScript features
- 🔒 **Secure** - Input validation and security best practices
- 📖 **Well documented** - Comprehensive documentation and examples

## 📦 Installation

```bash
npm install whatsapp-sdk
```

```bash
yarn add whatsapp-sdk
```

```bash
pnpm add whatsapp-sdk
```

## 🚀 Quick Start

```typescript
import { WhatsAppClient } from 'whatsapp-sdk';

// Initialize the client
const client = new WhatsAppClient({
  accessToken: 'your-access-token',
  phoneNumberId: 'your-phone-number-id'
});

// Send a text message
await client.sendText('+1234567890', 'Hello from WhatsApp Business SDK! 🚀');

// Send an image
await client.sendImage('+1234567890', {
  link: 'https://example.com/image.jpg',
  caption: 'Check this out!'
});

// Send interactive buttons
await client.sendButtons(
  '+1234567890',
  'Choose an option:',
  [
    { id: 'option_1', title: 'Option 1' },
    { id: 'option_2', title: 'Option 2' }
  ]
);
```

## 🔧 Configuration

```typescript
import { WhatsAppClient } from 'whatsapp-sdk';

const client = new WhatsAppClient({
  accessToken: 'your-access-token',        // Required: Your WhatsApp Business API token
  phoneNumberId: 'your-phone-number-id',   // Required: Your phone number ID
  baseUrl: 'https://graph.facebook.com',   // Optional: API base URL
  apiVersion: 'v17.0',                     // Optional: API version
  timeout: 30000,                          // Optional: Request timeout in ms
  webhookVerifyToken: 'your-verify-token', // Optional: For webhook verification
  businessId: 'your-business-id'           // Optional: Your business ID
});
```

## 📱 Sending Messages

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

## 🎣 Webhook Handling

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = client.verifyWebhook(mode, token, challenge);
  
  if (result !== null) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Handle incoming messages (POST)
app.post('/webhook', (req, res) => {
  const messages = client.parseWebhook(req.body);
  
  messages.forEach(message => {
    console.log('Received:', message);
    
    if (message.type === 'text') {
      // Echo the message back
      client.sendText(message.from, \`You said: \${message.text}\`);
    }
  });

  res.status(200).send('OK');
});
```

## 🎯 Advanced Usage

### Error Handling

```typescript
import { 
  WhatsAppApiError, 
  RateLimitError, 
  MessageValidationError 
} from 'whatsapp-sdk';

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

## 🔐 Environment Variables

Create a \`.env\` file in your project:

```bash
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verify_token_here
WHATSAPP_BUSINESS_ID=your_business_id_here
```

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
| \`uploadMedia(file, type)\` | Upload media file | \`Promise<MediaResponse>\` |
| \`downloadMedia(mediaId)\` | Download media file | \`Promise<Buffer>\` |
| \`getMediaInfo(mediaId)\` | Get media information | \`Promise<MediaInfo>\` |
| \`verifyWebhook(mode, token, challenge)\` | Verify webhook | \`number \\| null\` |
| \`parseWebhook(payload)\` | Parse webhook payload | \`ProcessedIncomingMessage[]\` |
| \`testConnection()\` | Test API connection | \`Promise<boolean>\` |

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/joseandrespena/whatsapp-sdk.git

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

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/joseandrespena/whatsapp-sdk/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/joseandrespena/whatsapp-sdk/discussions)

---

Made with ❤️ for the developer community