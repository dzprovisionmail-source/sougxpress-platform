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

# 2. Create one demo driver via Edge Function
print("\nCreating demo driver...")
resp = api("POST", "/functions/v1/admin-provision-account", {
    "role": "driver",
    "full_name": "محمد أحمد",
    "phone": f"0555{unix_ms % 1000000}",
    "vehicle_type": "دراجة نارية",
    "vehicle_number": f"DZ-{unix_ms % 10000}",
    "status": "active",
    "is_demo": True,
}, founder_token)
if resp.get("success"):
    driver_id = resp["user_id"]
    print(f"DRIVER_OK id={driver_id}")
else:
    print("DRIVER_FAILED:", json.dumps(resp, ensure_ascii=False))
    driver_id = None

# 3. Create one demo customer via Edge Function
print("\nCreating demo customer...")
resp = api("POST", "/functions/v1/admin-provision-account", {
    "role": "customer",
    "full_name": "فاطمة بن علي",
    "phone": f"demo-customer-{unix_ms}@local",
    "address": "حي 19 مارس",
    "status": "active",
    "is_demo": True,
}, founder_token)
if resp.get("success"):
    customer_id = resp["user_id"]
    print(f"CUSTOMER_OK id={customer_id}")
else:
    print("CUSTOMER_FAILED:", json.dumps(resp, ensure_ascii=False))
    customer_id = None

# 4. Create one demo store (direct PostgREST, no Edge Function)
print("\nCreating demo store...")
resp = api("POST", "/functions/v1/admin-provision-account", {
    "role": "merchant",
    "full_name": f"تاجر تجريبي {unix_ms}",
    "phone": f"demo-merchant-{unix_ms}@local",
    "business_name": f"تاجر تجريبي {unix_ms}",
    "status": "active",
    "is_demo": True,
}, founder_token)
if resp.get("success"):
    merchant_id = resp["user_id"]
    print(f"MERCHANT_OK id={merchant_id}")
else:
    print("MERCHANT_FAILED:", json.dumps(resp, ensure_ascii=False))
    merchant_id = None

if merchant_id:
    store_payload = {
        "name": "سوبرات الاستقامة",
        "category": "مواد غذائية",
        "merchant_id": merchant_id,
        "zone_id": None,
        "address_line1": "حي برج الحمام",
        "city": "عين الصفراء",
        "country": "DZ",
        "status": "active",
        "is_open": True,
        "opens_at": "08:00:00",
        "closes_at": "22:00:00",
        "is_demo": True,
        "created_by": founder_id,
        "admin_notes": "متجر مواد غذائية تجريبي للاختبار",
        "description": "متجر مواد غذائية تجريبي للاختبار",
    }
    resp = api("POST", "/rest/v1/stores", store_payload, founder_token)
    if isinstance(resp, list) and len(resp) > 0:
        store_id = resp[0]["id"]
        print(f"STORE_OK id={store_id}")
    elif isinstance(resp, dict) and resp.get("id"):
        store_id = resp["id"]
        print(f"STORE_OK id={store_id}")
    elif isinstance(resp, dict) and resp == {}:
        # Empty response may mean success with no return body
        # Verify by querying the store we expect to create
        print("STORE_EMPTY_RESPONSE verifying by query...")
        verify_resp = api("GET", f"/rest/v1/stores?select=id,name&name=eq.{urllib.parse.quote('سوبرات الاستقامة')}&order=created_at.desc&limit=1", token=founder_token)
        if isinstance(verify_resp, list) and len(verify_resp) > 0:
            store_id = verify_resp[0]["id"]
            print(f"STORE_OK id={store_id}")
        else:
            print("STORE_VERIFY_FAILED:", json.dumps(verify_resp, ensure_ascii=False))
            store_id = None
    else:
        print("STORE_FAILED:", json.dumps(resp, ensure_ascii=False))
        store_id = None
else:
    store_id = None

# 5. Verify is_demo flags are set
print("\nVerifying is_demo flags...")
for table, pk, entity_id in [("drivers", "id", driver_id), ("customers", "id", customer_id), ("stores", "id", store_id), ("merchants", "id", merchant_id)]:
    if not entity_id:
        continue
    resp = api("GET", f"/rest/v1/{table}?select=id,is_demo&{pk}=eq.{entity_id}", token=founder_token)
    if isinstance(resp, list) and len(resp) > 0:
        row = resp[0]
        flag = row.get("is_demo")
        status = "OK" if flag is True else f"MISMATCH (got {flag})"
        print(f"  {table} is_demo={flag} -> {status}")
    else:
        print(f"  {table} NOT_FOUND")

# 6. Verify public-facing store visibility (no demo label)
print("\nVerifying public-facing store visibility...")
if store_id:
    resp = api("GET", f"/rest/v1/stores?select=id,name,category,status&id=eq.{store_id}")
    if isinstance(resp, list) and len(resp) > 0:
        row = resp[0]
        print(f"  Public store query OK: name={row.get('name')} status={row.get('status')}")
    else:
        print("  Public store query FAILED")

print("\nTEST_DONE")
