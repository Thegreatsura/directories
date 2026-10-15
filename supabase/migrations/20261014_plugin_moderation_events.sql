-- Append-only audit trail for admin moderation actions (web admin UI and the
-- Community Plugins MCP server). Written by the service-role client only.
--
-- plugin_id and actor_id deliberately have no foreign keys: the history must
-- survive plugin deletion and account removal.
create table if not exists public.plugin_moderation_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  plugin_id uuid not null,
  plugin_slug text not null,
  action text not null,
  actor_id uuid not null,
  source text not null check (source in ('web', 'mcp')),
  client_id text,
  reason text,
  before jsonb,
  after jsonb
);

create index if not exists plugin_moderation_events_plugin_idx
  on public.plugin_moderation_events (plugin_id, created_at desc);

create index if not exists plugin_moderation_events_created_idx
  on public.plugin_moderation_events (created_at desc);

-- RLS on with no policies: the Data API roles cannot read or write it; the
-- service role bypasses RLS.
alter table public.plugin_moderation_events enable row level security;
revoke all on table public.plugin_moderation_events from anon, authenticated;

create or replace function public.prevent_plugin_moderation_event_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'plugin_moderation_events is append-only';
end;
$$;

drop trigger if exists plugin_moderation_events_append_only
  on public.plugin_moderation_events;

create trigger plugin_moderation_events_append_only
  before update or delete on public.plugin_moderation_events
  for each row execute function public.prevent_plugin_moderation_event_changes();
