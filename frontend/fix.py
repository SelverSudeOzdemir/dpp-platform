import os

filepath = 'd:/Kocaer/dpp-platform/frontend/src/lib/api.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaped strings
content = content.replace("\\'string\\'", "'string'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
