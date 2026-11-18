# O/L Maths Progress — setup guide

This is the first development starter, not a finished production system. It includes the public dashboard, login screen, leaderboard layout, chart, and a Supabase database schema with admin-only write policies.

## 1. Install the tools
Install Node.js 20 or newer and Visual Studio Code on your computer.

## 2. Create Supabase project
1. Open https://supabase.com and create a project.
2. In Project Settings → API, copy the Project URL and `anon` / publishable key.
3. In SQL Editor, run the full contents of `supabase/schema.sql`.
4. Never put the `service_role` key in browser code or commit it to this project.

## 3. Configure the app
1. Copy `.env.example` to `.env.local`.
2. Replace the sample values with your Supabase Project URL and anon key.
3. In the project folder, run `npm install`, then `npm run dev`.
4. Open http://localhost:3000.

## 4. Create the first Admin safely
1. In Supabase Authentication → Users, create the admin user with email and a strong password.
2. Copy that user's UUID.
3. In SQL Editor run (replace values):
   `insert into public.profiles (id, full_name, role) values ('USER-UUID-HERE', 'Site Admin', 'admin');`
4. Create student auth users in Authentication → Users, then insert matching profile rows with role `student`.
5. Do not allow public self-registration until a controlled onboarding flow has been implemented.

## Important notes before real student use
- The starter currently demonstrates the app shell, login, chart, and leaderboard. Admin paper/marks entry forms and the full student-specific analysis page are the next build stage.
- Full-name leaderboard publication can expose student educational records. Get appropriate consent and consider showing student IDs or aliases publicly instead.
- The leaderboard RPC is public by design in this starter. Review whether public access is appropriate before deploying.
- Review and test Row Level Security policies with separate admin and student test accounts before entering real marks.
- The first chart on the home page is a site-wide sample/latest marks chart. The individual student-only chart will be implemented in the next milestone.
