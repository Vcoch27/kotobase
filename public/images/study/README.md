# Study artwork

User-supplied artwork, converted to WebP (quality 88) without resizing or changing the illustrations.

| File | Original size | Use |
| --- | --- | --- |
| `sakura-landscape.webp` | 1672 × 941 | Dashboard landscape (reference image 2) |
| `flashcard-frog.webp` | 1448 × 1086 | Both flashcard faces, including listening mode (image 4) |
| `quiz-frog.webp` | 1448 × 1086 | Typing quiz question (image 5) |

The card files retain their original alpha channel and outer frame. CSS zooms into the inner artwork using `110% 141%` at `center 49%`; the component provides its own rounded border and shadow. Light overlays soften the artwork on narrow screens; a dark overlay preserves text contrast in dark mode. Styling is scoped to the dashboard and study cards in `src/app/globals.css`.

Total runtime artwork: approximately 269 KB. Visual previews are in `docs/previews/study-theme`.
