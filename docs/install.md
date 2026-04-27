---
title: Install
description: Install Sourcey through npm, Homebrew, Docker, or Nix.
---

# Install

## npm

```bash
npx sourcey init
```

## Homebrew

```bash
brew tap sourcey/sourcey
brew install sourcey
```

## Docker

```bash
docker run -v $(pwd):/docs sourcey/sourcey build
```

## Nix

```bash
nix run github:sourcey/sourcey
```

## Local development

```bash
git clone https://github.com/sourcey/sourcey.git
cd sourcey
npm install
npm run build && npm test
```
