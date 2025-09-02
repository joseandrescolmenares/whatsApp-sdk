# WhatsApp SDK

[![npm version](https://badge.fury.io/js/whatsapp-client-sdk.svg)](https://badge.fury.io/js/whatsapp-client-sdk)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Website](https://img.shields.io/badge/Website-wazap.dev-blue)](https://wazap.dev)

A powerful, easy-to-use TypeScript/JavaScript SDK for the WhatsApp Business API. Simplify your WhatsApp Business integration with a clean, intuitive API.

> 🌐 **[Visit wazap.dev](https://wazap.dev)** for interactive documentation, live examples, and advanced tutorials.

## ✨ Features

- 🚀 **Easy to use** - Simple, intuitive API design
- 📝 **Full TypeScript support** - Complete type definitions included
- 🔄 **All message types** - Text, images, videos, documents, interactive messages, templates, contacts, stickers
- 🎣 **Framework-agnostic webhooks** - Zero boilerplate webhook handling that works with any framework
- 📁 **Media management** - Upload, download, and manage media files
- 🛡️ **Error handling** - Comprehensive error types and handling
- ⚡ **Modern** - Built with latest TypeScript and modern JavaScript features
- 🔒 **Secure** - Input validation and security best practices
- 📖 **Well documented** - Comprehensive documentation and 5 practical examples
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

```typescript
import { WhatsAppClient } from 'whatsapp-client-sdk';

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
import { WhatsAppClient } from 'whatsapp-client-sdk';

const client = new WhatsAppClient({
  accessToken: 'your-access-token',        // Required: Your WhatsApp Business API token
  phoneNumberId: 'your-phone-number-id',   // Required: Your phone number ID
  baseUrl: 'https://graph.facebook.com',   // Optional: API base URL
  apiVersion: 'v23.0',                     // Optional: API version
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

### Contact Messages

```typescript
await client.sendContacts('+1234567890', [
  {
    name: {
      formatted_name: 'Juan Pérez',
      first_name: 'Juan',
      last_name: 'Pérez'
    },
    phones: [
      {
        phone: '+1234567890',
        type: 'WORK'
      }
    ],
    emails: [
      {
        email: 'juan@empresa.com',
        type: 'WORK'
      }
    ],
    org: {
      company: 'Mi Empresa',
      department: 'Desarrollo',
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

### 🌟 Framework-Agnostic Webhook Processor (Revolutionary)

The **most advanced webhook system** in any WhatsApp SDK - works with **ANY framework** with zero boilerplate:

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Create webhook processor with handlers
const webhookProcessor = client.createWebhookProcessor({
  // Handle text messages
  onTextMessage: async (message) => {
    console.log(`Text received: ${message.text}`);
    
    if (message.text.toLowerCase().includes('hello')) {
      await client.sendText(message.from, 'Hi there! How can I help?');
    } else {
      await client.sendText(message.from, `You said: ${message.text}`);
    }
  },

  // Handle images
  onImageMessage: async (message) => {
    console.log('Image received:', message.media.id);
    await client.sendText(message.from, 'Thanks for the image!');
  },

  // Handle button clicks
  onButtonClick: async (message) => {
    console.log(`Button clicked: ${message.interactive.button_id}`);
    
    switch (message.interactive.button_id) {
      case 'catalog':
        await client.sendText(message.from, 'Here\'s our catalog...');
        break;
      case 'support':
        await client.sendText(message.from, 'Connecting you to support...');
        break;
      default:
        await client.sendText(message.from, 'Option selected: ' + message.interactive.button_id);
    }
  },

  // Handle errors
  onError: async (error, message) => {
    console.error('Webhook error:', error.message);
  }
});

// Single endpoint for GET and POST
app.all('/webhook', async (req, res) => {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
});
```

### 🌐 Universal Framework Support

Our webhook processor works seamlessly with **any Node.js framework**:

```typescript
// Express.js
app.all('/webhook', async (req, res) => {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
});

// Fastify
fastify.all('/webhook', async (request, reply) => {
  const result = await webhookProcessor.processWebhook(request.body, request.query);
  reply.code(result.status).send(result.response);
});

// Next.js App Router (route.js)
export async function POST(request) {
  const body = await request.json();
  const result = await webhookProcessor.processWebhook(body);
  return new Response(result.response, { status: result.status });
}

// Next.js Pages Router (api/webhook.js)
export default async function handler(req, res) {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
}

// Nest.js Controller
@Post('webhook')
async handleWebhook(@Body() body, @Res() res) {
  const result = await this.whatsappService.processWebhook(body);
  res.status(result.status).send(result.response);
}

// AWS Lambda
exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const result = await webhookProcessor.processWebhook(body, event.queryStringParameters);
  return { statusCode: result.status, body: result.response.toString() };
};

// Vercel Functions
export default async function handler(req, res) {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
}

// Pure Node.js HTTP
const server = http.createServer(async (req, res) => {
  if (req.url === '/webhook') {
    const body = await getRequestBody(req);
    const query = url.parse(req.url, true).query;
    const result = await webhookProcessor.processWebhook(body, query);
    res.writeHead(result.status).end(result.response.toString());
  }
});
```

### Manual Webhook Handling

If you need more control:

```typescript
app.get('/webhook', (req, res) => {
  const result = client.verifyWebhook(
    req.query['hub.mode'],
    req.query['hub.verify_token'],
    req.query['hub.challenge']
  );
  res.status(result ? 200 : 403).send(result || 'Forbidden');
});

app.post('/webhook', (req, res) => {
  const messages = client.parseWebhook(req.body);
  messages.forEach(async (message) => {
    // Handle messages manually
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
| \`sendContacts(to, contacts, options?)\` | Send contact message | \`Promise<MessageResponse>\` |
| \`sendSticker(to, sticker, options?)\` | Send sticker message | \`Promise<MessageResponse>\` |
| \`uploadMedia(file, type)\` | Upload media file | \`Promise<MediaResponse>\` |
| \`downloadMedia(mediaId)\` | Download media file | \`Promise<Buffer>\` |
| \`getMediaInfo(mediaId)\` | Get media information | \`Promise<MediaInfo>\` |
| \`verifyWebhook(mode, token, challenge)\` | Verify webhook | \`number \\| null\` |
| \`parseWebhook(payload)\` | Parse webhook payload | \`ProcessedIncomingMessage[]\` |
| \`createWebhookProcessor(handlers)\` | Create framework-agnostic webhook processor | \`WebhookProcessor\` |
| \`testConnection()\` | Test API connection | \`Promise<boolean>\` |

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/joseandrescolmenares/whatsapp-sdk.git
# or visit https://wazap.dev for documentation

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
- [wazap.dev](https://wazap.dev) - Official SDK Website & Documentation

## 📚 Examples

We provide **7 comprehensive examples** to get you started quickly:

### 🎯 [Basic Usage](examples/basic-usage.js)
Complete example showing all message types:
- Text messages with URL preview
- Image, video, audio, document messages
- Interactive buttons and lists
- Location sharing
- Error handling patterns

### 🎣 [Simple Webhook Handler](examples/simple-webhook-handler.js)
Minimal webhook implementation using our framework-agnostic processor:
- Zero boilerplate setup
- Text message auto-responder
- Image and media handling
- Smart routing based on message content

### 🌐 [Framework-Agnostic Webhook](examples/framework-agnostic-webhook.js)
Demonstrates webhook processor with multiple frameworks:
- Express.js integration
- Fastify integration  
- Next.js API routes
- AWS Lambda functions
- Node.js HTTP server

### 👥 [Contacts & Stickers](examples/contacts-and-stickers.js)
Advanced features for sharing contacts and stickers:
- Complete contact information sharing
- Multiple contacts in one message
- Sticker messages with WebP format
- Professional contact cards

### 🤖 [Complete Webhook Bot](examples/webhook-handler.js)
Full-featured chatbot example with:
- Command-based responses (hello, help, buttons, list)
- Interactive button handling
- List menu selections
- Media file processing and download
- Location message handling
- Professional error handling
- Express.js server setup

### ⚡ [Next.js Integration](examples/nextjs-webhook.js)
Complete Next.js implementation with both routing systems:
- **App Router (Next.js 13+)**: Modern route.js API handlers
- **Pages Router (Next.js 12)**: Traditional API routes
- Vercel deployment configuration
- Middleware for security and logging
- Production-ready setup with environment variables
- Works with both development and production

### 🦅 [Nest.js Enterprise](examples/nestjs-webhook.ts)
Enterprise-grade implementation with full Nest.js architecture:
- **Dependency Injection**: Service-based architecture
- **Guards & Interceptors**: Security and logging middleware
- **Decorators**: Clean, declarative code structure
- **TypeScript First**: Full type safety throughout
- **Modular Design**: Scalable module organization
- **Health Checks**: Production monitoring endpoints
- **Error Handling**: Enterprise-level error management

Each example includes:
- ✅ Complete working code
- ✅ Environment variable setup
- ✅ Error handling patterns
- ✅ TypeScript-ready
- ✅ Production best practices

## 🎯 Why Choose This SDK?

### 🌟 **Unique Features Not Found Elsewhere**

1. **Framework-Agnostic Webhooks**: Only SDK that works with ANY Node.js framework
2. **Zero Boilerplate**: One line webhook handling regardless of your stack
3. **Enterprise TypeScript**: 100% type-safe with intersection types
4. **Smart Error Handling**: Context-aware error handling with message details
5. **Production Ready**: Built-in retry logic, rate limiting, and performance optimizations

### 📊 **Comparison with Other SDKs**

| Feature | This SDK | Twilio SDK | Other SDKs |
|---------|----------|------------|------------|
| Framework Agnostic | ✅ **Unique** | ❌ | ❌ |
| Full TypeScript | ✅ Complete | ⚠️ Partial | ❌ Basic |
| Zero Boilerplate | ✅ One line | ❌ Complex | ❌ Complex |
| All Message Types | ✅ 12 types | ⚠️ Limited | ⚠️ Limited |
| Error Handling | ✅ Enterprise | ⚠️ Basic | ❌ Minimal |
| Examples | ✅ 7 complete | ⚠️ Few | ❌ None |
| Next.js Support | ✅ Both routers | ❌ | ❌ |
| Nest.js Support | ✅ Full enterprise | ❌ | ❌ |

## 📞 Support

- 🌐 Website: [wazap.dev](https://wazap.dev)
- 📧 Email: joseandrescolmenares02@gmail.com
- 💼 LinkedIn: [Jose Andres Colmenares](https://www.linkedin.com/in/joseandrescolmenares/)
- 🐛 Issues: [GitHub Issues](https://github.com/joseandrescolmenares/whatsapp-sdk/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/joseandrescolmenares/whatsapp-sdk/discussions)
- 📖 Technical Guide: [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md)

---

Made with ❤️ for the developer community | Visit [wazap.dev](https://wazap.dev)