-- Create realtime channel pattern for user-specific opportunity notifications
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('opportunities:%', 'Per-user opportunity notifications', true)
ON CONFLICT (pattern) DO UPDATE SET enabled = true;

-- Trigger function to publish new opportunities to the user's realtime channel
CREATE OR REPLACE FUNCTION notify_new_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'opportunities:' || NEW.user_id,
    'new_opportunity',
    jsonb_build_object(
      'id', NEW.id,
      'external_id', NEW.external_id,
      'title', NEW.title,
      'description', NEW.description,
      'poster_name', NEW.poster_name,
      'poster_company', NEW.poster_company,
      'post_url', NEW.post_url,
      'budget_min', NEW.budget_min,
      'budget_max', NEW.budget_max,
      'budget_currency', NEW.budget_currency,
      'budget_type', NEW.budget_type,
      'platform_id', NEW.platform_id,
      'ai_score', NEW.ai_score,
      'ai_score_breakdown', NEW.ai_score_breakdown,
      'required_skills', NEW.required_skills,
      'status', NEW.status,
      'posted_at', NEW.posted_at,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to opportunities table
DROP TRIGGER IF EXISTS opportunity_realtime ON opportunities;
CREATE TRIGGER opportunity_realtime
  AFTER INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_opportunity();
