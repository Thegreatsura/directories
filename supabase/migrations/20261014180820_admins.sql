-- Admins of the web admin (/admin/plugins) and the Community Plugins MCP
-- server, managed from the Supabase dashboard instead of an env var.
--
-- Fill in either column:
--   user_id  an existing account (auth.users.id)
--   email    someone who hasn't signed in yet, or any account of theirs. It
--            only matches a Google or GitHub identity whose provider verified
--            that email (see is_admin), never an email the user typed in.
create table if not exists public.admins (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users (id) on delete cascade,
  email text check (email like '%@%'),
  note text,
  created_at timestamptz not null default now(),
  constraint admins_user_id_or_email check (user_id is not null or email is not null)
);

create unique index if not exists admins_email_idx
  on public.admins (lower(btrim(email)));

-- RLS on with no policies: the Data API roles cannot read or change who is an
-- admin; the service role bypasses RLS.
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;

-- security definer so the service role can match against auth.identities,
-- which only the Auth server writes. identity_data.email is stored lowercase
-- and email_verified is only present when the provider verified the address.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_user_id
       or (
         a.email is not null
         and exists (
           select 1
           from auth.identities i
           where i.user_id = p_user_id
             and i.provider in ('google', 'github')
             and i.identity_data ->> 'email' = lower(btrim(a.email))
             and coalesce((i.identity_data ->> 'email_verified')::boolean, false)
         )
       )
  );
$$;

revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_admin(uuid) to service_role;
