-- Run once in a NEW Supabase project's SQL Editor. No service key belongs in the browser.
begin;
create table public.menu_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.menu_admins enable row level security;
revoke all on public.menu_admins from anon, authenticated;
grant select on public.menu_admins to authenticated;
create policy "Read own administrator membership" on public.menu_admins for select to authenticated using (user_id = (select auth.uid()));
create table public.menu_items (
 id uuid primary key default gen_random_uuid(),
 restaurant text not null check (restaurant in ('korea','sushi')),
 menu_type text not null check (menu_type in ('dining','takeout')),
 category text not null check (length(trim(category)) between 1 and 100),
 name_en text not null check (length(trim(name_en)) between 1 and 150),
 name_ko text not null default '' check (length(name_ko) <= 150),
 description text not null default '' check (length(description) <= 2000),
 price numeric(6,2) not null check (price between 0 and 9999.99),
 image_url text not null default '' check (image_url = '' or image_url ~ '^https://'),
 visible boolean not null default false, sold_out boolean not null default false,
 sort_order integer not null default 0 check (sort_order >= 0)
);
alter table public.menu_items enable row level security;
revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
create policy "Guests read published menus" on public.menu_items for select to anon, authenticated using (visible);
create policy "Administrators manage menus" on public.menu_items for all to authenticated
 using (exists (select 1 from public.menu_admins where user_id = (select auth.uid())))
 with check (exists (select 1 from public.menu_admins where user_id = (select auth.uid())));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 values ('menu-photos','menu-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Administrators upload menu photos" on storage.objects for insert to authenticated
 with check (bucket_id = 'menu-photos' and exists (select 1 from public.menu_admins where user_id = (select auth.uid())));
-- Create the owner's email/password user in Authentication first, then run:
-- insert into public.menu_admins (user_id) values ('OWNER_AUTH_USER_UUID');
-- Disable public signup in Authentication settings. Membership can only be granted via trusted SQL.

commit;
