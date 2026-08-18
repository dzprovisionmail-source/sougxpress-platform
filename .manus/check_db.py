import json
import subprocess

project_id = "pmxydehrctwvawjbhrhl"
driver_id = "4570e2c4-c7eb-4688-9e52-840b53357553"

queries = [
    f"SELECT * FROM public.favorite_couriers WHERE courier_id = '{driver_id}'",
    f"SELECT * FROM public.courier_favorites WHERE courier_id = '{driver_id}'",
    f"SELECT * FROM get_courier_interested_customers('{driver_id}')",
    f"SELECT id, name FROM public.stores WHERE id IN ('da40cdbf-d3a8-4792-9e97-05235ee2d4d3', '164c8c03-b711-4384-b0e4-9e75790efde9', '1bdc85a8-a0d2-49d2-8296-bae9e106492e', 'cf37bd0b-784e-417c-9a7a-6a61ae9e5dd4')"
]

for q in queries:
    payload = {
        "project_id": project_id,
        "query": q
    }
    print(f"--- Running query: {q} ---")
    result = subprocess.run(
        ["manus-mcp-cli", "tool", "call", "execute_sql", "--server", "supabase", "--input", json.dumps(payload)],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    print(result.stderr)
