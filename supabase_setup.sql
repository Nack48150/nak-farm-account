-- NAK FARM ACCOUNT: Supabase authentication / roles
-- 1) Run this in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin','user','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_active=true));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role,is_active)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'user',true)
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- หลังจากสร้างบัญชี Admin ใน Supabase > Authentication > Users แล้ว
-- ให้นำ UID ของบัญชีคุณมาใส่แทน YOUR-ADMIN-UID แล้วรันบรรทัดนี้:
-- update public.profiles set role='admin', is_active=true where id='YOUR-ADMIN-UID';

-- แนะนำให้เปิด RLS กับตารางข้อมูลเดิม และให้ Admin/User เขียนได้, Viewer อ่านได้
-- ถ้าตารางของคุณมี RLS/policies อยู่แล้ว ให้ตรวจสอบก่อนเพิ่ม policy ซ้ำ

-- Helper functions สำหรับ policy
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and is_active=true);
$$;
create or replace function public.can_write_data()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and is_active=true and role in ('admin','user'));
$$;

-- ตารางข้อมูลของ NAK FARM
-- เปิดใช้ทีละตารางได้ หากต้องการล็อกฐานข้อมูลให้ผู้ Login เท่านั้น
-- alter table public.customers enable row level security;
-- alter table public.jobs enable row level security;
-- alter table public.fuels enable row level security;
-- alter table public.money enable row level security;
-- alter table public.payments enable row level security;

-- ตัวอย่าง policy: เปิดใช้หลังตรวจสอบชื่อตาราง/คอลัมน์ของคุณแล้ว
-- create policy "data_read" on public.customers for select to authenticated using (public.is_active_user());
-- create policy "data_write" on public.customers for all to authenticated using (public.can_write_data()) with check (public.can_write_data());
