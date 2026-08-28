import urllib.request
import json

repos = ['AEON', 'AEONv2', 'AEON_BOT']
for repo in repos:
    url = f'https://api.github.com/repos/moisesrojasp89-Dev/{repo}/commits/main'
    req = urllib.request.Request(url, headers={'User-Agent': 'Python-Urllib'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            sha = data.get('sha')
            date = data['commit']['committer']['date']
            msg = data['commit']['message'].splitlines()[0]
            print(f"Repo: moisesrojasp89-Dev/{repo:<10} | Latest: {sha[:7]} ({date}) | Msg: {msg}")
    except Exception as e:
        print(f"Repo: moisesrojasp89-Dev/{repo:<10} | Error: {e}")
