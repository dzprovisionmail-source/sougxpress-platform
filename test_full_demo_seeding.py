import json
import os
import time
import urllib.request
import urllib.error
import urllib.parse

SUPABASE_URL = os.environ["EXPO_PUBLIC_SUPABASE_URL"]
ANON_KEY = os.environ["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
FOUNDER_EMAIL = os.environ["FOUNDER_EMAIL"]
FOUNDER_PASSWORD = os.environ["FOUNDER_PASSWORD"]

def api(method, path, payload=None, token=None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", ANON_KEY)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return {"__http_error": e.code, "__body": json.loads(body)}
        except Exception:
            return {"__http_error": e.code, "__body": body}

# 1. Sign in as founder
print("Signing in as founder...")
resp = api("POST", "/auth/v1/token?grant_type=password", {
    "email": FOUNDER_EMAIL,
    "password": FOUNDER_PASSWORD,
})
if "access_token" not in resp:
    print("AUTH_FAILED:", json.dumps(resp, ensure_ascii=False))
    exit(1)
founder_token = resp["access_token"]
founder_id = resp["user"]["id"]
print(f"AUTH_OK founder_id={founder_id}")

unix_ms = int(time.time() * 1000)

# demo data
DRIVERS = [
    {"full_name": "محمد أحمد", "phone": f"0555{unix_ms % 1000000}1", "vehicle_type": "دراجة نارية", "vehicle_number": f"DZ-{unix_ms % 10000}1"},
    {"full_name": "يوسف بن عمر", "phone": f"0555{unix_ms % 1000000}2", "vehicle_type": "سيارة", "vehicle_number": f"DZ-{unix_ms % 10000}2"},
    {"full_name": "عمر خالد", "phone": f"0555{unix_ms % 1000000}3", "vehicle_type": "مركبات تجارية خفيفة", "vehicle_number": f"DZ-{unix_ms % 10000}3"},
    {"full_name": "رياض محمود", "phone": f"0555{unix_ms % 1000000}4", "vehicle_type": "دراجة نارية", "vehicle_number": ""},
    {"full_name": "كريم سعيد", "phone": f"0555{unix_ms % 1000000}5", "vehicle_type": "سيارة", "vehicle_number": ""},
]

CUSTOMERS = [
    {"full_name": "فاطمة بن علي", "address": "حي برج الحمام", "is_gold_member": True},
    {"full_name": "خديجة أمين", "address": "حي وسط المدينة", "is_gold_member": False},
    {"full_name": "أمينة رضا", "address": "حي 19 مارس", "is_gold_member": True},
    {"full_name": "سارة بوزيد", "address": "حي بني الجديد", "is_gold_member": False},
    {"full_name": "نورة حمدي", "address": "حي امزي", "is_gold_member": True},
    {"full_name": "ليلى عمر", "address": "حي الوئام", "is_gold_member": False},
    {"full_name": "جميلة عمار", "address": "حي السلام", "is_gold_member": False},
    {"full_name": "رضا بوزيان", "address": "شارع بوعرفة عبد الرحمن", "is_gold_member": True},
    {"full_name": "هدى مراد", "address": "حي الكاسطور", "is_gold_member": False},
    {"full_name": "إيمان ناصر", "address": "حي عين الصفراء", "is_gold_member": True},
    {"full_name": "meriem sodki", "address": "حي الفيلاج", "is_gold_member": False},
    {"full_name": "آية صلاح", "address": "حي 20 أوت", "is_gold_member": True},
    {"full_name": "بسمة فهمي", "address": "حي قصر السباع", "is_gold_member": False},
    {"full_name": "تسنيم رضوان", "address": "حي الحجار", "is_gold_member": False},
    {"full_name": "جنى مجيد", "address": "حي المقطع", "is_gold_member": True},
    {"full_name": "ديالا شريف", "address": "حي بوخضرة", "is_gold_member": False},
    {"full_name": "سمر علاء", "address": "حي أول نوفمبر", "is_gold_member": False},
    {"full_name": "لينا قصي", "address": "حي الإخوة قاسم", "is_gold_member": True},
    {"full_name": "هند زياد", "address": "حي 17 أكتوبر", "is_gold_member": False},
    {"full_name": "سلمى طارق", "address": "حي الحرية", "is_gold_member": False},
]

STORES = [
    {"name": "سوبرات الاستقامة", "neighborhood": "حي برج الحمام", "category": "مواد غذائية", "description": "متجر مواد غذائية يقدم أجود الأنواع"},
    {"name": "مخبزة النور", "neighborhood": "حي وسط المدينة (الفيلاج)", "category": "مخبزة", "description": "مخبز تقليدي بالخبز الطازج يومياً"},
    {"name": "صيدلية الشفاء", "neighborhood": "حي 19 مارس", "category": "صيدلية", "description": "صيدلية مجهزة بجميع الأدوية الأساسية"},
    {"name": "بقالة البركة", "neighborhood": "حي بني الجديد (طريق بشار)", "category": "بقالة", "description": "بقالة عائلية بأسعار مناسبة"},
    {"name": "مطعم الواحة", "neighborhood": "حي امزي (بومريفق)", "category": "مطعم", "description": "مطم يقدم الأكلات التقليدية الجزائرية"},
    {"name": "محل خضر وفواكه الوفاء", "neighborhood": "حي الوئام", "category": "خضر وفواكه", "description": "خضروات وفواكه طازجة يومياً"},
    {"name": "مكتبة النجاح", "neighborhood": "حي السلام", "category": "مكتبة", "description": "مكتبة للقراءة والمواد المدرسية"},
    {"name": "محل ألبسة الأصيل", "neighborhood": "شارع بوعرفة عبد الرحمن (لوطوروت)", "category": "ملابس", "description": "ألبسة رجالية ونسائية"},
    {"name": "جزارة الرحمة", "neighborhood": "حي الكاسطور", "category": "لحوم", "description": "لحوم طازجة مع التقطيع حسب الطلب"},
    {"name": "مقهى عين الصفراء", "neighborhood": "حي وسط المدينة (الفيلاج)", "category": "مقهى", "description": "مقهى لقاءات وعصائر طبيعية"},
]

results = {"drivers": [], "customers": [], "stores": [], "merchants": []}
errors = []

# 2. Create 5 demo drivers
print("\nCreating 5 demo drivers...")
for i, d in enumerate(DRIVERS):
    resp = api("POST", "/functions/v1/admin-provision-account", {
        "role": "driver",
        "full_name": d["full_name"],
        "phone": d["phone"],
        "vehicle_type": d["vehicle_type"],
        "vehicle_number": d["vehicle_number"] or None,
        "status": "active",
        "is_demo": True,
    }, founder_token)
    if resp.get("success"):
        results["drivers"].append({"name": d["full_name"], "id": resp["user_id"]})
        print(f"  DRIVER {i+1}/5 OK: {d['full_name']}")
    else:
        err = json.dumps(resp, ensure_ascii=False)
        errors.append(f"DRIVER {i+1}: {d['full_name']} -> {err}")
        print(f"  DRIVER {i+1}/5 FAILED: {err}")

# 3. Create 20 demo customers
print("\nCreating 20 demo customers...")
for i, c in enumerate(CUSTOMERS):
    phone = f"demo-customer-{unix_ms}-{i}@local"
    resp = api("POST", "/functions/v1/admin-provision-account", {
        "role": "customer",
        "full_name": c["full_name"],
        "phone": phone,
        "address": c["address"],
        "is_gold_member": c["is_gold_member"],
        "status": "active",
        "is_demo": True,
    }, founder_token)
    if resp.get("success"):
        results["customers"].append({"name": c["full_name"], "id": resp["user_id"], "gold": c["is_gold_member"]})
        print(f"  CUSTOMER {i+1}/20 OK: {c['full_name']}")
    else:
        err = json.dumps(resp, ensure_ascii=False)
        errors.append(f"CUSTOMER {i+1}: {c['full_name']} -> {err}")
        print(f"  CUSTOMER {i+1}/20 FAILED: {err}")

# 4. Create 10 demo stores (each with own demo merchant)
print("\nCreating 10 demo stores...")
for i, s in enumerate(STORES):
    resp = api("POST", "/functions/v1/admin-provision-account", {
        "role": "merchant",
        "full_name": f"تاجر تجريبي {unix_ms}-{i}",
        "phone": f"demo-merchant-{unix_ms}-{i}@local",
        "business_name": f"تاجر تجريبي {unix_ms}-{i}",
        "status": "active",
        "is_demo": True,
    }, founder_token)
    if not resp.get("success"):
        err = json.dumps(resp, ensure_ascii=False)
        errors.append(f"MERCHANT {i+1}: {s['name']} -> {err}")
        print(f"  MERCHANT {i+1}/10 FAILED: {err}")
        continue
    merchant_id = resp["user_id"]
    results["merchants"].append({"name": f"تاجر تجريبي {unix_ms}-{i}", "id": merchant_id})

    store_payload = {
        "name": s["name"],
        "category": s["category"],
        "merchant_id": merchant_id,
        "zone_id": None,
        "address_line1": s["neighborhood"],
        "city": "عين الصفراء",
        "country": "DZ",
        "status": "active",
        "is_open": True,
        "opens_at": "08:00:00",
        "closes_at": "22:00:00",
        "is_demo": True,
        "created_by": founder_id,
        "description": s["description"],
        "admin_notes": f"تجريبي: {s['description']}",
    }
    resp = api("POST", "/rest/v1/stores", store_payload, founder_token)
    if isinstance(resp, list) and len(resp) > 0:
        store_id = resp[0]["id"]
        results["stores"].append({"name": s["name"], "id": store_id})
        print(f"  STORE {i+1}/10 OK: {s['name']}")
    elif isinstance(resp, dict) and resp.get("id"):
        store_id = resp["id"]
        results["stores"].append({"name": s["name"], "id": store_id})
        print(f"  STORE {i+1}/10 OK: {s['name']}")
    elif isinstance(resp, dict) and resp == {}:
        verify_resp = api("GET", f"/rest/v1/stores?select=id,name&name=eq.{urllib.parse.quote(s['name'])}&order=created_at.desc&limit=1", token=founder_token)
        if isinstance(verify_resp, list) and len(verify_resp) > 0:
            store_id = verify_resp[0]["id"]
            results["stores"].append({"name": s["name"], "id": store_id})
            print(f"  STORE {i+1}/10 OK (verified): {s['name']}")
        else:
            err = json.dumps(resp, ensure_ascii=False)
            errors.append(f"STORE {i+1}: {s['name']} -> {err}")
            print(f"  STORE {i+1}/10 FAILED: {err}")
    else:
        err = json.dumps(resp, ensure_ascii=False)
        errors.append(f"STORE {i+1}: {s['name']} -> {err}")
        print(f"  STORE {i+1}/10 FAILED: {err}")

# 5. Verify is_demo flags
print("\nVerifying is_demo flags...")
for table in ["drivers", "customers", "stores", "merchants"]:
    ids = [r["id"] for r in results[table]]
    for eid in ids:
        resp = api("GET", f"/rest/v1/{table}?select=id,is_demo&id=eq.{eid}", token=founder_token)
        if isinstance(resp, list) and len(resp) > 0:
            flag = resp[0].get("is_demo")
            if flag is not True:
                errors.append(f"{table} {eid} is_demo={flag}")
                print(f"  MISMATCH {table} {eid} is_demo={flag}")

# 6. Verify public-facing store query returns no demo label
print("\nVerifying public-facing store queries...")
public_check = api("GET", f"/rest/v1/stores?select=id,name,category,status,is_demo&limit=5")
if isinstance(public_check, list):
    has_demo_label_in_public = any(row.get("is_demo") for row in public_check)
    print(f"  Public stores count: {len(public_check)}")
    print(f"  Customer sees is_demo column: {has_demo_label_in_public}")
else:
    print(f"  Public query unexpected: {public_check}")

# 7. Verify founder sees demo labels internally
print("\nVerifying founder internal demo visibility...")
internal_check = api("GET", f"/rest/v1/stores?select=id,name,is_demo&limit=5", token=founder_token)
if isinstance(internal_check, list):
    print(f"  Founder stores count: {len(internal_check)}")
    for row in internal_check:
        print(f"    {row.get('name')} | is_demo={row.get('is_demo')}")

print("\n=== SUMMARY ===")
print(f"Drivers created: {len(results['drivers'])}/5")
print(f"Customers created: {len(results['customers'])}/20")
print(f"Merchants created: {len(results['merchants'])}/10")
print(f"Stores created: {len(results['stores'])}/10")
print(f"Errors: {len(errors)}")
if errors:
    for e in errors:
        print(f"  ERROR: {e}")
print("TEST_DONE")
