import os
import re

root = r'c:\Users\indatech\Desktop\Proyectos\Fintech\AEON'

import_pattern = re.compile(r'''(?:import|from)\s+['"]([^'"]+)['"]''')

errors = []

for dirpath, _, filenames in os.walk(os.path.join(root, 'src')):
    for f in filenames:
        if f.endswith('.js'):
            filepath = os.path.join(dirpath, f)
            with open(filepath, encoding='utf-8') as js_file:
                content = js_file.read()
                for match in import_pattern.finditer(content):
                    imp = match.group(1)
                    if imp.startswith('.'):
                        # Relative import
                        target = os.path.normpath(os.path.join(dirpath, imp))
                        # Check if file or file with .js / .json exists
                        candidates = [target, target + '.js', target + '.json']
                        found = None
                        for c in candidates:
                            if os.path.exists(c):
                                found = c
                                break
                        if not found:
                            errors.append(f"MISSING: {filepath} imports '{imp}' -> cannot find on disk")
                        else:
                            # Verify exact case of each path segment
                            parts = os.path.relpath(found, root).split(os.sep)
                            curr = root
                            for part in parts:
                                actual_entries = os.listdir(curr)
                                if part not in actual_entries:
                                    # Case mismatch!
                                    for entry in actual_entries:
                                        if entry.lower() == part.lower():
                                            errors.append(f"CASE MISMATCH in {f}: imported '{imp}' expects '{part}' but disk has '{entry}'")
                                curr = os.path.join(curr, part)

print(f"Total import checks completed. Found {len(errors)} issues:")
for err in errors:
    print("  ❌", err)
