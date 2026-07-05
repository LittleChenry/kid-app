#!/bin/bash
for port in 3000 4000 4001; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null
    echo "✓ 端口 $port (PID $pid) 已停止"
  else
    echo "  端口 $port 未运行"
  fi
done
