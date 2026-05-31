#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "=== MonopolyTracker Deploy ==="

# Remove any stale lock files (from sandbox)
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/master.lock .git/refs/heads/main.lock 2>/dev/null || true

# Fix .gitignore
printf "node_modules\ndist\n.env\n.DS_Store\n" > .gitignore

# Git identity
git config user.email "claudenigga123@gmail.com" 2>/dev/null || true
git config user.name "Isaac Cheok" 2>/dev/null || true

# Stage and commit
git add -A
git commit -m "Fix .gitignore and deploy prep" 2>/dev/null || echo "Nothing to commit"

# Rename branch master -> main
git branch -M main

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/sappyscooper/monopoly-tracker-web.git

echo ""
echo "=== Pushing to GitHub ==="
echo "Username: sappyscooper"
echo "Password: use your GitHub Personal Access Token (not your password)"
echo ""
git push -u origin main

echo ""
echo "=== Push successful! Building... ==="
npm run build

echo ""
echo "=== Deploying to Vercel ==="
if ! command -v vercel &> /dev/null; then
    npm install -g vercel
fi
vercel --prod

echo ""
echo "=== DONE — app is live! ==="
