#!/bin/bash

# GlyphLog Companion — Start Brave with Extension Loaded
# This script launches Brave with GlyphLog Companion pre-loaded

set -e

EXTENSION_PATH="/home/mariobox/Proyectos/GlyphLog/apps/extension/.output/chrome-mv3"
DEBUG_TOKEN="dt_test_4abad3afd45248f8acb3c2694cdfd22b"

# Check if extension exists
if [ ! -f "$EXTENSION_PATH/manifest.json" ]; then
    echo "❌ Extension not found at: $EXTENSION_PATH"
    echo "   Run: cd apps/extension && pnpm build"
    exit 1
fi

echo "🚀 Starting GlyphLog Companion..."
echo "   Extension: $EXTENSION_PATH"
echo ""

# Kill existing Brave processes
pkill -9 brave 2>/dev/null || true
sleep 1

# Launch Brave with extension loaded
brave \
    --remote-debugging-port=9333 \
    --no-first-run \
    --no-default-browser-check \
    --load-extension="$EXTENSION_PATH" \
    "about:blank" \
    > /tmp/brave-glyphlog.log 2>&1 &

BRAVE_PID=$!
echo "✅ Brave launched (PID: $BRAVE_PID)"
echo ""
echo "📋 Next steps:"
echo "   1. Open GlyphLog at: http://localhost:5173"
echo "   2. Go to /profile → Devices section"
echo "   3. Generate a pairing code"
echo "   4. Click extension icon (top right) → enter code"
echo "   5. Test: Go to Crunchyroll/MangaDex and watch an episode"
echo ""
echo "🔧 For E2E testing with debug token:"
echo "   - Open DevTools (F12) on any page"
echo "   - Run: localStorage.setItem('__glyphlog_debug_token', '$DEBUG_TOKEN')"
echo "   - Reload the extension popup"
echo ""
echo "📚 Logs: tail -f /tmp/brave-glyphlog.log"
echo ""
echo "Press Ctrl+C to stop monitoring"

# Keep script running to show it's active
wait $BRAVE_PID 2>/dev/null || true
