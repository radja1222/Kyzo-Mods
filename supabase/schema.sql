create type public.app_role as enum ('user','moderator','admin','owner');
create type public.mod_type as enum ('free','paid');
create type public.mod_status as enum ('pending','approved','rejected','hidden');

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username varchar(32) unique not null,
 avatar_url text,
 bio varchar(255),
 role public.app_role not null default 'user',
 created_at timestamptz default now()
);

create table public.categories(
 id bigint generated always as identity primary key,
 game text not null check(game in ('samp','fivem')),
 name text not null,
 slug text unique not null,
 description text
);

insert into public.categories(game,name,slug,description) values
('samp','Graphics / ENB','samp-graphics','ENB, visual dan graphics enhancement'),
('samp','Vehicle','samp-vehicle','Vehicle mods'),
('samp','Ped / Skin','samp-skin','Ped dan skin'),
('samp','Map / Object','samp-map','Map dan object'),
('samp','CLEO / Script','samp-script','CLEO dan script'),
('fivem','Graphics / Visual','fivem-graphics','Visual enhancement'),
('fivem','Vehicle','fivem-vehicle','Vehicle mods'),
('fivem','EUP / Ped','fivem-eup','EUP dan ped'),
('fivem','MLO / Map','fivem-mlo','MLO dan map'),
('fivem','Script / Resource','fivem-script','Resource FiveM');

create table public.mods(
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 category_id bigint not null references public.categories(id),
 title varchar(150) not null,
 slug varchar(190) unique not null,
 description text not null,
 version varchar(30) default '1.0.0',
 mod_type public.mod_type not null default 'free',
 price numeric(12,2) not null default 0 check(price>=0),
 file_path text not null,
 thumbnail_url text,
 downloads bigint not null default 0,
 views bigint not null default 0,
 status public.mod_status not null default 'pending',
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table public.favorites(user_id uuid references public.profiles(id) on delete cascade,mod_id bigint references public.mods(id) on delete cascade,created_at timestamptz default now(),primary key(user_id,mod_id));
create table public.comments(id bigint generated always as identity primary key,user_id uuid references public.profiles(id) on delete cascade,mod_id bigint references public.mods(id) on delete cascade,content text not null,status text default 'visible',created_at timestamptz default now());
create table public.ratings(user_id uuid references public.profiles(id) on delete cascade,mod_id bigint references public.mods(id) on delete cascade,rating int not null check(rating between 1 and 5),review text,created_at timestamptz default now(),primary key(user_id,mod_id));
create table public.reports(id bigint generated always as identity primary key,user_id uuid references public.profiles(id) on delete cascade,mod_id bigint references public.mods(id) on delete cascade,comment_id bigint references public.comments(id) on delete cascade,reason text not null,status text default 'open',created_at timestamptz default now());
create table public.orders(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete cascade,mod_id bigint references public.mods(id) on delete cascade,amount numeric(12,2) not null,status text not null default 'pending',payment_ref text,created_at timestamptz default now(),unique(user_id,mod_id));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into public.profiles(id,username) values(new.id,coalesce(new.raw_user_meta_data->>'username','user_'||substr(new.id::text,1,8))) on conflict(id) do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.mods enable row level security;
alter table public.categories enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.orders enable row level security;

create policy "public approved mods" on public.mods for select using(status='approved' or auth.uid()=user_id);
create policy "public categories" on public.categories for select using(true);
create policy "own profile read" on public.profiles for select using(true);
create policy "own profile update" on public.profiles for update using(auth.uid()=id);
create policy "own mod insert" on public.mods for insert with check(auth.uid()=user_id and (mod_type='free' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner'))));
create policy "own mod update" on public.mods for update using(auth.uid()=user_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner')));
create policy "favorites own" on public.favorites for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "comments read" on public.comments for select using(status='visible');
create policy "comments own insert" on public.comments for insert with check(auth.uid()=user_id);
create policy "ratings read" on public.ratings for select using(true);
create policy "ratings own" on public.ratings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "reports own" on public.reports for insert with check(auth.uid()=user_id);
create policy "orders own read" on public.orders for select using(auth.uid()=user_id);

-- IMPORTANT: set your own owner UUID after creating your account:
-- update public.profiles set role='owner' where id='YOUR_AUTH_USER_UUID';

insert into storage.buckets(id,name,public) values('thumbnails','thumbnails',true) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('mods','mods',false) on conflict(id) do nothing;

create policy "thumb public read" on storage.objects for select using(bucket_id='thumbnails');
create policy "user upload thumb" on storage.objects for insert with check(bucket_id='thumbnails' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "user upload mod" on storage.objects for insert with check(bucket_id='mods' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "user delete own files" on storage.objects for delete using(auth.uid()::text=(storage.foldername(name))[1]);


-- Payment indexes / reconciliation helpers
create index if not exists orders_user_mod_idx on public.orders(user_id,mod_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists mods_status_created_idx on public.mods(status,created_at desc);
