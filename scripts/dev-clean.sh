#!/bin/bash

# Development cleanup script for Kortex
# This script helps clean up development processes and cache to avoid conflicts

echo "🧹 Cleaning up development environment..."

# Kill any existing Vite and Convex processes
echo "📱 Stopping development servers..."
pkill -f "vite" || true
pkill -f "convex" || true

# Clean up cache directories
echo "🗑️  Cleaning cache directories..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf dev-dist

# Clear browser cache (optional - uncomment if needed)
# echo "🌐 Clearing browser cache..."
# rm -rf ~/.cache/mozilla/firefox/*/storage/default/http*
# rm -rf ~/.config/google-chrome/Default/Cache

echo "✅ Cleanup complete!"
echo ""
echo "To start development servers:"
echo "  npm run dev"
echo ""
echo "Or start them separately:"
echo "  npm run dev:frontend  # Vite dev server"
echo "  npm run dev:backend   # Convex dev server"
