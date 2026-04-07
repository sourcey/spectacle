# Modes

:::tabs

::tab{title="Stream"}

## Stream Mode

:::code-group

```json title="File source"
{
  "media": {
    "mode": "stream",
    "source": "/path/to/video.mp4"
  }
}
```

```json title="Camera source"
{
  "media": {
    "mode": "stream",
    "source": "/dev/video0"
  }
}
```

:::

::

::tab{title="Record"}

## Record Mode

The browser sends H.264 video to the server.

::

::tab{title="Relay"}

## Relay Mode

The first active browser caller becomes the live source.

::

:::
