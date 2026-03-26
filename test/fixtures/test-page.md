---
title: "Getting Started"
description: "How to install and use LibSourcey"
---

LibSourcey is a C++20 networking toolkit.

## Installation

Install via CMake FetchContent:

```cmake
include(FetchContent)
FetchContent_Declare(libsourcey
  GIT_REPOSITORY https://github.com/nilstate/libsourcey.git
  GIT_TAG v2.1.0
)
FetchContent_MakeAvailable(libsourcey)
```

## Quick Start

Here's a simple HTTP server:

```cpp
http::Server srv{ "127.0.0.1", 1337 };
srv.Connection += [](http::ServerConnection::Ptr conn) {
    conn->send("Hello, world!");
    conn->close();
};
srv.start();
```

### Building

Run these commands:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel $(nproc)
```
