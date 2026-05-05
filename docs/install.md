---
title: Install
description: Install Sourcey through npm, Docker, or Nix, and install the standalone Go docs generator through Go, Homebrew, or Scoop.
---

# Install

## npm

```bash
npm install -g sourcey
npx sourcey init
```

## Docker

```bash
docker run -v $(pwd):/docs sourcey/sourcey build
```

## Nix

```bash
nix run github:sourcey/sourcey
```

## Go docs generator

```bash
go install github.com/sourcey/sourcey/go/sourcey-godoc/cmd/sourcey-godoc@latest
```

## Homebrew

```bash
brew tap sourcey/tap
brew install sourcey-godoc
```

## Scoop

```powershell
scoop bucket add sourcey https://github.com/sourcey/scoop-bucket
scoop install sourcey-godoc
```

## Local development

```bash
git clone https://github.com/sourcey/sourcey.git
cd sourcey
npm install
npm run build && npm test
```
