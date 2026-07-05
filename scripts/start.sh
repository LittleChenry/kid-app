#!/bin/bash
set -e
export PATH="$HOME/.local/node/bin:$PATH"
BASE="/home/chenry/workspace/kid-app"

echo "=== 启动媒体服务器 ==="
cd "$BASE/packages/media-server"
setsid npx tsx src/index.ts > /tmp/media-server.log 2>&1 &
disown
for i in $(seq 1 30); do
  if curl -s http://localhost:4001/media/live >/dev/null 2>&1; then
    echo "✓ 媒体服务器就绪 (4001)"
    break
  fi
  if [ "$i" -eq 30 ]; then echo "✗ 媒体服务器启动超时"; fi
  sleep 1
done

echo "=== 编译API服务器 ==="
cd "$BASE/packages/api-server"
npx prisma db push --skip-generate 2>/dev/null
npx tsc
setsid node dist/main.js > /tmp/api-server.log 2>&1 &
disown
for i in $(seq 1 15); do
  if curl -s http://localhost:4000/api/video/live >/dev/null 2>&1; then
    echo "✓ API服务器就绪 (4000)"
    break
  fi
  if [ "$i" -eq 15 ]; then echo "✗ API服务器启动超时"; fi
  sleep 1
done

echo "=== 启动前端 ==="
cd "$BASE/packages/frontend"
setsid npx vite --host 0.0.0.0 --port 3000 > /tmp/frontend.log 2>&1 &
disown
sleep 3
echo "✓ 前端就绪 (3000)"

echo ""
bash "$BASE/scripts/status.sh"
