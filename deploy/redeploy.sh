#!/bin/bash
set -euo pipefail

REGISTRY="s67918470/dashboard-builder"
TAG="latest"
VPS="root@155.212.137.153"
REMOTE_DIR="/opt/dashboard"

echo "=== [1/3] Building image ==="
docker build --network=host -t "$REGISTRY:$TAG" .

echo "=== [2/3] Transferring to VPS ==="
docker save "$REGISTRY:$TAG" | gzip | ssh "$VPS" \
  "cat > /tmp/dashboard.tar.gz && \
   gunzip -c /tmp/dashboard.tar.gz | docker load && \
   rm /tmp/dashboard.tar.gz"

echo "=== [3/3] Restarting container ==="
ssh "$VPS" "cd $REMOTE_DIR && \
  docker compose -f docker-compose.prod.yml up -d --force-recreate && \
  sleep 5 && \
  docker compose -f docker-compose.prod.yml ps"

echo ""
echo "Done! https://labinsight.ru"
