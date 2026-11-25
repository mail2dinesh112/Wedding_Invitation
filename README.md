# Dineshkumar & Suthesi Wedding Invitation

A static, interactive wedding invitation built with HTML, CSS, and JavaScript. No build step or package installation is required.

## Open the invitation

Open `index.html` in a modern web browser. The page uses local image assets; an internet connection helps load the web fonts.

## Screen flow

1. Tap the lamp to begin.
2. On the invitation card, swipe up or select the double-arrow to open the temple screen.
3. On the temple screen, swipe up or select the double-arrow to view the countdown.
4. On the countdown screen, swipe up or select the double-arrow to view the closing invitation.

On every screen, swiping up, scrolling down, or selecting the double-arrow all advance.

The invitation card stays on screen until the visitor chooses to continue.

## Interactions

- The countdown ticks live toward the wedding time (`weddingTime` in `js/main.js`).
- Select the flower button on the closing screen to trigger a petal shower.
- Use the closing screen's back button to return to the countdown.

## Project files

- `index.html` — screen markup and invitation content.
- `css/styles.css` — layout, visual styling, and animations.
- `js/main.js` — screen transitions, one shared swipe handler, countdown, and effects.
- `assets/` — images used by the invitation.
