#!/usr/bin/env bash
# Build the pacman package from the current git checkout (no tag needed).
# Usage (on Arch/CachyOS):  packaging/arch/build-local.sh [makepkg args, e.g. -si]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
pkgver="$(sed -n 's/^pkgver=//p' "$here/PKGBUILD")"
pkgname="$(sed -n 's/^pkgname=//p' "$here/PKGBUILD")"
repo="$(sed -n 's/^_repo=//p' "$here/PKGBUILD")"
# Named *-src.tar.gz on purpose: source archives must not look like
# installable binary packages (which are *.pkg.tar.zst).
src_archive="$here/${pkgname}-${pkgver}-src.tar.gz"
if [ -d "$root/.git" ]; then
  git -C "$root" archive --format=tar.gz \
    --prefix="${repo}-${pkgver}/" \
    -o "$src_archive" HEAD
else
  # Fallback for plain source copies without a .git directory.
  echo "No .git directory found; falling back to tar."
  tar -czf "$src_archive" \
    --transform "s|^\.|${repo}-${pkgver}|" \
    --exclude='./node_modules' --exclude='./dist' \
    --exclude='./target' --exclude='./src-tauri/target' \
    -C "$root" .
fi
cd "$here"
makepkg -f "$@"
ls -lh "$here"/*.pkg.tar.zst
