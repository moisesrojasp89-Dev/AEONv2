import urllib.request
import json

oanda_token = "48dc4be15b7ed823417264b394f24aa5-1a21bab84499c78af5329491aba2a2af"
account_id = "101-001-39508457-001"

# OANDA practice/live pricing endpoint
instruments = "XAU_USD,EUR_USD,USD_JPY,GBP_USD,USD_CAD,AUD_USD,NZD_USD,USD_CHF,SPX500_USD,NAS100_USD,US30_USD,JP225_USD"
url = f"https://api-fxpractice.oanda.com/v3/accounts/{account_id}/pricing?instruments={instruments}"

req = urllib.request.Request(url, headers={
    "Authorization": f"Bearer {oanda_token}",
    "Content-Type": "application/json"
})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print("=== OANDA REAL LIVE SPOT PRICES ===")
        for p in data.get("prices", []):
            inst = p.get("instrument")
            bids = p.get("bids", [{}])[0].get("price", "0")
            asks = p.get("asks", [{}])[0].get("price", "0")
            mid = (float(bids) + float(asks)) / 2.0
            print(f"{inst:<12} -> Bid: {bids} | Ask: {asks} | Mid: {mid:.4f}")
except Exception as e:
    print("OANDA Error:", e)
