create table if not exists public.tags (
  id text primary key,
  name text not null,
  category text not null check (category in ('structure', 'role', 'layout', 'style', 'element', 'custom'))
);

create table if not exists public.pagination_sections (
  id text primary key,
  title text not null,
  order_index integer not null default 0,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pagination_pages (
  id text primary key,
  section_id text not null references public.pagination_sections(id) on delete cascade,
  page_number integer not null,
  title text not null,
  description text not null default '',
  structure_tags text[] not null default '{}',
  selected_slide_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.slide_references (
  id text primary key,
  title text not null,
  image_url text not null default '',
  source_name text not null default '',
  page_number integer,
  role_tags text[] not null default '{}',
  structure_tags text[] not null default '{}',
  layout_tags text[] not null default '{}',
  style_tags text[] not null default '{}',
  element_tags text[] not null default '{}',
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.style_references (
  id text primary key,
  title text not null,
  image_url text not null default '',
  tone text not null default '',
  colors text[] not null default '{}',
  layout_notes text not null default '',
  style_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_pagination_pages_section_id on public.pagination_pages(section_id);
create index if not exists idx_slide_references_structure_tags on public.slide_references using gin(structure_tags);
create index if not exists idx_slide_references_layout_tags on public.slide_references using gin(layout_tags);
create index if not exists idx_slide_references_style_tags on public.slide_references using gin(style_tags);
create index if not exists idx_style_references_style_tags on public.style_references using gin(style_tags);

alter table public.tags enable row level security;
alter table public.pagination_sections enable row level security;
alter table public.pagination_pages enable row level security;
alter table public.slide_references enable row level security;
alter table public.style_references enable row level security;

create policy "team read tags" on public.tags for select using (true);
create policy "team write tags" on public.tags for all using (true) with check (true);

create policy "team read sections" on public.pagination_sections for select using (true);
create policy "team write sections" on public.pagination_sections for all using (true) with check (true);

create policy "team read pages" on public.pagination_pages for select using (true);
create policy "team write pages" on public.pagination_pages for all using (true) with check (true);

create policy "team read slides" on public.slide_references for select using (true);
create policy "team write slides" on public.slide_references for all using (true) with check (true);

create policy "team read styles" on public.style_references for select using (true);
create policy "team write styles" on public.style_references for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('slide-references', 'slide-references', true)
on conflict (id) do nothing;

create policy "team read reference images"
on storage.objects for select
using (bucket_id = 'slide-references');

create policy "team upload reference images"
on storage.objects for insert
with check (bucket_id = 'slide-references');

create policy "team update reference images"
on storage.objects for update
using (bucket_id = 'slide-references')
with check (bucket_id = 'slide-references');

create policy "team delete reference images"
on storage.objects for delete
using (bucket_id = 'slide-references');
