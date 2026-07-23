-- Migration: 202607240000100_cleanup_demo_data.sql
-- Purpose: Rename any existing demo records with ugly seed/UUID/null values
-- to realistic Arabic demo names before the mobile app fix is fully live.
-- Safe: only updates rows where is_demo = true AND (name is null OR name LIKE 'seed-%' OR name LIKE 'demo-%' OR name LIKE 'تاجر تجريبي %' OR name LIKE 'تجريبي %').

BEGIN;

-- Clean demo merchants
UPDATE merchants
SET
  business_name = CASE
    WHEN business_name IS NULL OR business_name ILIKE 'seed-%' OR business_name ILIKE 'demo-%' OR business_name ILIKE 'تاجر تجريبي %' OR business_name ILIKE 'تجريبي %'
    THEN 'متجر ' || ARRAY['الوفاء','النور','الخير','السعادة','السهبة','الراحة','النجاح','الأمل','الصفوة','الرقي'][floor(random() * 10) + 1]
    ELSE business_name
  END,
  owner_full_name = CASE
    WHEN owner_full_name IS NULL OR owner_full_name ILIKE 'seed-%' OR owner_full_name ILIKE 'demo-%' OR owner_full_name = ''
    THEN ARRAY['أحمد بن محمد','عبد الله العربي','يوسف المصري','عمر الجزائري','خالد الهاشمي','سعيد الرملي','علي السعدي','حسن التلمساني','إبراهيم البلاطي','فاطمة الوهرانية'][floor(random() * 10) + 1]
    ELSE owner_full_name
  END,
  contact_phone = CASE
    WHEN contact_phone IS NULL OR contact_phone ILIKE 'seed-%' OR contact_phone ILIKE 'demo-%' OR contact_phone = ''
    THEN '0' || (2000000000 + floor(random() * 7999999999))::text
    ELSE contact_phone
  END,
  updated_at = now()
WHERE is_demo = true;

-- Clean demo stores
UPDATE stores
SET
  name = CASE
    WHEN name IS NULL OR name ILIKE 'seed-%' OR name ILIKE 'demo-%' OR name ILIKE 'تجريبي %'
    THEN 'متجر ' || ARRAY['الوفاء','النور','الخير','السعادة','السهبة','الراحة','النجاح','الأمل','الصفوة','الرقي'][floor(random() * 10) + 1]
    ELSE name
  END,
  updated_at = now()
WHERE is_demo = true;

-- Clean demo drivers
UPDATE drivers
SET
  full_name = CASE
    WHEN full_name IS NULL OR full_name ILIKE 'seed-%' OR full_name ILIKE 'demo-%' OR full_name = ''
    THEN ARRAY['أحمد بن محمد','عبد الله العربي','يوسف المصري','عمر الجزائري','خالد الهاشمي','سعيد الرملي','علي السعدي','حسن التلمساني','إبراهيم البلاطي','فاطمة الوهرانية'][floor(random() * 10) + 1]
    ELSE full_name
  END,
  phone = CASE
    WHEN phone IS NULL OR phone ILIKE 'seed-%' OR phone ILIKE 'demo-%' OR phone = ''
    THEN '0' || (2000000000 + floor(random() * 7999999999))::text
    ELSE phone
  END,
  first_name = CASE
    WHEN first_name IS NULL OR first_name ILIKE 'seed-%' OR first_name = ''
    THEN split_part(full_name, ' ', 1)
    ELSE first_name
  END,
  last_name = CASE
    WHEN last_name IS NULL OR last_name ILIKE 'seed-%' OR last_name = ''
    THEN split_part(full_name, ' ', 2)
    ELSE last_name
  END,
  updated_at = now()
WHERE is_demo = true;

-- Clean demo customers
UPDATE customers
SET
  full_name = CASE
    WHEN full_name IS NULL OR full_name ILIKE 'seed-%' OR full_name ILIKE 'demo-%' OR full_name = ''
    THEN ARRAY['أحمد بن محمد','عبد الله العربي','يوسف المصري','عمر الجزائري','خالد الهاشمي','سعيد الرملي','علي السعدي','حسن التلمساني','إبراهيم البلاطي','فاطمة الوهرانية'][floor(random() * 10) + 1]
    ELSE full_name
  END,
  first_name = CASE
    WHEN first_name IS NULL OR first_name = ''
    THEN split_part(full_name, ' ', 1)
    ELSE first_name
  END,
  last_name = CASE
    WHEN last_name IS NULL OR last_name = ''
    THEN split_part(full_name, ' ', 2)
    ELSE last_name
  END,
  phone = CASE
    WHEN phone IS NULL OR phone ILIKE 'seed-%' OR phone ILIKE 'demo-%' OR phone = ''
    THEN '0' || (2000000000 + floor(random() * 7999999999))::text
    ELSE phone
  END,
  updated_at = now()
WHERE is_demo = true;

COMMIT;
