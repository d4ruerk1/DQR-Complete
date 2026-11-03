#!/usr/bin/env bash
#
# Build script for DRQ Complete AppImage (Linux x86_64).
# Produces a self-contained Type-2 AppImage compatible with modern Linux (including CachyOS/Arch glibc 2.38+).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION=$(node -p "require('./package.json').version")
OUTPUT_NAME="DRQ-Complete-${VERSION}-x86_64.AppImage"
BUILD_DIR="$(mktemp -d -t drq-appimage-build-XXXXXX)"
APPDIR="${BUILD_DIR}/AppDir"

cleanup() {
    rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "==> [1/5] Building game runner (src-linux)..."
cargo build --release --manifest-path src-linux/Cargo.toml
mkdir -p src-tauri/resources
cp src-linux/target/release/src-linux src-tauri/resources/src-linux

echo "==> [2/5] Building frontend assets..."
if [ -f "./node_modules/.bin/vite" ]; then
    ./node_modules/.bin/vue-tsc --noEmit 2>/dev/null || true
    ./node_modules/.bin/vite build
elif command -v pnpm >/dev/null 2>&1; then
    pnpm build
elif command -v npm >/dev/null 2>&1; then
    npm run build
fi

echo "==> [3/5] Building Tauri release binary (with custom-protocol)..."
cargo build --release --manifest-path src-tauri/Cargo.toml

echo "==> [4/5] Preparing AppDir structure..."
mkdir -p "${APPDIR}/usr/bin/resources" \
         "${APPDIR}/usr/lib/drq-complete/resources" \
         "${APPDIR}/usr/share/applications" \
         "${APPDIR}/usr/share/licenses/drq-complete" \
         "${APPDIR}/usr/share/icons/hicolor/32x32/apps" \
         "${APPDIR}/usr/share/icons/hicolor/128x128/apps" \
         "${APPDIR}/usr/share/icons/hicolor/256x256/apps"

cp src-tauri/target/release/drq-complete "${APPDIR}/usr/bin/drq-complete"
if command -v strip >/dev/null 2>&1; then
    strip --strip-unneeded "${APPDIR}/usr/bin/drq-complete" 2>/dev/null || true
fi

cp src-tauri/resources/src-linux "${APPDIR}/usr/bin/src-linux"
cp src-tauri/resources/src-linux "${APPDIR}/usr/bin/resources/src-linux"
cp src-tauri/resources/src-linux "${APPDIR}/usr/lib/drq-complete/src-linux"
cp src-tauri/resources/catalog.json "${APPDIR}/usr/bin/resources/catalog.json"
cp src-tauri/resources/catalog.json "${APPDIR}/usr/lib/drq-complete/resources/catalog.json"

cp packaging/linux/drq-complete.desktop "${APPDIR}/drq-complete.desktop"
cp packaging/linux/drq-complete.desktop "${APPDIR}/usr/share/applications/drq-complete.desktop"

cp src-tauri/icons/icon.png "${APPDIR}/drq-complete.png"
ln -sf drq-complete.png "${APPDIR}/.DirIcon"
cp src-tauri/icons/32x32.png "${APPDIR}/usr/share/icons/hicolor/32x32/apps/drq-complete.png"
cp src-tauri/icons/128x128.png "${APPDIR}/usr/share/icons/hicolor/128x128/apps/drq-complete.png"
cp src-tauri/icons/icon.png "${APPDIR}/usr/share/icons/hicolor/256x256/apps/drq-complete.png"

[ -f LICENSE ] && cp LICENSE "${APPDIR}/usr/share/licenses/drq-complete/LICENSE"
[ -f NOTICE ] && cp NOTICE "${APPDIR}/usr/share/licenses/drq-complete/NOTICE"

# AppRun: Native POSIX launcher script (avoids binary hook & glibc loader clashes)
cat << 'EOF' > "${APPDIR}/AppRun"
#!/bin/sh
set -e

# Resolve the absolute directory path of this AppDir
HERE="$(dirname "$(readlink -f "$0")")"
export APPDIR="${HERE}"

# Set APPIMAGE environment variable if not already set by runtime
if [ -z "$APPIMAGE" ]; then
    export APPIMAGE="$(readlink -f "$0")"
fi

# Add AppDir binary directory to PATH
export PATH="${APPDIR}/usr/bin:${PATH}"

# Add AppDir XDG data directories (so desktop files, icons, and themes are found)
if [ -n "$XDG_DATA_DIRS" ]; then
    export XDG_DATA_DIRS="${APPDIR}/usr/share:${XDG_DATA_DIRS}"
else
    export XDG_DATA_DIRS="${APPDIR}/usr/share:/usr/local/share:/usr/share"
fi

# Ensure drq-complete locates its bundled game runner helper
export DRQ_RUNNER_PATH="${APPDIR}/usr/bin/src-linux"

# Pass all incoming command line arguments directly to the application
exec "${APPDIR}/usr/bin/drq-complete" "$@"
EOF

chmod +x "${APPDIR}/AppRun" \
         "${APPDIR}/usr/bin/drq-complete" \
         "${APPDIR}/usr/bin/src-linux" \
         "${APPDIR}/usr/lib/drq-complete/src-linux"

# Locate AppImage Type-2 runtime
RUNTIME=""
if [ -f "packaging/linux/runtime-x86_64" ]; then
    RUNTIME="packaging/linux/runtime-x86_64"
elif [ -f "${HOME}/.cache/tauri/runtime-x86_64" ]; then
    RUNTIME="${HOME}/.cache/tauri/runtime-x86_64"
else
    echo "Downloading official Type-2 runtime..."
    mkdir -p packaging/linux
    curl -fsSL -o packaging/linux/runtime-x86_64 \
        https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-x86_64
    chmod +x packaging/linux/runtime-x86_64
    RUNTIME="packaging/linux/runtime-x86_64"
fi

echo "==> [5/5] Packaging AppImage (${OUTPUT_NAME})..."
mksquashfs "${APPDIR}" "${BUILD_DIR}/root.squashfs" -root-owned -noappend -comp zstd -quiet
cat "$RUNTIME" "${BUILD_DIR}/root.squashfs" > "${OUTPUT_NAME}"
chmod +x "${OUTPUT_NAME}"

echo ""
echo "Successfully created: ${ROOT_DIR}/${OUTPUT_NAME}"
