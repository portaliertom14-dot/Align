alter table public.user_profiles
  add column if not exists resume_state text,
  add column if not exists resume_payload jsonb,
  add column if not exists resume_updated_at timestamptz;

create index if not exists idx_user_profiles_resume_state
  on public.user_profiles (resume_state)
  where resume_state is not null;
