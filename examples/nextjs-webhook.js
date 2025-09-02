/**
 * Next.js Webhook Integration Example
 * 
 * Este ejemplo muestra cómo integrar el WhatsApp SDK con Next.js
 * usando App Router (Next.js 13+) y Pages Router (Next.js 12)
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Create the webhook processor
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`📝 [Next.js] Text received: ${message.text}`);
    
    if (message.text.toLowerCase().includes('next')) {
      await client.sendText(
        message.from, 
        '⚡ Hello from Next.js! This message comes from a Next.js 13+ API Route.'
      );
    } else if (message.text.toLowerCase().includes('info')) {
      await client.sendButtons(
        message.from,
        'Information about Next.js:',
        [
          { id: 'next_features', title: '🚀 Features' },
          { id: 'next_performance', title: '📊 Performance' },
          { id: 'next_deploy', title: '🌐 Deploy' }
        ],
        {
          header: { type: 'text', text: 'Next.js Info' },
          footer: 'Powered by wazap.dev'
        }
      );
    } else {
      await client.sendText(
        message.from,
        `🔄 Echo from Next.js: "${message.text}"`
      );
    }
  },

  onButtonClick: async (message) => {
    const buttonId = message.interactive.button_id;
    console.log(`🔘 [Next.js] Button pressed: ${buttonId}`);
    
    switch (buttonId) {
      case 'next_features':
        await client.sendText(
          message.from,
          '🚀 **Next.js Features:**\n\n' +
          '✅ App Router\n' +
          '✅ Server Components\n' +
          '✅ Static Site Generation\n' +
          '✅ API Routes\n' +
          '✅ Middleware\n' +
          '✅ Image Optimization'
        );
        break;
      
      case 'next_performance':
        await client.sendText(
          message.from,
          '📊 **Next.js Performance:**\n\n' +
          '⚡ Automatic code splitting\n' +
          '🎯 Built-in optimization\n' +
          '🚀 Fast refresh\n' +
          '📦 Bundle analysis\n' +
          '🌐 CDN optimized'
        );
        break;
      
      case 'next_deploy':
        await client.sendText(
          message.from,
          '🌐 **Deploy Options:**\n\n' +
          '▲ Vercel (recommended)\n' +
          '☁️ AWS Lambda\n' +
          '🚀 Netlify\n' +
          '🐳 Docker\n' +
          '📦 Static Export'
        );
        break;
    }
  },

  onImageMessage: async (message) => {
    console.log(`🖼️ [Next.js] Image received: ${message.media.id}`);
    await client.sendText(
      message.from,
      '📸 Image processed with Next.js! Works perfectly with our SDK.'
    );
  },

  onError: async (error, message) => {
    console.error('❌ [Next.js] Error:', error.message);
    if (message) {
      await client.sendText(
        message.from,
        '⚠️ Temporary error in Next.js. Our team is reviewing it.'
      );
    }
  }
});

// =============================================================================
// APP ROUTER (Next.js 13+) - app/api/webhook/route.js
// =============================================================================

// GET handler for webhook verification
async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams);
    
    console.log('🔍 [Next.js App Router] GET - Webhook verification');
    
    const result = await webhookProcessor.processWebhook({}, query);
    
    return new Response(result.response.toString(), {
      status: result.status,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('❌ [Next.js App Router] GET Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST handler for incoming messages
async function POST(request) {
  try {
    const body = await request.json();
    
    console.log('📨 [Next.js App Router] POST - Processing webhook');
    
    const result = await webhookProcessor.processWebhook(body);
    
    // Log processed messages
    if (result.messages && result.messages.length > 0) {
      console.log(`✅ [Next.js App Router] Processed ${result.messages.length} messages`);
    }
    
    return new Response(result.response, {
      status: result.status,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('❌ [Next.js App Router] POST Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// =============================================================================
// PAGES ROUTER (Next.js 12) - pages/api/webhook.js
// =============================================================================

async function pagesRouterHandler(req, res) {
  try {
    if (req.method === 'GET') {
      // Webhook verification
      console.log('🔍 [Next.js Pages Router] GET - Webhook verification');
      
      const result = await webhookProcessor.processWebhook({}, req.query);
      
      res.status(result.status).send(result.response.toString());
    } 
    else if (req.method === 'POST') {
      // Process incoming messages
      console.log('📨 [Next.js Pages Router] POST - Processing webhook');
      
      const result = await webhookProcessor.processWebhook(req.body);
      
      // Log processed messages
      if (result.messages && result.messages.length > 0) {
        console.log(`✅ [Next.js Pages Router] Processed ${result.messages.length} messages`);
      }
      
      res.status(result.status).send(result.response);
    } 
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ [Next.js Pages Router] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// =============================================================================
// MIDDLEWARE EXAMPLE - middleware.js
// =============================================================================

function createWebhookMiddleware() {
  return async function middleware(request) {
    // Solo procesar rutas de webhook
    if (request.nextUrl.pathname === '/api/webhook') {
      console.log(`🔍 [Middleware] ${request.method} ${request.nextUrl.pathname}`);
      
      // Validaciones de seguridad
      const userAgent = request.headers.get('user-agent');
      if (!userAgent || !userAgent.includes('WhatsApp')) {
        console.warn('⚠️ [Middleware] Suspicious request without WhatsApp user-agent');
      }
      
      // Rate limiting básico (en producción usar redis)
      const ip = request.ip || 'unknown';
      console.log(`📍 [Middleware] Request from IP: ${ip}`);
    }
    
    // Continuar con el procesamiento normal
    return;
  };
}

// =============================================================================
// CONFIGURATION EXAMPLES
// =============================================================================

// next.config.js
const nextConfig = {
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/whatsapp-webhook',
        destination: '/api/webhook'
      }
    ];
  },
  
  // Environment variables
  env: {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_WEBHOOK_TOKEN: process.env.WHATSAPP_WEBHOOK_TOKEN,
  },
  
  // API configuration
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  }
};

// =============================================================================
// DEPLOYMENT EXAMPLES
// =============================================================================

// vercel.json
const vercelConfig = {
  "functions": {
    "app/api/webhook/route.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "WHATSAPP_ACCESS_TOKEN": "@whatsapp-access-token",
    "WHATSAPP_PHONE_NUMBER_ID": "@whatsapp-phone-number-id", 
    "WHATSAPP_WEBHOOK_TOKEN": "@whatsapp-webhook-token"
  }
};

// Export handlers based on router type
module.exports = {
  // App Router exports
  GET,
  POST,
  
  // Pages Router export
  default: pagesRouterHandler,
  pagesRouterHandler,
  
  // Utilities
  webhookProcessor,
  createWebhookMiddleware,
  nextConfig,
  vercelConfig
};

// =============================================================================
// USAGE INSTRUCTIONS
// =============================================================================

/*
📋 SETUP INSTRUCTIONS:

1. APP ROUTER (Next.js 13+):
   - Create: app/api/webhook/route.js
   - Export GET and POST functions
   - Deploy to Vercel with environment variables

2. PAGES ROUTER (Next.js 12):
   - Create: pages/api/webhook.js
   - Export default function
   - Handle both GET and POST in same function

3. ENVIRONMENT VARIABLES (.env.local):
   WHATSAPP_ACCESS_TOKEN=your_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
   WHATSAPP_WEBHOOK_TOKEN=your_verify_token_here

4. DEPLOYMENT:
   - Vercel: npm run build && vercel --prod
   - Netlify: npm run build && npm run export
   - AWS Lambda: Use @serverless-nextjs/lambda-at-edge

5. WEBHOOK URL:
   - Development: http://localhost:3000/api/webhook
   - Production: https://yourapp.vercel.app/api/webhook
   - Documentation: https://wazap.dev

✅ BENEFITS:
- Zero boilerplate with webhook processor
- Works with both App Router and Pages Router  
- Automatic webhook verification
- Type-safe message handling
- Production-ready error handling
- Vercel-optimized deployment
- Full documentation at https://wazap.dev
*/