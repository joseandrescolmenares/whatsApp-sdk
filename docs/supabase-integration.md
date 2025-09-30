# Supabase Integration Guide

The WhatsApp SDK provides seamless integration with Supabase for message persistence, conversation management, and advanced analytics. This guide shows you how to set up and use Supabase with your WhatsApp Business API integration.

## Features

✅ **Automatic Message Persistence** - All incoming and outgoing messages are automatically saved
✅ **Conversation Threading** - Maintains reply relationships and conversation context
✅ **Full-Text Search** - Search messages by content, date, phone number, and more
✅ **Message Status Tracking** - Track delivery, read receipts, and other status updates
✅ **Media Handling** - Store media file metadata and optionally download files
✅ **Analytics & Reporting** - Get insights into message volume, response times, and more
✅ **Data Export** - Export conversations in JSON, CSV, or other formats
✅ **Automatic Cleanup** - Configure retention policies to automatically delete old messages
✅ **Custom Transformers** - Pre-process messages before storage with custom logic

## Quick Start

### 1. Install Dependencies

```bash
npm install whatsapp-client-sdk @supabase/supabase-js
```

### 2. Set Up Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and API key from the project settings
3. The SDK will automatically create the required tables on first run

### 3. Basic Configuration

```javascript
const { WhatsAppClient } = require('whatsapp-client-sdk');

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

  // Enable Supabase storage
  storage: {
    enabled: true,
    provider: 'supabase',
    options: {
      url: process.env.SUPABASE_URL,
      apiKey: process.env.SUPABASE_ANON_KEY,
      autoCreateTables: true, // Creates tables automatically
    },
    features: {
      persistIncoming: true,    // Save received messages
      persistOutgoing: true,    // Save sent messages
      persistStatus: true,      // Save delivery status
      autoConversations: true,  // Group messages by conversation
      createThreads: true,      // Maintain reply relationships
      enableSearch: true,       // Enable search functionality
    }
  }
});

// Initialize storage
await client.initializeStorage();
```

## Configuration Options

### Supabase Options

```javascript
options: {
  url: 'your-supabase-url',           // Required: Supabase project URL
  apiKey: 'your-supabase-anon-key',   // Required: Supabase API key
  schema: 'public',                   // Database schema (default: 'public')
  tablePrefix: 'whatsapp_',           // Table name prefix (default: 'whatsapp_')
  autoCreateTables: true,             // Auto-create tables (default: true)
  enableRLS: false,                   // Enable Row Level Security (default: false)
}
```

### Feature Configuration

```javascript
features: {
  persistIncoming: true,      // Save incoming messages
  persistOutgoing: true,      // Save outgoing messages
  persistStatus: true,        // Save message status updates
  autoConversations: true,    // Automatically group messages into conversations
  persistMedia: false,        // Download and store media files (requires Supabase Storage)
  createThreads: true,        // Maintain message reply relationships
  enableSearch: true,         // Enable full-text search on message content
  anonymizeData: false,       // Anonymize phone numbers in storage
  retentionDays: undefined,   // Auto-delete messages after N days (optional)
}
```

## Database Schema

The SDK automatically creates the following tables:

### `whatsapp_messages`
- `id` - Unique message ID
- `whatsapp_message_id` - WhatsApp's message ID
- `conversation_id` - Links to conversation
- `from_phone` - Sender's phone number
- `to_phone` - Recipient's phone number
- `message_type` - Type of message (text, image, etc.)
- `content` - Message content (JSON)
- `reply_to_message_id` - Parent message for replies
- `timestamp` - When the message was sent
- `status` - Delivery status
- `direction` - incoming or outgoing
- `metadata` - Additional data (JSON)

### `whatsapp_conversations`
- `id` - Unique conversation ID
- `phone_number` - Customer's phone number
- `business_phone_id` - Your business phone number ID
- `last_message_at` - Last message timestamp
- `message_count` - Total messages in conversation
- `unread_count` - Unread messages count

## Usage Examples

### Sending Messages with Automatic Persistence

```javascript
// Send a message - automatically saved to Supabase
const response = await client.sendText('+1234567890', 'Hello! How can I help you?');
console.log('Message sent and saved:', response.messageId);
```

