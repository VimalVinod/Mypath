with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the double '}'
for i in range(len(lines)):
    if "Failed to trigger email alert:" in lines[i]:
        # The next few lines should be '      }\n    }\n    }\n'
        if lines[i+1].strip() == '}' and lines[i+2].strip() == '}' and lines[i+3].strip() == '}':
            print("Found the triple '}', removing one!")
            lines.pop(i+3)
            break

with open('backend-cronjob/src/scripts/sync-to-firebase.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
