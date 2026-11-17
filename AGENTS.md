# Notes for anyone (or any AI) editing TeenWork

- Edit the source files in `assets/js/` and `assets/css/`. The page does not load them directly: it loads the built
  files in `assets/build/` and a few small scripts written into `index.html` (the script tags marked `data-tw-inline`).
- After any change to `assets/js`, `assets/css`, `index.html` or `tools/bundles.json`, run `node tools/build.cjs`
  and commit everything it changed. Never edit `assets/build/` or the inside of a `data-tw-inline` script by hand.
- A new script or style file goes in `tools/bundles.json`, in the place where it should run (order matters: later
  files wrap functions from earlier ones). The build stops with a plain message if something can't be joined.
- No regex lookbehind (`(?<=` or `(?<!`) and nothing newer than ES2020: older iPhones can't read it, and in a built
  file that would stop every script in the file.
- Checks: `node tests/build-same.cjs` (the built page behaves like the separate files) plus the other files in `tests/`
  (the README lists them). More in README.md, "Build step (v61)".
