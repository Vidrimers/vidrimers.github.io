import React, { useCallback, useState, useEffect } from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

// Генерация SVG data URL для стикера из emoji
const emojiToDataUrl = (emoji, size = 128) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.8}">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const STICKER_EMOJIS = [
  '⭐', '❤️', '🔥', '👍', '🎯', '💡', '🚀', '✅',
  '❌', '⚡', '🎨', '📌', '💎', '🏆', '🎵', '📸',
  '🌈', '💫', '✨', '🎉', '👑', '💪', '🧠', '💻',
];

const stickerGallery = STICKER_EMOJIS.map((emoji) => {
  const url = emojiToDataUrl(emoji, 128);
  return { originalUrl: url, previewUrl: url };
});

class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff', flexDirection: 'column', gap: 16 }}>
          <p>Ошибка загрузки редактора</p>
          <p style={{ fontSize: 12, color: '#999', maxWidth: 400, textAlign: 'center' }}>{this.state.error?.message}</p>
          <button onClick={this.props.onCancel} style={{ padding: '8px 24px', background: '#fc285b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Закрыть
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ImageEditor = ({ imageUrl, onSave, onCancel }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageElement, setImageElement] = useState(null);

  // Загрузка изображения
  useEffect(() => {
    if (!imageUrl) return;
    setImageSrc(null);
    setImageElement(null);
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const objUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objUrl);
          if (cancelled) return;
          // Передаём готовый HTMLImageElement
          setImageElement(img);
          setImageSrc(imageUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objUrl);
          if (!cancelled) onCancel();
        };
        img.src = objUrl;
      } catch {
        if (!cancelled) onCancel();
      }
    };
    load();
    return () => { cancelled = true; };
  }, [imageUrl, onCancel]);

  const handleSave = useCallback(
    (editedImageObject) => {
      const { imageBase64, fullName, mimeType } = editedImageObject;
      const byteString = atob(imageBase64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType || 'image/png' });
      const file = new File([blob], fullName || 'edited-image.png', { type: mimeType || 'image/png' });
      onSave(file);
    },
    [onSave]
  );

  if (!imageSrc || !imageElement) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <EditorErrorBoundary onCancel={onCancel}>
      <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
        <FilerobotImageEditor
          source={imageElement}
          onSave={handleSave}
          onClose={onCancel}
          annotationsCommon={{ fill: '#ffffff' }}
          Text={{ text: 'Текст', fontFamily: 'Roboto, Arial', fontSize: 32 }}
          Image={{ gallery: stickerGallery, disableUpload: false }}
          Rotate={{ angle: 90, componentType: 'slider' }}
          Crop={{
            presetsItems: [
              { titleKey: 'classicTv', descriptionKey: '4:3', ratio: 4 / 3 },
              { titleKey: 'cinemascope', descriptionKey: '21:9', ratio: 21 / 9 },
              { titleKey: 'square', descriptionKey: '1:1', ratio: 1 },
            ],
          }}
          tabsIds={[TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.ANNOTATE, TABS.WATERMARK, TABS.RESIZE]}
          defaultTabId={TABS.FILTERS}
          avoidChangesNotSavedAlertOnLeave
          showBackButton
          defaultSavedImageName="hero-edited"
          defaultSavedImageType="png"
        />
      </div>
    </EditorErrorBoundary>
  );
};

export default ImageEditor;
