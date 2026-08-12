-- 20260812100000_hero_sliders.sql
-- Dynamic Market Hero Slider Table, RLS Policies, and Seed Data

create table if not exists public.market_hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null default '',
  content_type text not null default 'custom', -- product, store, promotion, custom, internal
  target_id text,
  cta_label text default 'تسوق الآن',
  is_active boolean not null default true,
  display_order integer not null default 0,
  priority integer not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.market_hero_slides enable row level security;

-- Policy: Everyone can read active slides
create policy "Public can read active hero slides"
  on public.market_hero_slides
  for select
  using (
    is_active = true 
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

-- Policy: Founder / Admin full access
create policy "Founder and admin full access to hero slides"
  on public.market_hero_slides
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'founder')
    )
  );

-- Seed initial slides
insert into public.market_hero_slides (title, subtitle, image_url, content_type, cta_label, is_active, display_order, priority)
values 
  ('عروض الأسبوع الحصرية', 'خصومات كبرى على المنتجات الطازجة والمحلية', '', 'promotion', 'تسوق الآن', true, 1, 10),
  ('متجر جديد في السوق', 'اكتشف أحدث المتاجر المضافة في عين صفراء', '', 'custom', 'اكتشف المتجر', true, 2, 5),
  ('توصيل سريع ومضمون', 'خدمة توصيل تغطي كافة أحياء المدينة بكل أمان', '', 'custom', 'اطلب الآن', true, 3, 1)
on conflict do nothing;
