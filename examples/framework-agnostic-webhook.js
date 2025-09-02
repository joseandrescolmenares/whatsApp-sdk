/**
 * Framework Agnostic Webhook Example
 * 
 * This example shows how to use the WebhookProcessor with any framework
 * (Express, Fastify, Koa, Next.js, etc.)
 */

const { WhatsAppClient } = require('whatsapp-client-sdk');

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
});

// Create webhook processor
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log('Message:', message.text);
    await client.sendText(message.from, 'Echo: ' + message.text);
  },
  onImageMessage: async (message) => {
    await client.sendText(message.from, 'Image received!');
  },
  onError: async (error) => {
    console.error('Error:', error.message);
  }
});

// =============================================================================
// EJEMPLO 1: Express.js
// =============================================================================
function expressExample() {
  const express = require('express');
  const app = express();
  app.use(express.json());

  app.all('/webhook', async (req, res) => {
    const result = await webhookProcessor.processWebhook(req.body, req.query);
    res.status(result.status).send(result.response);
  });

  return app;
}

// =============================================================================
// EJEMPLO 2: Fastify
// =============================================================================
async function fastifyExample() {
  const fastify = require('fastify')({ logger: true });

  fastify.all('/webhook', async (request, reply) => {
    const result = await webhookProcessor.processWebhook(request.body, request.query);
    reply.code(result.status).send(result.response);
  });

  return fastify;
}

// =============================================================================
// EJEMPLO 3: Next.js API Route
// =============================================================================
// Archivo: pages/api/webhook.js o app/api/webhook/route.js
/*
export async function GET(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  
  const result = await webhookProcessor.processWebhook({}, query);
  
  return new Response(result.response, {
    status: result.status,
    headers: { 'Content-Type': 'text/plain' }
  });
}

export async function POST(request) {
  const body = await request.json();
  const result = await webhookProcessor.processWebhook(body);
  
  return new Response(result.response, {
    status: result.status,
    headers: { 'Content-Type': 'text/plain' }
  });
}
*/

// =============================================================================
// EJEMPLO 4: Node.js HTTP puro
// =============================================================================
function nodeHttpExample() {
  const http = require('http');
  const url = require('url');

  return http.createServer(async (req, res) => {
    if (req.url === '/webhook' || req.url.startsWith('/webhook?')) {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const parsedUrl = url.parse(req.url, true);
          const bodyObj = body ? JSON.parse(body) : {};
          
          const result = await webhookProcessor.processWebhook(bodyObj, parsedUrl.query);
          
          res.writeHead(result.status, { 'Content-Type': 'text/plain' });
          res.end(result.response.toString());
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
}


// Run example (Express by default)
if (require.main === module) {
  const app = expressExample();
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
  });
}

module.exports = {
  expressExample,
  fastifyExample,
  nodeHttpExample,
  koaExample,
  hapiExample,
  webhookProcessor
};