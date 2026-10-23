-- Life's Epicenter: run this once in Supabase (SQL Editor > New query > paste > Run).
-- It creates one shared "household" for the two of you and keeps everyone else out.

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (household_id, user_id)
);

-- Every tracked thing (tasks, notes, meds, games...) is one row; "data" holds its fields.
create table if not exists items (
  id text primary key,
  household_id uuid not null references households(id) on delete cascade,
  kind text not null,
  data jsonb not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp()
);
create index if not exists items_sync on items (household_id, synced_at);

create or replace function touch_synced_at() returns trigger language plpgsql as $$
begin new.synced_at := clock_timestamp(); return new; end $$;
drop trigger if exists items_touch on items;
create trigger items_touch before insert or update on items for each row execute function touch_synced_at();

create or replace function is_member(h uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid())
$$;

alter table households enable row level security;
alter table household_members enable row level security;
alter table items enable row level security;

drop policy if exists "members see household" on households;
create policy "members see household" on households for select using (is_member(id));
drop policy if exists "members see members" on household_members;
create policy "members see members" on household_members for select using (is_member(household_id));
drop policy if exists "members use items" on items;
create policy "members use items" on items for all using (is_member(household_id)) with check (is_member(household_id));

-- The first person creates the household; the code it returns is the invite code.
create or replace function create_household() returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  select household_id into h from household_members where user_id = auth.uid() limit 1;
  if h is not null then return h; end if;
  insert into households default values returning id into h;
  insert into household_members values (h, auth.uid());
  return h;
end $$;

-- The second person joins with that code. A household holds two people at most.
create or replace function join_household(code uuid) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from households where id = code) then raise exception 'That invite code was not found'; end if;
  if (select count(*) from household_members where household_id = code) >= 2 then raise exception 'That household is already full'; end if;
  delete from household_members where user_id = auth.uid();
  insert into household_members values (code, auth.uid()) on conflict do nothing;
  return code;
end $$;
