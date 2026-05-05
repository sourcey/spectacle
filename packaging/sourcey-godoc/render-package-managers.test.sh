#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

dist="$tmp/dist"
out="$tmp/out"
mkdir -p "$dist"

cat > "$dist/checksums.txt" <<'EOF'
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  sourcey-godoc_0.2.1_darwin_arm64.tar.gz
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  sourcey-godoc_0.2.1_darwin_amd64.tar.gz
cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc  sourcey-godoc_0.2.1_linux_arm64.tar.gz
dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd  sourcey-godoc_0.2.1_linux_amd64.tar.gz
eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee  sourcey-godoc_0.2.1_windows_amd64.zip
ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff  sourcey-godoc_0.2.1_windows_arm64.zip
EOF

"$root/packaging/sourcey-godoc/render-package-managers.sh" 0.2.1 "$dist" "$out" >/dev/null

formula="$out/homebrew/Formula/sourcey-godoc.rb"
scoop="$out/scoop/sourcey-godoc.json"

test -f "$formula"
test -f "$scoop"

grep -Fq 'version "0.2.1"' "$formula"
grep -Fq 'go/sourcey-godoc/v0.2.1/sourcey-godoc_0.2.1_darwin_arm64.tar.gz' "$formula"
grep -Fq 'sha256 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"' "$formula"
grep -Fq 'go/sourcey-godoc/v0.2.1/sourcey-godoc_0.2.1_linux_amd64.tar.gz' "$formula"
grep -Fq 'sha256 "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"' "$formula"

node -e '
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (manifest.version !== "0.2.1") throw new Error("wrong version");
if (!manifest.architecture["64bit"].url.endsWith("sourcey-godoc_0.2.1_windows_amd64.zip")) throw new Error("wrong amd64 url");
if (manifest.architecture["64bit"].hash !== "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") throw new Error("wrong amd64 hash");
if (!manifest.architecture.arm64.url.endsWith("sourcey-godoc_0.2.1_windows_arm64.zip")) throw new Error("wrong arm64 url");
if (manifest.architecture.arm64.hash !== "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") throw new Error("wrong arm64 hash");
' "$scoop"

echo "sourcey-godoc package-manager render check passed"
