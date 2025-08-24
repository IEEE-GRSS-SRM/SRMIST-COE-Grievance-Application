-- SQL script to add 'test_email' to the email_type check constraint

-- First, let's check the current constraint definition
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'email_notifications'::regclass AND conname = 'email_notifications_email_type_check';

-- Create a function to get the email type constraints (for use in the frontend)
CREATE OR REPLACE FUNCTION get_email_type_constraints()
RETURNS text[] AS $$
DECLARE
    constraint_def text;
    email_types text[];
BEGIN
    -- Get the constraint definition
    SELECT consrc INTO constraint_def
    FROM pg_constraint 
    WHERE conrelid = 'email_notifications'::regclass AND conname = 'email_notifications_email_type_check';
    
    -- Extract the email types from the constraint definition
    -- This assumes the constraint is in the format: (email_type = ANY (ARRAY['type1'::text, 'type2'::text, ...]))
    email_types := regexp_matches(constraint_def, 'ARRAY\[(.*?)\]', 'g');
    
    RETURN email_types;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the constraint to include 'test_email'
-- Option 1: If using a check constraint with specific values
ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_email_type_check;
ALTER TABLE email_notifications ADD CONSTRAINT email_notifications_email_type_check 
    CHECK (email_type IN ('request_created', 'request_updated', 'request_resolved', 'request_rejected', 'request_escalated', 'test_email'));

-- Option 2: If using an enum type
-- First check if it's an enum type
DO $$
DECLARE
    enum_type text;
BEGIN
    -- Check if email_type is using an enum type
    SELECT udt_name INTO enum_type
    FROM information_schema.columns
    WHERE table_name = 'email_notifications' AND column_name = 'email_type';
    
    -- If it's an enum type, add the new value
    IF enum_type NOT LIKE 'varchar%' AND enum_type NOT LIKE 'text%' THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''test_email''', enum_type);
    END IF;
END $$;

-- Verify the updated constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'email_notifications'::regclass AND conname = 'email_notifications_email_type_check'; 