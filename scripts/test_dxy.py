import urllib.request
import json

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

token = env.get('OANDA_TOKEN', '')
acc = env.get('OANDA_ACCOUNT_ID', '')

url = f"https://api-fxpractice.oanda.com/v3/accounts/{acc}/pricing?instruments=EUR_USD,USD_JPY,GBP_USD,USD_CAD,USD_CHF,USD_SEK"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    quotes = {}
    for p in data.get('prices', []):
        mid = (float(p['bids'][0]['price']) + float(p['asks'][0]['price'])) / 2.0
        quotes[p['instrument']] = mid
        print(f"{p['instrument']}: {mid}")

eur = quotes.get('EUR_USD', 1.1598)
jpy = quotes.get('USD_JPY', 154.20)
gbp = quotes.get('GBP_USD', 1.3520)
cad = quotes.get('USD_CAD', 1.3850)
chf = quotes.get('USD_CHF', 0.8040)
sek = quotes.get('USD_SEK', 10.450)

# Fórmula oficial ICE Dollar Index
# DXY = 50.14348112 * (EURUSD)^(-0.576) * (USDJPY)^(0.136) * (GBPUSD)^(-0.119) * (USDCAD)^(0.091) * (USDSEK)^(0.042) * (USDCHF)^(0.036)
dxy_full = 50.14348112 * (eur ** -0.576) * (jpy ** 0.136) * (gbp ** -0.119) * (cad ** 0.091) * (sek ** 0.042) * (chf ** 0.036)

print("\n--- Resultados ---")
print(f"DXY Oficial Completo con SEK: {dxy_full:.3f}")
