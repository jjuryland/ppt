-- Team-ready Supabase schema draft.
-- Use this instead of schema.sql when deploying beyond a local MVP.
-- The current app needs repository changes before this schema can fully replace schema.sql.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_slide_references (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  image_path text not null default '',
  source_name text not null default '',
  page_number integer,
  role_tags text[] not null default '{}',
  structure_tags text[] not null default '{}',
  layout_tags text[] not null default '{}',
  style_tags text[] not null default '{}',
  element_tags text[] not null default '{}',
  memo text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.team_pagination_sections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  is_open boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_pagination_pages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  section_id uuid not null references public.team_pagination_sections(id) on delete cascade,
  page_number integer not null,
  title text not null,
  description text not null default '',
  structure_tags text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_page_slide_references (
  team_id uuid not null references public.teams(id) on delete cascade,
  page_id uuid not null references public.team_pagination_pages(id) on delete cascade,
  slide_id uuid not null references public.team_slide_references(id) on delete cascade,
  selected_by uuid references auth.users(id),
  selected_at timestamptz not null default now(),
  primary key (page_id, slide_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_slide_references enable row level security;
alter table public.team_pagination_sections enable row level security;
alter table public.team_pagination_pages enable row level security;
alter table public.team_page_slide_references enable row level security;

create policy "members can read own teams"
on public.teams for select
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = id and tm.user_id = auth.uid()
));

create policy "members can read team memberships"
on public.team_members for select
using (user_id = auth.uid() or exists (
  select 1 from public.team_members tm
  where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
));

create policy "members can read slides"
on public.team_slide_references for select
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_slide_references.team_id and tm.user_id = auth.uid()
));

create policy "members can write slides"
on public.team_slide_references for all
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_slide_references.team_id and tm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_slide_references.team_id and tm.user_id = auth.uid()
));

create policy "members can read sections"
on public.team_pagination_sections for select
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_sections.team_id and tm.user_id = auth.uid()
));

create policy "members can write sections"
on public.team_pagination_sections for all
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_sections.team_id and tm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_sections.team_id and tm.user_id = auth.uid()
));

create policy "members can read pages"
on public.team_pagination_pages for select
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_pages.team_id and tm.user_id = auth.uid()
));

create policy "members can write pages"
on public.team_pagination_pages for all
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_pages.team_id and tm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_pagination_pages.team_id and tm.user_id = auth.uid()
));

create policy "members can read page slide choices"
on public.team_page_slide_references for select
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_page_slide_references.team_id and tm.user_id = auth.uid()
));

create policy "members can write page slide choices"
on public.team_page_slide_references for all
using (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_page_slide_references.team_id and tm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.team_members tm
  where tm.team_id = team_page_slide_references.team_id and tm.user_id = auth.uid()
));
