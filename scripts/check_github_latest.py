import urllib.request
import json

url = 'https://api.github.com/repos/moisesrojasp89-Dev/AEONv2/commits/main'
req = urllib.request.Request(url, headers={'User-Agent': 'Python-Urllib'})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        sha = data.get('sha')
        msg = data['commit']['message']
        date = data['commit']['committer']['date']
        print(f"Latest GitHub Commit: {sha[:7]} ({date})")
        print(f"Commit message: {msg.splitlines()[0]}")
except Exception as e:
    print("Error fetching GitHub commits:", e)
