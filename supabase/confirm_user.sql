-- Run this SQL in your Supabase SQL Editor to manually confirm the user's email:

update auth.users
set email_confirmed_at = now()
where email = 'kyawminhtet.1dev@gmail.com'
  and email_confirmed_at is null;
