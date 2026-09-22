/** Decorative artwork shared by flashcard faces and quiz question/answer states. */
export function StudyCardArtwork({ side }: { side: "front" | "back" }) {
  return <span aria-hidden="true" className={`study-card-artwork study-card-artwork--${side}`} />;
}
