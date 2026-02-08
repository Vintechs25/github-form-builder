-- Schedule daily check for expiring hosting accounts at 3:00 AM UTC
SELECT cron.schedule(
  'check-expiring-hosting',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdmyvzolennegaropcfw.supabase.co/functions/v1/check-expiring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);