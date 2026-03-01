-- Function to toggle a chat reaction atomically
-- This handles adding/removing a user from the reaction array
-- and cleaning up the reaction object if it becomes empty.
CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(
        p_message_id UUID,
        p_emoji TEXT,
        p_user_id TEXT
    ) RETURNS VOID AS $$
DECLARE v_reactions JSONB;
v_reaction JSONB;
v_index INTEGER;
v_users JSONB;
v_user_exists BOOLEAN;
BEGIN -- Get current reactions
SELECT reactions INTO v_reactions
FROM public.live_chat_messages
WHERE id = p_message_id;
IF v_reactions IS NULL THEN v_reactions := '[]'::JSONB;
END IF;
-- Find the emoji in the reactions array
v_index := -1;
FOR i IN 0..(JSONB_ARRAY_LENGTH(v_reactions) - 1) LOOP IF (v_reactions->i->>'emoji') = p_emoji THEN v_index := i;
EXIT;
END IF;
END LOOP;
IF v_index >= 0 THEN v_reaction := v_reactions->v_index;
v_users := v_reaction->'users';
-- Check if user already reacted (using ? operator for jsonb array)
v_user_exists := v_users ? p_user_id;
IF v_user_exists THEN -- Remove user from the users array
-- (jsonb - text) removes the key/element
v_users := v_users - p_user_id;
IF JSONB_ARRAY_LENGTH(v_users) = 0 THEN -- Remove the whole reaction object if no users left
v_reactions := v_reactions - v_index;
ELSE -- Update count and users in the existing reaction object
v_reaction := v_reaction || JSONB_BUILD_OBJECT(
    'count',
    JSONB_ARRAY_LENGTH(v_users),
    'users',
    v_users
);
v_reactions := JSONB_SET(v_reactions, ARRAY [v_index::TEXT], v_reaction);
END IF;
ELSE -- Add user to the users array
v_users := v_users || JSONB_BUILD_ARRAY(p_user_id);
v_reaction := v_reaction || JSONB_BUILD_OBJECT(
    'count',
    JSONB_ARRAY_LENGTH(v_users),
    'users',
    v_users
);
v_reactions := JSONB_SET(v_reactions, ARRAY [v_index::TEXT], v_reaction);
END IF;
ELSE -- Add new reaction object to the array
v_reactions := v_reactions || JSONB_BUILD_ARRAY(
    JSONB_BUILD_OBJECT(
        'emoji',
        p_emoji,
        'count',
        1,
        'users',
        JSONB_BUILD_ARRAY(p_user_id)
    )
);
END IF;
UPDATE public.live_chat_messages
SET reactions = v_reactions
WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant access to public (for guests) and authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_chat_reaction(UUID, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION public.toggle_chat_reaction(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_chat_reaction(UUID, TEXT, TEXT) TO anon;