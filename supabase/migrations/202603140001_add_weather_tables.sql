create table if not exists public.weather_saved_cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city_name text not null,
  place_id text,
  latitude double precision not null,
  longitude double precision not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists weather_saved_cities_user_place_id_idx
  on public.weather_saved_cities (user_id, place_id)
  where place_id is not null;

create unique index if not exists weather_saved_cities_user_city_name_idx
  on public.weather_saved_cities (user_id, lower(city_name));

create table if not exists public.weather_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_city_id uuid references public.weather_saved_cities(id) on delete set null,
  default_city_id uuid references public.weather_saved_cities(id) on delete set null,
  unit text not null default 'C' check (unit in ('C', 'F')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_weather_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists weather_settings_updated_at on public.weather_settings;

create trigger weather_settings_updated_at
before update on public.weather_settings
for each row
execute function public.touch_weather_settings_updated_at();

alter table public.weather_saved_cities enable row level security;
alter table public.weather_settings enable row level security;

drop policy if exists "weather_saved_cities_select_own" on public.weather_saved_cities;
create policy "weather_saved_cities_select_own"
on public.weather_saved_cities
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "weather_saved_cities_insert_own" on public.weather_saved_cities;
create policy "weather_saved_cities_insert_own"
on public.weather_saved_cities
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "weather_saved_cities_update_own" on public.weather_saved_cities;
create policy "weather_saved_cities_update_own"
on public.weather_saved_cities
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weather_saved_cities_delete_own" on public.weather_saved_cities;
create policy "weather_saved_cities_delete_own"
on public.weather_saved_cities
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "weather_settings_select_own" on public.weather_settings;
create policy "weather_settings_select_own"
on public.weather_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "weather_settings_insert_own" on public.weather_settings;
create policy "weather_settings_insert_own"
on public.weather_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "weather_settings_update_own" on public.weather_settings;
create policy "weather_settings_update_own"
on public.weather_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
