#!/bin/bash
echo "=== 服务状态 ==="
for entry in "前端:3000" "API:4000" "媒体:4001"; do
  port="${entry##*:}"
  name="${entry%%:*}"
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "✓ $name (端口 $port, PID $pid) 运行中"
  else
    echo "✗ $name (端口 $port) 未运行"
  fi
done
