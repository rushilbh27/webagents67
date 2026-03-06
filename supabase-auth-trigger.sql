-- ============================================
-- Supabase Auth Trigger for custom public.users table
-- ============================================
-- Run this script in the Supabase SQL Editor

-- 1. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, is_active, agent_count)
  VALUES (
    new.id, 
    new.email, 
    false, -- Default to inactive, Admin must approve
    0
  );
  RETURN new;
END;
$$;

-- 2. Create the trigger on the auth.users table
-- This waits for Supabase's native auth email/password signup 
-- and then fires the function above to sync our custom table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Optional check to see if it created correctly:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
