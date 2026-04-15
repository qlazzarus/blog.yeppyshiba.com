#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="my-blog"
OUTPUT_NAME="${PROJECT_NAME}-full-source-$(date +%Y%m%d-%H%M%S).zip"

zip -r "$OUTPUT_NAME" . \
  -x "node_modules/*" \
  -x "public/*" \
  -x ".git/*" \
  -x ".astro/*" \
  -x "dist/*" \
  -x "build/*" \
  -x "coverage/*" \
  -x ".env" \
  -x ".env.*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x ".idea/*" \
  -x ".vscode/*" \
  -x "tmp/*" \
  -x "temp/*"

echo "압축 완료: $OUTPUT_NAME"