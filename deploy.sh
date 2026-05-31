#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Step 1: Fix git setup ==="
# Remove stale lock if exists
rm -f .git/index.lock 2>/dev/null || true

# Fix .gitignore
printf "node_modules\ndist\n.env\n.DS_Store\n" > .gitignore

# Init git if needed, set identity
git init
git config user.email "claudenigga123@gmail.com"
git config user.name "Isaac Cheok"

echo "=== Step 2: Stage and commit ==="
git add .
git status
git diff --staged --stat

# Commit (allow empty in case already committed)
git commit -m "Initial build: MonopolyTracker web app" || echo "Nothing new to commit — continuing"

echo "=== Step 3: Set remote ==="
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/sappyscooper/monopoly-tracker-web.git
git remote -v

echo "=== Step 4: Rename branch to main ==="
git branch -M main

echo "=== Step 5: Push to GitHub ==="
echo ""
echo ">>> You will be prompted for GitHub credentials."
echo ">>> Username: sappyscooper"
echo ">>> Password: paste your Personal Access Token (not your GitHub password)"
echo ""
git push -u origin main

echo ""
echo "=== Step 6: Verify build ==="
npm run build

echo ""
echo "=== Step 7: Install Vercel CLI & deploy ==="
npm install -g vercel

echo ""
echo ">>> Vercel CLI will now ask a few questions."
echo ">>> Answers:"
echo ">>>   Set up and deploy? → Y"
echo ">>>   Which scope? → sappyscoopers-projects"
echo ">>>   Link to existing project? → N"
echo ">>>   Project name? → monopoly-tracker-web"
echo ">>>   Directory? → ./ (press Enter)"
echo ">>>   Modify settings? → N"
echo ""
vercel --prod

echo ""
echo "=== Done! ==="
echo "Open the URL printed above to verify your deployment."
