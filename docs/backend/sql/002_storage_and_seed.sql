-- ============================================================
-- STORAGE BUCKET SETUP
-- Run this in Supabase SQL Editor after 001_schema.sql
-- ============================================================

-- Create storage bucket for task images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-images',
  'task-images',
  true, -- public bucket (images are public)
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS policies for storage
create policy "Public read access for task images"
on storage.objects for select
using (bucket_id = 'task-images');

create policy "Admin can upload task images"
on storage.objects for insert
with check (
  bucket_id = 'task-images'
  and exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'admin')
  )
);

create policy "Admin can delete task images"
on storage.objects for delete
using (
  bucket_id = 'task-images'
  and exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'admin')
  )
);

-- ============================================================
-- SAMPLE DATA (for testing)
-- ============================================================

-- Insert sample tasks
insert into public.tasks (
  title, short_desc, full_desc, what_to_do, what_not_to_do,
  requirements, target_url, reward_coins, est_time, status
) values
(
  'Install & Register on ShopEase App',
  'Install the ShopEase app and create a new account.',
  'ShopEase is a shopping app. Install it from the Play Store, open it, and complete a fresh registration. The whole process takes about 5 minutes.',
  '["Open the provided target link on your Android phone.", "Install the ShopEase app from the Play Store.", "Register a new account with your own details.", "Record your screen from install until registration completes.", "Send the full video to the administrator on WhatsApp."]'::jsonb,
  '["Do not use an existing/old account.", "Do not submit an edited or trimmed video.", "Do not submit the same task twice.", "Do not uninstall the app before verification."]'::jsonb,
  'Android phone, stable internet, screen-recording enabled.',
  'https://example.com/shopease',
  50,
  '5 min',
  'published'
),
(
  'Watch a 3-Minute Promo Video',
  'Watch the full promo video without skipping.',
  'Open the video link and watch the complete 3-minute promotional video. Your watch session must be recorded as proof.',
  '["Open the target link.", "Play the video and watch it fully (3 minutes).", "Screen-record the full watch session.", "Send the recording to the administrator on WhatsApp."]'::jsonb,
  '["Do not skip or fast-forward the video.", "Do not mute and leave — the video must play fully.", "Do not submit someone else''s recording."]'::jsonb,
  'Any smartphone with video playback support.',
  'https://example.com/promo-video',
  20,
  '4 min',
  'published'
),
(
  'Follow & Like on Social Media',
  'Follow the page and like the latest 3 posts.',
  'Open the social media page from the target link, follow the page, and like the 3 most recent posts.',
  '["Open the target link to the social page.", "Follow the page with your real account.", "Like the latest 3 posts.", "Screen-record the process and send it on WhatsApp."]'::jsonb,
  '["Do not unfollow after submission.", "Do not use fake/bot accounts.", "Do not like old posts instead of the latest 3."]'::jsonb,
  'An active social media account.',
  'https://example.com/social-page',
  15,
  '3 min',
  'published'
),
(
  'Write an Honest App Review',
  'Rate and review the app on the Play Store.',
  'Install the app, use it for at least 2 minutes, then leave an honest review with a rating on the Play Store.',
  '["Install the app from the target link.", "Use the app for at least 2 minutes.", "Write an honest review (2+ sentences) with a rating.", "Record the review being posted and send it on WhatsApp."]'::jsonb,
  '["Do not copy-paste generic reviews.", "Do not delete the review after verification.", "Do not post from multiple accounts."]'::jsonb,
  'Google account for Play Store review.',
  'https://example.com/review-app',
  40,
  '6 min',
  'published'
),
(
  'Complete a Short Survey',
  'Answer a 10-question consumer survey.',
  'Complete a 10-question survey about shopping habits. Answer honestly — rushed or random answers will be rejected.',
  '["Open the survey link.", "Answer all 10 questions honestly.", "Record the completion screen.", "Send the recording on WhatsApp."]'::jsonb,
  '["Do not rush with random answers.", "Do not submit the survey more than once."]'::jsonb,
  '5 minutes of focused time.',
  'https://example.com/survey',
  25,
  '5 min',
  'published'
),
(
  'Reach Level 5 in Puzzle Game',
  'Install the game and reach level 5.',
  'Install the puzzle game and play until you complete level 5. Record your gameplay from level 1 to level 5.',
  '["Install the game from the target link.", "Play and clear levels 1 through 5.", "Record gameplay showing level 5 completion.", "Send the video on WhatsApp."]'::jsonb,
  '["Do not use mods or cheats.", "Do not submit another player''s gameplay."]'::jsonb,
  'Android phone with 200MB free storage.',
  'https://example.com/puzzle-game',
  80,
  '20 min',
  'published'
);
