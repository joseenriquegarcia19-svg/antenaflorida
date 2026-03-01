-- Update live_chat_messages table for advanced features
ALTER TABLE live_chat_messages 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN reply_to_id UUID REFERENCES live_chat_messages(id),
ADD COLUMN user_role TEXT DEFAULT 'user';
