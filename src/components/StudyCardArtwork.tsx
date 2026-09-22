/** Decorative artwork shared by flashcard faces and quiz question/answer states. */
export function StudyCardArtwork({ side }: { side: "front" | "back" }) {
  // Keep both images mounted so the answer artwork loads before it is revealed.
  return (
    <span aria-hidden="true" className={`study-card-artwork study-card-artwork--${side}`}>
      <span className="study-card-artwork-layer study-card-artwork-layer--front" />
      <span className="study-card-artwork-layer study-card-artwork-layer--back" />
    </span>
  );
}
