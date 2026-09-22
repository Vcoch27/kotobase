# Study artwork

User-supplied artwork, converted to WebP (quality 88) without resizing or changing the illustrations.

| File | Original size | Use |
| --- | --- | --- |
| `sakura-landscape.webp` | 1672 × 941 | Dashboard landscape (reference image 2) |
| `flashcard-frog.webp` | 1448 × 1086 | Front: flashcard prompt/listening and quiz question (image 4) |
| `quiz-frog.webp` | 1448 × 1086 | Back: flashcard answer and revealed correct quiz answer (image 5) |

The historical filenames are retained; they identify the two faces, not separate study modes. `StudyCardArtwork` shares these faces between Flashcard and Quiz. Quiz switches to the back when the correct answer is revealed.

The images retain their alpha channel and outer frame. An absolutely positioned artwork container clips the frame, using `max(110cqw, 188cqh) auto` to cover the card without stretching the original 4:3 image. Card height remains content-driven in Quiz. Artwork opacity is 40%, independently of the text. Dark mode hides card artwork and removes the dashboard background image entirely. Styling lives in `src/app/globals.css`.

Total runtime artwork: approximately 269 KB. Visual previews are in `docs/previews/study-theme`.
