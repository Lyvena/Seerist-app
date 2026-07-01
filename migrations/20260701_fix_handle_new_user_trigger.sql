-- Fix: handle_new_user() trigger referenced NEW.raw_user_meta_data, a column
-- that does NOT exist on InsForge's auth.users table (it is a Supabase
-- convention). InsForge exposes user metadata under the `metadata` column.
--
-- This mismatch caused EVERY signup to fail with:
--   DATABASE_VALIDATION_ERROR: record "new" has no field "raw_user_meta_data"
-- The trigger is invoked by `on_auth_user_created AFTER INSERT ON auth.users`.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.metadata->>'full_name',
    NEW.metadata->>'avatar_url'
  );
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  INSERT INTO public.alert_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;
