# Seven

A small dark-fantasy Three.js game. You're alone in a candlelit crypt. Every
so often a thought tries to possess you — one of the seven deadly sins. Give
in and your body withers (thinner limbs, hunched spine, hollow red eyes) as
the corruption meter fills. Fill it and you're gone.

Resisting means doing an activity, each with its own animation and mini-game:
reading (type the passage), running (alternate arrow keys), push-ups (time the
space bar), podcast (remember what you heard). Fail the mini-game and the sin
corrupts you anyway.

## Run it

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Three.js, OrbitControls and the post-processing add-ons (bloom, ambient occlusion) are vendored under `vendor/` so the game has no
build step and no external CDN dependency at runtime.
