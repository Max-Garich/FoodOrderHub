import { useState, useEffect } from 'react';

// Картинка, которая открывается на весь экран по клику (чтобы разглядеть фото).
// Фото показывается полностью: пропорции сохраняются, размер не превышает экран.
export default function LightboxImg({ src, alt = '', className, style, loading }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  // Открытие/закрытие: блокируем скролл страницы и закрываем по Escape
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
