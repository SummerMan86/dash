#!/bin/bash
set -euo pipefail

REGISTRY="${1:-ghcr.io/OWNER/dashboard-builder}"
TAG="${2:-latest}"

PLATFORM="${3:-linux/amd64}"

echo "Building $REGISTRY:$TAG (platform: $PLATFORM) ..."
docker buildx build --platform "$PLATFORM" -t "$REGISTRY:$TAG" --push .
echo "Pushed $REGISTRY:$TAG"
