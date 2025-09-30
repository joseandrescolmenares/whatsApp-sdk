-- WhatsApp SDK Supabase Schema
-- This file contains the complete database schema for WhatsApp message storage in Supabase
-- You can run this manually if you prefer not to use autoCreateTables: true

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create conversations table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  business_phone_id VARCHAR(20) NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uk_phone_business UNIQUE(phone_number, business_phone_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  phone_number_id VARCHAR(20) NOT NULL,
  from_phone VARCHAR(20) NOT NULL,
  to_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  reply_to_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  whatsapp_reply_to_id VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ck_message_status CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  CONSTRAINT ck_message_type CHECK (message_type IN (
    'text', 'image', 'video', 'audio', 'document', 'location',
    'contacts', 'sticker', 'reaction', 'interactive', 'template'
  ))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_phone ON whatsapp_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_messages_to_phone ON whatsapp_messages(to_phone);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON whatsapp_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON whatsapp_messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_reply ON whatsapp_messages(whatsapp_reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON whatsapp_messages(whatsapp_message_id);

-- Full-text search index for content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON whatsapp_messages
  USING GIN (to_tsvector('english', COALESCE(content->>'text', '')));

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_messages_phone_timestamp ON whatsapp_messages(from_phone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON whatsapp_messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction_timestamp ON whatsapp_messages(direction, timestamp DESC);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON whatsapp_conversations(business_phone_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

-- Functions for maintaining conversation metadata
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation activity and message count
  INSERT INTO whatsapp_conversations (phone_number, business_phone_id, last_message_at, message_count, updated_at)
  VALUES (
    CASE
      WHEN NEW.direction = 'incoming' THEN NEW.from_phone
      ELSE NEW.to_phone
    END,
    NEW.phone_number_id,
    NEW.timestamp,
    1,
    NOW()
  )
  ON CONFLICT (phone_number, business_phone_id)
  DO UPDATE SET
    last_message_at = GREATEST(whatsapp_conversations.last_message_at, NEW.timestamp),
    message_count = whatsapp_conversations.message_count + 1,
    updated_at = NOW();

  -- Update conversation_id in the message if it was just created
  IF NEW.conversation_id IS NULL THEN
    UPDATE whatsapp_messages
    SET conversation_id = (
      SELECT id FROM whatsapp_conversations
      WHERE phone_number = CASE
        WHEN NEW.direction = 'incoming' THEN NEW.from_phone
        ELSE NEW.to_phone
      END
      AND business_phone_id = NEW.phone_number_id
    )
    WHERE id = NEW.id;
  END IF;

  -- If this is an incoming message, increment unread count
  IF NEW.direction = 'incoming' THEN
    UPDATE whatsapp_conversations
    SET unread_count = unread_count + 1
    WHERE phone_number = NEW.from_phone
    AND business_phone_id = NEW.phone_number_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation metadata
DROP TRIGGER IF EXISTS update_conversation_trigger ON whatsapp_messages;
CREATE TRIGGER update_conversation_trigger
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Function for marking messages as read and updating unread count
CREATE OR REPLACE FUNCTION mark_conversation_read(conversation_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_conversations
  SET unread_count = 0, updated_at = NOW()
  WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function for cleaning up old messages
CREATE OR REPLACE FUNCTION cleanup_old_messages(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete messages older than retention period
  WITH deleted AS (
    DELETE FROM whatsapp_messages
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING conversation_id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  -- Update conversation message counts
  UPDATE whatsapp_conversations
  SET message_count = (
    SELECT COUNT(*)
    FROM whatsapp_messages
    WHERE conversation_id = whatsapp_conversations.id
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function for getting conversation statistics
CREATE OR REPLACE FUNCTION get_conversation_stats(phone_number_param VARCHAR)
RETURNS TABLE(
  total_messages BIGINT,
  incoming_messages BIGINT,
  outgoing_messages BIGINT,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  avg_response_time_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE direction = 'incoming') as incoming_messages,
    COUNT(*) FILTER (WHERE direction = 'outgoing') as outgoing_messages,
    MIN(timestamp) as first_message_at,
    MAX(timestamp) as last_message_at,
    AVG(EXTRACT(EPOCH FROM (
      LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp
    )) / 60) as avg_response_time_minutes
  FROM whatsapp_messages m
  JOIN whatsapp_conversations c ON m.conversation_id = c.id
  WHERE c.phone_number = phone_number_param;
END;
$$ LANGUAGE plpgsql;

-- Function for searching messages with full-text search
CREATE OR REPLACE FUNCTION search_messages(
  search_text TEXT DEFAULT NULL,
  phone_number_filter VARCHAR DEFAULT NULL,
  message_type_filter VARCHAR DEFAULT NULL,
  direction_filter VARCHAR DEFAULT NULL,
  date_from_filter TIMESTAMPTZ DEFAULT NULL,
  date_to_filter TIMESTAMPTZ DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  whatsapp_message_id VARCHAR,
  conversation_id UUID,
  from_phone VARCHAR,
  to_phone VARCHAR,
  message_type VARCHAR,
  content JSONB,
  msg_timestamp TIMESTAMPTZ,
  direction VARCHAR,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.whatsapp_message_id,
    m.conversation_id,
    m.from_phone,
    m.to_phone,
    m.message_type,
    m.content,
    m.timestamp AS msg_timestamp,
    m.direction,
    CASE
      WHEN search_text IS NOT NULL THEN
        ts_rank(to_tsvector('english', COALESCE(m.content->>'text', '')), plainto_tsquery('english', search_text))
      ELSE 1.0
    END as rank
  FROM whatsapp_messages m
  LEFT JOIN whatsapp_conversations c ON m.conversation_id = c.id
  WHERE
    (search_text IS NULL OR to_tsvector('english', COALESCE(m.content->>'text', '')) @@ plainto_tsquery('english', search_text))
    AND (phone_number_filter IS NULL OR c.phone_number = phone_number_filter)
    AND (message_type_filter IS NULL OR m.message_type = message_type_filter)
    AND (direction_filter IS NULL OR m.direction = direction_filter)
    AND (date_from_filter IS NULL OR m.timestamp >= date_from_filter)
    AND (date_to_filter IS NULL OR m.timestamp <= date_to_filter)
  ORDER BY
    CASE
      WHEN search_text IS NOT NULL THEN
        ts_rank(to_tsvector('english', COALESCE(m.content->>'text', '')), plainto_tsquery('english', search_text))
      ELSE 0
    END DESC,
    m.timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW message_threads AS
SELECT
  m.id,
  m.whatsapp_message_id,
  m.conversation_id,
  m.from_phone,
  m.content,
  m.timestamp,
  m.direction,
  m.reply_to_message_id,
  parent.content as parent_content,
  parent.timestamp as parent_timestamp,
  COALESCE(reply_count.count, 0) as reply_count
FROM whatsapp_messages m
LEFT JOIN whatsapp_messages parent ON m.reply_to_message_id = parent.id
LEFT JOIN (
  SELECT reply_to_message_id, COUNT(*) as count
  FROM whatsapp_messages
  WHERE reply_to_message_id IS NOT NULL
  GROUP BY reply_to_message_id
) reply_count ON m.id = reply_count.reply_to_message_id
ORDER BY m.timestamp DESC;

CREATE OR REPLACE VIEW conversation_summary AS
SELECT
  c.*,
  COALESCE(m.content->>'text',
    CASE
      WHEN m.message_type = 'image' THEN '[Image]'
      WHEN m.message_type = 'video' THEN '[Video]'
      WHEN m.message_type = 'audio' THEN '[Audio]'
      WHEN m.message_type = 'document' THEN '[Document]'
      WHEN m.message_type = 'location' THEN '[Location]'
      WHEN m.message_type = 'sticker' THEN '[Sticker]'
      WHEN m.message_type = 'reaction' THEN '[Reaction]'
      ELSE '[' || m.message_type || ']'
    END
  ) as last_message_preview,
  m.message_type as last_message_type,
  m.direction as last_message_direction,
  m.timestamp as last_message_timestamp
FROM whatsapp_conversations c
LEFT JOIN whatsapp_messages m ON m.conversation_id = c.id
  AND m.timestamp = c.last_message_at
ORDER BY c.last_message_at DESC;

-- Analytics view
CREATE OR REPLACE VIEW message_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE direction = 'incoming') as incoming_messages,
  COUNT(*) FILTER (WHERE direction = 'outgoing') as outgoing_messages,
  COUNT(DISTINCT conversation_id) as active_conversations,
  COUNT(DISTINCT CASE WHEN direction = 'incoming' THEN from_phone END) as unique_customers
FROM whatsapp_messages
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Optional: Row Level Security (RLS) setup
-- Uncomment these if you want to enable RLS

/*
-- Enable RLS on both tables
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages table
-- These assume you have a user_id field in metadata
CREATE POLICY "Users can view their own messages" ON whatsapp_messages
  FOR SELECT USING (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );

CREATE POLICY "Users can insert their own messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );

CREATE POLICY "Users can update their own messages" ON whatsapp_messages
  FOR UPDATE USING (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );

-- RLS Policies for conversations table
CREATE POLICY "Users can view their own conversations" ON whatsapp_conversations
  FOR SELECT USING (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );

CREATE POLICY "Users can insert their own conversations" ON whatsapp_conversations
  FOR INSERT WITH CHECK (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );

CREATE POLICY "Users can update their own conversations" ON whatsapp_conversations
  FOR UPDATE USING (
    auth.uid()::text = metadata->>'user_id' OR
    auth.uid()::text = metadata->>'business_owner_id'
  );
*/

-- Grant permissions to authenticated users
-- Adjust these based on your security requirements
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_conversations TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for the views and functions
GRANT SELECT ON message_threads TO authenticated;
GRANT SELECT ON conversation_summary TO authenticated;
GRANT SELECT ON message_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION update_conversation_on_message() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_messages(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_stats(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages(TEXT, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE whatsapp_conversations IS 'Stores WhatsApp conversation metadata';
COMMENT ON TABLE whatsapp_messages IS 'Stores individual WhatsApp messages with full content and metadata';

COMMENT ON COLUMN whatsapp_messages.whatsapp_message_id IS 'Original message ID from WhatsApp API';
COMMENT ON COLUMN whatsapp_messages.reply_to_message_id IS 'References the parent message for threaded conversations';
COMMENT ON COLUMN whatsapp_messages.whatsapp_reply_to_id IS 'Original WhatsApp message ID being replied to';
COMMENT ON COLUMN whatsapp_messages.content IS 'Message content in JSON format - text, media info, location, etc.';
COMMENT ON COLUMN whatsapp_messages.metadata IS 'Additional metadata like contact info, business context, etc.';

COMMENT ON FUNCTION update_conversation_on_message() IS 'Automatically maintains conversation metadata when messages are inserted';
COMMENT ON FUNCTION cleanup_old_messages(INTEGER) IS 'Removes messages older than specified days and updates conversation counts';
COMMENT ON FUNCTION get_conversation_stats(VARCHAR) IS 'Returns comprehensive statistics for a specific conversation';
COMMENT ON FUNCTION search_messages IS 'Full-text search across messages with multiple filter options';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'WhatsApp SDK schema created successfully!';
  RAISE NOTICE 'Tables: whatsapp_conversations, whatsapp_messages';
  RAISE NOTICE 'Functions: update_conversation_on_message, mark_conversation_read, cleanup_old_messages, get_conversation_stats, search_messages';
  RAISE NOTICE 'Views: message_threads, conversation_summary, message_analytics';
  RAISE NOTICE 'Remember to uncomment RLS policies if you need row-level security!';
END $$;