### Webhook Processing with Storage

```javascript
const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (message) => {
    console.log(`Received: ${message.text}`);

    // Message is already saved to Supabase automatically!
    // Get conversation history if needed
    const conversation = await client.getConversation(message.from);
    console.log(`This conversation has ${conversation.data.total} messages`);
  },

  onReplyMessage: async (message) => {
    // Get the full message thread
    const thread = await client.getMessageThread(message.context.message_id);
    console.log('Reply to:', thread.data?.originalMessage.content.text);
  }
});

// Process webhook (messages saved automatically)
app.post('/webhook', async (req, res) => {
  const result = await webhookProcessor.processWebhook(req.body, req.query);
  res.status(result.status).send(result.response);
});
```

### Retrieving Conversation History

```javascript
// Get recent messages from a conversation
const conversation = await client.getConversation('+1234567890', {
  limit: 50,
  offset: 0
});

console.log(`Found ${conversation.data.total} messages`);
conversation.data.messages.forEach(msg => {
  console.log(`${msg.direction}: ${msg.content.text}`);
});

// Get conversation with threaded replies
const thread = await client.getConversationThread('+1234567890');
console.log('Threaded conversation:', thread.data.messages);
```

### Searching Messages

```javascript
// Search for messages containing specific text
const results = await client.searchMessages({
  text: 'order status',
  phoneNumber: '+1234567890',
  dateFrom: new Date('2024-01-01'),
  limit: 20
});

console.log(`Found ${results.data.total} messages`);

// Advanced search with multiple filters
const complexSearch = await client.searchMessages({
  text: 'urgent',
  messageType: 'text',
  direction: 'incoming',
  hasMedia: false,
  dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  limit: 10,
  orderBy: 'timestamp',
  orderDirection: 'desc'
});
```

### Analytics and Reporting

```javascript
// Get conversation analytics
const analytics = await client.getConversationAnalytics('+1234567890', {
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  to: new Date()
});

console.log('Analytics:', {
  totalMessages: analytics.data.totalMessages,
  incomingMessages: analytics.data.incomingMessages,
  outgoingMessages: analytics.data.outgoingMessages,
  messagesByType: analytics.data.messagesByType
});

// Export conversation data
const exportResult = await client.exportConversation('+1234567890', 'json');
console.log('Export URL:', exportResult.data.url);
```

## Custom Transformers

Transform messages before they're stored in Supabase:

```javascript
const { MetadataEnricherTransformer, ContentFilterTransformer } = require('whatsapp-client-sdk');

// Add custom metadata to messages
const enricher = new MetadataEnricherTransformer((message) => ({
  customerSegment: determineSegment(message.from),
  messageSource: 'whatsapp_business',
  priority: message.text?.includes('urgent') ? 'high' : 'normal'
}));

// Filter sensitive content
const contentFilter = new ContentFilterTransformer([
  /\\d{4}-?\\d{4}-?\\d{4}-?\\d{4}/, // Credit card numbers
  /\\d{3}-?\\d{2}-?\\d{4}/,         // SSN patterns
]);

const client = new WhatsAppClient({
  // ... other config
  storage: {
    // ... other storage config
    customTransformers: [enricher, contentFilter]
  }
});
```

## Row Level Security (RLS)

Enable RLS for multi-tenant applications:

```javascript
storage: {
  enabled: true,
  provider: 'supabase',
  options: {
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_ANON_KEY,
    enableRLS: true, // Enable Row Level Security
  },
  // ... features
}
```

Then set up RLS policies in your Supabase dashboard:

```sql
-- Example RLS policy for messages table
CREATE POLICY "Users can view their own messages" ON whatsapp_messages
  FOR SELECT USING (auth.uid()::text = metadata->>'user_id');

CREATE POLICY "Users can insert their own messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (auth.uid()::text = metadata->>'user_id');
```

## Performance Tips

1. **Indexing**: The SDK creates optimized indexes, but you can add custom ones:

```sql
-- Index for searching by phone number and timestamp
CREATE INDEX idx_messages_phone_timestamp ON whatsapp_messages(from_phone, timestamp DESC);

-- Full-text search index
CREATE INDEX idx_messages_content_gin ON whatsapp_messages USING GIN ((content->>'text'));
```

