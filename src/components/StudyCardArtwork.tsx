/** Decorative artwork shared by flashcard faces and quiz question/answer states. */
interface StudyCardArtworkProps {
  side: "front" | "back";
  customFrontUrl?: string | null;
  customBackUrl?: string | null;
}

export function StudyCardArtwork({ side, customFrontUrl, customBackUrl }: StudyCardArtworkProps) {
  // Keep both images mounted so the answer artwork loads before it is revealed.
  
  const customUrl = side === "front" ? customFrontUrl : customBackUrl;
  
  if (customUrl) {
    return (
      <span aria-hidden="true" className={`study-card-artwork study-card-artwork--${side}`}>
        <span 
          className="study-card-artwork-layer--custom" 
          style={{ backgroundImage: `url(${customUrl})` }} 
        />
        <span className="absolute inset-0 bg-white/30 dark:bg-slate-900/60 pointer-events-none" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`study-card-artwork study-card-artwork--${side}`}>
      <span className="study-card-artwork-layer study-card-artwork-layer--front" />
      <span className="study-card-artwork-layer study-card-artwork-layer--back" />
    </span>
  );
}
