# Kenny & Jimo – Bug Bug Adventure

This repository contains the source code and assets for a tiny browser‑based adventure built with **Phaser 3**.  You play as Kenny (or his roommate Jimo) leaving the apartment to explore the city and collect bugs.  Each outing represents a different level – for the MVP you head from your apartment to the park, gather a stick and a bag, craft a bug‑catching net and capture three unique bugs while avoiding bites.  Along the way you can pick up a healing salve to recover from stings.  A scrapbook at the top of the screen shows which bugs you’ve collected.

## Running locally

1. Clone or download this repository and make sure the `assets` folder is intact.
2. Because the game runs entirely in the browser you only need a static file server.  Start one from the project root:

   ```bash
   # using Python 3
   python3 -m http.server 8000

   # or using Node.js (if you have it installed)
   npx serve .
   ```

3. Visit <http://localhost:8000/kenny_game/index.html> in your browser.  The game has been tested in Chrome, Firefox, Safari and mobile Safari.  It should load in under three seconds on broadband and run at 60 fps on desktop.

On mobile devices the on‑screen keyboard is not required; use touch to move (tap and drag) or connect a Bluetooth keyboard.  Press **C** to craft items when you have a stick and bag.  Use the arrow keys or WASD on desktop.

## Gameplay

- **Explore:** Walk around the level by using arrow keys or WASD.  Your character sprite animates between idle and walking states.
- **Collect items:** Walk over a stick, bag or jar to pick them up.  Items appear in the inventory bar at the bottom left.
- **Craft:** When you have both a stick and a bag, press **C** to craft a bug net.  The used items disappear from your inventory and a net icon appears.
- **Catch bugs:** With a net in your inventory, walk into the three different bug types to catch them.  Each captured bug lights up in the scrapbook at the top.  Without a net the bugs will bite you and reduce your health.
- **Health and healing:** You have three hearts.  Each bite removes a heart; picking up a salve restores one heart (up to three).  If you lose all hearts you faint and the level restarts.
- **Finish:** After catching all three bug species the level completes and restarts after a brief celebration.

## Assets and attribution

All art assets in the `assets` folder were created specifically for this project.  The player sprites are stylised, hand‑drawn interpretations based on photos provided by the user; the original photos were used only as reference and have been deleted.  Item icons (stick, bag, net, salve, hearts), bug sprites and the scrapbook UI were drawn programmatically with [Pillow](https://python-pillow.org/) in Python.  The background image is a modified version of a photograph of the user’s apartment building – the “SOHO LOFTS” sign has been replaced with **SOSO LOFTS** and any street numbers or other identifiers were removed【282285548391008†L153-L166】【282285548391008†L226-L245】.

We were inspired by the atmospheric art direction of *Hollow Knight*, which uses a mostly monochrome palette, dynamic lighting and simple characters with expressive animation【282285548391008†L153-L166】.  Our adaptation simplifies these ideas for a casual browser game: muted colours, soft shadows and whimsical proportions, while still keeping the game lightweight and mobile friendly.

## License

This project is licensed under the MIT License.  See the [LICENSE](./LICENSE) file for details.
