#!/usr/bin/env bash
set -euo pipefail

version="${1:?usage: render-package-managers.sh <version> [dist-dir] [out-dir]}"
dist_dir="${2:-go/sourcey-godoc/dist}"
out_dir="${3:-.stage/sourcey-godoc-package-managers}"
checksums="$dist_dir/checksums.txt"
release_tag="go/sourcey-godoc/v${version}"
release_base="https://github.com/sourcey/sourcey/releases/download/${release_tag}"

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "expected semantic version like 0.2.1, got: $version" >&2
  exit 2
fi

if [[ ! -f "$checksums" ]]; then
  echo "missing checksums file: $checksums" >&2
  exit 2
fi

checksum() {
  local file="$1"
  local value
  value="$(awk -v file="$file" '$2 == file { print $1 }' "$checksums")"
  if [[ -z "$value" ]]; then
    echo "missing checksum for $file in $checksums" >&2
    exit 2
  fi
  printf '%s\n' "$value"
}

asset() {
  local os="$1"
  local arch="$2"
  local ext="$3"
  printf 'sourcey-godoc_%s_%s_%s.%s' "$version" "$os" "$arch" "$ext"
}

mkdir -p "$out_dir/homebrew/Formula" "$out_dir/scoop"

darwin_arm64="$(asset darwin arm64 tar.gz)"
darwin_amd64="$(asset darwin amd64 tar.gz)"
linux_arm64="$(asset linux arm64 tar.gz)"
linux_amd64="$(asset linux amd64 tar.gz)"
windows_amd64="$(asset windows amd64 zip)"
windows_arm64="$(asset windows arm64 zip)"

cat > "$out_dir/homebrew/Formula/sourcey-godoc.rb" <<EOF
class SourceyGodoc < Formula
  desc "Native Go documentation generator for Sourcey"
  homepage "https://sourcey.com"
  version "$version"
  license "AGPL-3.0-only"

  on_macos do
    if Hardware::CPU.arm?
      url "$release_base/$darwin_arm64"
      sha256 "$(checksum "$darwin_arm64")"
    else
      url "$release_base/$darwin_amd64"
      sha256 "$(checksum "$darwin_amd64")"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "$release_base/$linux_arm64"
      sha256 "$(checksum "$linux_arm64")"
    else
      url "$release_base/$linux_amd64"
      sha256 "$(checksum "$linux_amd64")"
    end
  end

  def install
    bin.install "sourcey-godoc"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/sourcey-godoc --version")
  end
end
EOF

cat > "$out_dir/scoop/sourcey-godoc.json" <<EOF
{
  "version": "$version",
  "description": "Native Go documentation generator for Sourcey.",
  "homepage": "https://sourcey.com",
  "license": "AGPL-3.0-only",
  "architecture": {
    "64bit": {
      "url": "$release_base/$windows_amd64",
      "hash": "$(checksum "$windows_amd64")",
      "extract_dir": "sourcey-godoc_${version}_windows_amd64"
    },
    "arm64": {
      "url": "$release_base/$windows_arm64",
      "hash": "$(checksum "$windows_arm64")",
      "extract_dir": "sourcey-godoc_${version}_windows_arm64"
    }
  },
  "bin": "sourcey-godoc.exe",
  "checkver": {
    "github": "https://github.com/sourcey/sourcey",
    "regex": "go/sourcey-godoc/v([\\\\d.]+)"
  },
  "autoupdate": {
    "architecture": {
      "64bit": {
        "url": "https://github.com/sourcey/sourcey/releases/download/go/sourcey-godoc/v\$version/sourcey-godoc_\$version_windows_amd64.zip",
        "extract_dir": "sourcey-godoc_\$version_windows_amd64"
      },
      "arm64": {
        "url": "https://github.com/sourcey/sourcey/releases/download/go/sourcey-godoc/v\$version/sourcey-godoc_\$version_windows_arm64.zip",
        "extract_dir": "sourcey-godoc_\$version_windows_arm64"
      }
    },
    "hash": {
      "url": "\$baseurl/checksums.txt"
    }
  }
}
EOF

echo "Rendered Homebrew formula and Scoop manifest in $out_dir"