2. **Batch Operations**: Use bulk operations for better performance:

```javascript
// Bulk save multiple messages
const messageIds = await client.storage.bulkSaveMessages(messages);

// Bulk update message statuses
const updated = await client.storage.bulkUpdateStatus(statusUpdates);
```

3. **Connection Management**: Reuse the storage connection:

```javascript
// Initialize once
await client.initializeStorage();

// Use throughout your app...

// Cleanup when shutting down
await client.disconnectStorage();
```

## Error Handling

The SDK includes robust error handling:

```javascript
try {
  await client.sendText('+1234567890', 'Hello!');
} catch (error) {
  if (error.code === 'STORAGE_ERROR') {
    console.log('Storage error:', error.message);
    // Message was sent but not saved to Supabase
  }
}

// Storage operations return structured results
const result = await client.storage.saveMessage(message);
if (!result.success) {
  console.error('Storage failed:', result.error.message);
}
```

## Migration and Maintenance

### Automatic Cleanup

Configure automatic deletion of old messages:

```javascript
features: {
  retentionDays: 365 // Delete messages older than 1 year
}

// Manual cleanup
const deletedCount = await client.cleanupOldMessages();
console.log(`Deleted ${deletedCount} old messages`);
```

### Schema Updates

The SDK handles schema updates automatically. For manual schema management, use:

```javascript
const { SchemaBuilder } = require('whatsapp-client-sdk');

const builder = new SchemaBuilder({
  messagesTable: 'whatsapp_messages',
  conversationsTable: 'whatsapp_conversations'
});

// Get SQL for PostgreSQL/Supabase
const sql = builder.generateSupabaseSchema();
console.log(sql);
```

## Troubleshooting

### Common Issues

1. **Tables not created**: Ensure `autoCreateTables: true` and your API key has proper permissions
2. **Storage errors don't fail message sending**: This is by design - storage errors are logged but don't prevent message delivery
3. **RLS blocking queries**: Check your RLS policies if queries return empty results

### Debug Mode

Enable detailed logging:

```javascript
// Set environment variable
process.env.DEBUG = 'whatsapp-sdk:storage';

// Or check storage status
console.log('Storage enabled:', client.isStorageEnabled());
console.log('Storage features:', client.getStorageFeatures());
```

## Advanced Usage

### Custom Adapter

Create your own storage adapter:

```javascript
const { BaseAdapter } = require('whatsapp-client-sdk');

class CustomAdapter extends BaseAdapter {
  async saveMessage(message) {
    // Your custom storage logic
    return 'message-id';
  }

  // Implement other required methods...
}

const client = new WhatsAppClient({
  // ... config
  storage: {
    enabled: true,
    provider: 'custom',
    options: {
      customAdapter: new CustomAdapter(features, transformers)
    },
    features: { /* ... */ }
  }
});
```

### Standalone Storage Manager

Use storage independently of WhatsApp client:

```javascript
const { StorageManager } = require('whatsapp-client-sdk');

const storage = StorageManager.createSupabase({
  url: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_ANON_KEY
}, {
  persistIncoming: true,
  enableSearch: true
});

await storage.initialize();

// Use storage directly
const messages = await storage.searchMessages({ text: 'hello' });
console.log('Found messages:', messages.data?.messages.length);
```

## Best Practices

1. **Environment Variables**: Store sensitive credentials in environment variables
2. **Error Handling**: Always handle storage errors gracefully
3. **Performance**: Use bulk operations for high-volume scenarios
4. **Security**: Enable RLS for multi-tenant applications
5. **Monitoring**: Monitor storage performance and errors
6. **Backup**: Regular backups of your Supabase database
7. **Retention**: Set appropriate retention policies to manage storage costs

## Support

For issues with Supabase integration:

1. Check the [examples](../examples/supabase-integration.js) for complete working code
2. Review the [API documentation](./api-reference.md)
3. Open an issue on [GitHub](https://github.com/joseandrescolmenares/whatsapp-sdk/issues)

The Supabase integration is designed to be robust and production-ready. It handles edge cases, provides comprehensive error handling, and scales with your application needs.