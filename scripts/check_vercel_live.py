import urllib.request

req = urllib.request.Request(
    'https://aeondev.vercel.app/mercados.html',
    headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'Cache-Control': 'no-cache'}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Headers:")
        for k, v in resp.getheaders():
            print(f"  {k}: {v}")
        html = resp.read().decode('utf-8')
        print("\n--- HTML snippet from live Vercel ---")
        for line in html.splitlines():
            if 'drawer-pro-card' in line or 'markets-swipe-hint' in line or 'svg width' in line or '📡' in line:
                print(line)
except Exception as e:
    print("Error fetching:", e)
