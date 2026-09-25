/** Decorative artwork shared by flashcard faces and quiz question/answer states. */
interface StudyCardArtworkProps {
  side: "front" | "back";
  customFrontUrl?: string | null;
  customBackUrl?: string | null;
  cardWash?: number; // % tán trắng thẻ (30 - 95, mặc định 65)
}

export function StudyCardArtwork({ 
  side, 
  customFrontUrl, 
  customBackUrl,
  cardWash = 65 
}: StudyCardArtworkProps) {
  const customUrl = side === "front" ? customFrontUrl : customBackUrl;
  
  if (customUrl) {
    return (
      <span aria-hidden="true" className={`study-card-artwork study-card-artwork--${side} study-card-artwork--custom`}>
        <span 
          className="study-card-artwork-layer--custom" 
          style={{ backgroundImage: `url(${customUrl})` }} 
        />
        {/* Lớp phủ tán trắng trên thẻ học: giữ tương phản cao để chữ Hán, Furigana và mẹo nhớ siêu sắc nét */}
        <span 
          className="absolute inset-0 bg-white dark:bg-slate-950 pointer-events-none transition-opacity duration-200" 
          style={{ opacity: (cardWash ?? 65) / 100 }}
        />
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
