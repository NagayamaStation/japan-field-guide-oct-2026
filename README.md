# Japan Field Guide · October 2026

A mobile road book with regional chapters, hotel dates, Maps links, history and deadpan fictional field reports.

## Reading the guide

Open the GitHub Pages site linked from this repository. Use **Night** or **Day** in the header to switch appearance; the guide starts with your device's setting and remembers a manual choice. Add the site to your phone's home screen and wait for **Saved on this device** for offline reading. External maps and source websites need a connection or their own downloaded maps.

## Hosting

This repository contains the complete static website. GitHub Pages serves the root of `main`; `.nojekyll` skips Jekyll processing. All asset URLs and the service worker use relative paths, so the guide also works under a project URL.

After editing a cached asset, change the `VERSION` value in `sw.js` so existing readers receive the update. No build tools or external dependencies are needed to serve the site.
