/**
 * WhatsApp SDK + Supabase Integration Example
 *
 * This example shows how to integrate the WhatsApp SDK with Supabase
 * to automatically persist messages, maintain conversation threads,
 * and provide powerful search and analytics capabilities.
 */

const { WhatsAppClient, StorageManager } = require('whatsapp-client-sdk');

// Basic Supabase integration example
async function basicSupabaseExample() {
  const client = new WhatsAppClient({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

    // Enable Supabase storage with basic features
    storage: {
      enabled: true,
      provider: 'supabase',
      options: {
        url: process.env.SUPABASE_URL,
        apiKey: process.env.SUPABASE_ANON_KEY,
        autoCreateTables: true, // Automatically create database tables
      },
      features: {
        persistIncoming: true,    // Save received messages
        persistOutgoing: true,    // Save sent messages
        persistStatus: true,      // Save delivery status updates
        autoConversations: true,  // Group messages into conversations
        createThreads: true,      // Maintain reply relationships
        enableSearch: true,       // Enable full-text search
      }
    }
  });

  // Initialize storage (creates tables if needed)
  await client.initializeStorage();

  // Send a message (automatically persisted)
  const response = await client.sendText('+1234567890', 'Hello! This message will be saved to Supabase.');
  console.log('Message sent:', response.messageId);

  // Get conversation history
  const conversation = await client.getConversation('+1234567890', {
    limit: 50,
    offset: 0
  });

  console.log(`Found ${conversation.data.total} messages in conversation`);
  console.log('Recent messages:', conversation.data.messages.slice(0, 3));

  // Search for messages
  const searchResults = await client.searchMessages({
    text: 'hello',
    phoneNumber: '+1234567890',
    limit: 10
  });

  console.log(`Found ${searchResults.data.total} messages matching 'hello'`);

  // Get analytics
  const analytics = await client.getConversationAnalytics('+1234567890', {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date()
  });

  console.log('Conversation analytics:', {
    totalMessages: analytics.data.totalMessages,
    incomingMessages: analytics.data.incomingMessages,
    outgoingMessages: analytics.data.outgoingMessages
  });
}

// Advanced Supabase integration with custom features
async function advancedSupabaseExample() {
  const client = new WhatsAppClient({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

    storage: {
      enabled: true,
      provider: 'supabase',
      options: {
        url: process.env.SUPABASE_URL,
        apiKey: process.env.SUPABASE_ANON_KEY,
        schema: 'whatsapp',           // Use custom schema
        tablePrefix: 'wa_',           // Custom table prefix
        autoCreateTables: true,
        enableRLS: true,              // Row Level Security
      },
      features: {
        persistIncoming: true,
        persistOutgoing: true,
        persistStatus: true,
        autoConversations: true,
        persistMedia: true,           // Download and store media files
        createThreads: true,
        enableSearch: true,
        anonymizeData: false,         // Don't anonymize phone numbers
        retentionDays: 365           // Auto-delete messages after 1 year
      }
    }
  });

  await client.initializeStorage();

  // Setup webhook processor with storage integration
  const webhookProcessor = client.createWebhookProcessor({
    onTextMessage: async (message) => {
      console.log(`Received text message: ${message.text}`);
      console.log('Message automatically saved to Supabase!');

      // Get the full conversation thread including this message
      const thread = await client.getConversationThread(message.from);
      console.log(`Conversation has ${thread.data.totalMessages} messages`);
    },

    onImageMessage: async (message) => {
      console.log('Received image message, media info saved to Supabase');

      // If persistMedia is enabled, the media file would be downloaded
      // and stored in Supabase Storage automatically
    },

    onReplyMessage: async (message) => {
      console.log('Received reply message');

      // Get the message thread to see the conversation context
      const thread = await client.getMessageThread(message.context.message_id);
      if (thread.data) {
        console.log('Reply thread:', {
          originalMessage: thread.data.originalMessage.content.text,
          replies: thread.data.replies.length
        });
      }
    }
  });

  // Handle a webhook (messages are automatically persisted)
  const webhookResult = await webhookProcessor.processWebhook(req.body, req.query);
  console.log('Webhook processed, messages saved to Supabase');

  // Advanced search with filters
  const complexSearch = await client.searchMessages({
    text: 'order',
    messageType: 'text',
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date(),
    hasMedia: false,
    limit: 20,
    orderBy: 'timestamp',
    orderDirection: 'desc'
  });

  console.log('Complex search results:', complexSearch.data.messages.length);

  // Export conversation data
  const exportResult = await client.exportConversation('+1234567890', 'json');
  console.log('Exported conversation data:', exportResult.data.filename);

  // Clean up old messages (based on retentionDays setting)
  const cleanupResult = await client.cleanupOldMessages();
  console.log(`Cleaned up ${cleanupResult.data} old messages`);

  // Disconnect storage when done
  await client.disconnectStorage();
}

// Custom transformer example
async function customTransformerExample() {
  const { MetadataEnricherTransformer, ContentFilterTransformer } = require('whatsapp-client-sdk');

  // Create custom transformers
  const enricher = new MetadataEnricherTransformer((message) => ({
    customerSegment: determineCustomerSegment(message.from),
    messageSource: 'whatsapp_business',
    processedAt: new Date().toISOString()
  }));

  const contentFilter = new ContentFilterTransformer([
    /\d{4}-?\d{4}-?\d{4}-?\d{4}/, // Credit card numbers
    /\d{3}-?\d{2}-?\d{4}/,        // SSN patterns
  ]);

  const client = new WhatsAppClient({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

    storage: {
      enabled: true,
      provider: 'supabase',
      options: {
        url: process.env.SUPABASE_URL,
        apiKey: process.env.SUPABASE_ANON_KEY,
        autoCreateTables: true,
      },
      features: {
        persistIncoming: true,
        persistOutgoing: true,
        autoConversations: true,
        createThreads: true,
        enableSearch: true,
      },
      customTransformers: [enricher, contentFilter] // Apply custom processing
    }
  });

  await client.initializeStorage();
  console.log('Client with custom transformers initialized');
}

// Standalone Storage Manager example
async function standaloneStorageExample() {
  // Create storage manager independently of WhatsApp client
  const storage = StorageManager.createSupabase({
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_ANON_KEY,
    autoCreateTables: true
  }, {
    persistIncoming: true,
    persistOutgoing: true,
    createThreads: true,
    enableSearch: true
  });

  await storage.initialize();

  // Use storage directly
  const searchResults = await storage.searchMessages({
    text: 'important',
    limit: 10
  });

  console.log('Direct storage search:', searchResults.data?.messages.length);

  await storage.disconnect();
}

// Helper function for customer segmentation
function determineCustomerSegment(phoneNumber) {
  // Custom logic to determine customer segment
  // This is just an example
  if (phoneNumber.startsWith('+1')) return 'US_CUSTOMER';
  if (phoneNumber.startsWith('+44')) return 'UK_CUSTOMER';
  return 'INTERNATIONAL_CUSTOMER';
}

// Run examples
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Running Basic Supabase Example...');
      await basicSupabaseExample();

      console.log('\n🔧 Running Advanced Supabase Example...');
      await advancedSupabaseExample();

      console.log('\n✨ Running Custom Transformer Example...');
      await customTransformerExample();

      console.log('\n📦 Running Standalone Storage Example...');
      await standaloneStorageExample();

      console.log('\n✅ All examples completed successfully!');
    } catch (error) {
      console.error('❌ Example failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  basicSupabaseExample,
  advancedSupabaseExample,
  customTransformerExample,
  standaloneStorageExample
};