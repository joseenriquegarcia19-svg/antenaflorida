#!/usr/bin/env bash
# Arranca el dev server desde una copia en /tmp para evitar ETIMEDOUT en carpetas sincronizadas (iCloud/Documents).
# Uso: desde la raíz del repo: ./radio-wave/dev-from-tmp.sh
#      o desde radio-wave: ./dev-from-tmp.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COPY_DIR="/tmp/antena-radio-wave-$$"

echo "Copiando proyecto a $COPY_DIR (evita timeouts en iCloud/Documents)..."
mkdir -p "$COPY_DIR"
cp -R "$SCRIPT_DIR/src" "$SCRIPT_DIR/index.html" "$SCRIPT_DIR/package.json" "$SCRIPT_DIR/vite.config.ts" "$SCRIPT_DIR/tailwind.config.js" "$SCRIPT_DIR/postcss.config.js" "$SCRIPT_DIR/tsconfig.json" "$SCRIPT_DIR/tsconfig.node.json" "$COPY_DIR/" 2>/dev/null || true
[ -d "$SCRIPT_DIR/public" ] && cp -R "$SCRIPT_DIR/public" "$COPY_DIR/" || true

echo "Instalando dependencias en $COPY_DIR..."
cd "$COPY_DIR"
npm install --silent

echo "Arrancando servidor (Tailwind en modo rápido)..."
TAILWIND_FAST=1 npm run dev
