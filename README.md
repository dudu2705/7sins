# Seven

A small Three.js game. You're alone in your room. Every so often a thought
tries to possess you — one of the seven deadly sins. Give in, and a
corruption meter fills. Fill it, and a demon takes your soul. Resist by
reading, going for a run, doing push-ups, or listening to a podcast instead.

## Run it

Any static file server works, e.g.:

```bash
cd game
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Three.js and OrbitControls are vendored under `vendor/` so the game has no
build step and no external CDN dependency at runtime.
