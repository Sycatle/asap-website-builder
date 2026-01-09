-- AI Conversations & Message History
-- Stores conversation history for multi-turn chat with the AI assistant

-- Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    title VARCHAR(255), -- Auto-generated from first message
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    -- Store actions as JSONB for assistant messages
    actions JSONB DEFAULT '[]'::jsonb,
    -- Token usage for tracking
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_account ON ai_conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_website ON ai_conversations(website_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);

-- RLS policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Account isolation for conversations
CREATE POLICY ai_conversations_account_isolation ON ai_conversations
    FOR ALL
    USING (account_id = current_setting('app.current_account_id', true)::uuid);

-- Messages access through conversation ownership
CREATE POLICY ai_messages_account_isolation ON ai_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM ai_conversations 
            WHERE account_id = current_setting('app.current_account_id', true)::uuid
        )
    );

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_message_update_conversation
    AFTER INSERT ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_conversation_timestamp();
