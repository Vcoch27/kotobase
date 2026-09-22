# Study theme previews

Screenshots from the running KotoBase application using its existing public vocabulary. No sample data is inserted into the database.

- `flashcard-desktop.png`: 1440 × 1000, front face, light theme.
- `flashcard-back-desktop.png`: 1440 × 1000, back face, light theme.
- `flashcard-mobile.png`: 390 × 844, scrolled to the learning card.
- `quiz-desktop.png`: 1440 × 1000, front/question artwork, light theme.
- `quiz-dark.png`: 1440 × 1000, no landscape or card artwork in dark mode.
- `quiz-mobile.png`: 390 × 844, revealed correct answer with back artwork.

Verified quiz answer submission switches artwork to `study-card-artwork--back` before advancing. Dark-mode computed styles confirm dashboard/card `background-image: none` and artwork `display: none`. Mobile widths 320px and 390px have no document overflow.

Runtime artwork is stored separately in `public/images/study`; screenshots are documentation only and are not loaded by the application.
