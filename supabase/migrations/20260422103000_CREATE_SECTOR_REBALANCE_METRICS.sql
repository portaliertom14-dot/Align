create table if not exists public.sector_rebalance_metrics (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  request_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rebalance_enabled boolean not null,
  rebalance_weight double precision not null,
  top1_changed boolean not null,
  pre_top1 text,
  post_top1 text,
  ai_base_top5 jsonb not null default '[]'::jsonb,
  pre_top5 jsonb not null default '[]'::jsonb,
  post_top5 jsonb not null default '[]'::jsonb,
  q1_40_raw_top5 jsonb not null default '[]'::jsonb,
  q1_40_normalized_top5 jsonb not null default '[]'::jsonb
);

create index if not exists idx_sector_rebalance_metrics_created_at
  on public.sector_rebalance_metrics (created_at desc);

create index if not exists idx_sector_rebalance_metrics_top1_changed
  on public.sector_rebalance_metrics (top1_changed, created_at desc);

create index if not exists idx_sector_rebalance_metrics_post_top1
  on public.sector_rebalance_metrics (post_top1, created_at desc);

alter table public.sector_rebalance_metrics enable row level security;

drop policy if exists "service_role_full_access_sector_rebalance_metrics" on public.sector_rebalance_metrics;
create policy "service_role_full_access_sector_rebalance_metrics"
on public.sector_rebalance_metrics
for all
to service_role
using (true)
with check (true);
