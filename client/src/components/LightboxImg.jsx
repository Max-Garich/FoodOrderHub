import { useState } from 'react';

// Картинка, которая открывается на весь экран по клику (чтобы разглядеть фото).
export default function LightboxImg({ src, alt = '', className, style, loading }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        onClick={(e) => {
          e.stopPropagation(); // не дёргать клики родительских кнопок/карточек
          setOpen(true);
        }}
      />
      {open && (
        <div className="lightbox-overlay" onClick={() => setOpen(false)}>
          <img
            className="lightbox-img"
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="lightbox-close"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
