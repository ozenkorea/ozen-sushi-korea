-- Atomic ordering; retains the caller's existing row-level security permissions.
create or replace function public.reorder_menu_items(ordered_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  expected integer := cardinality(ordered_ids);
  found_count integer;
  scope_count integer;
begin
  if not exists (select 1 from public.menu_admins where user_id = auth.uid()) then
    raise exception 'Menu administrator access required' using errcode = '42501';
  end if;
  if expected is null or expected < 1 or expected > 1000
     or (select count(distinct id) from unnest(ordered_ids) as input(id)) <> expected then
    raise exception 'Invalid menu order';
  end if;
  perform id from public.menu_items where id = any(ordered_ids) order by id for update;
  select count(*), count(distinct (restaurant, menu_type, category))
    into found_count, scope_count from public.menu_items where id = any(ordered_ids);
  if found_count <> expected or scope_count <> 1 then
    raise exception 'Menus changed; reload before reordering';
  end if;
  update public.menu_items as item set sort_order = (input.position - 1)::integer * 10
    from unnest(ordered_ids) with ordinality as input(id, position)
    where item.id = input.id;
end;
$$;
revoke all on function public.reorder_menu_items(uuid[]) from public, anon;
grant execute on function public.reorder_menu_items(uuid[]) to authenticated;
