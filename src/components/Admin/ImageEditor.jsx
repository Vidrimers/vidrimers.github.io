import React, { useCallback } from 'react';
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

// Галерея стикеров для Image annotation
const stickerGallery = STICKER_EMOJIS.map((emoji) => {
  const url = emojiToDataUrl(emoji, 128);
  return { originalUrl: url, previewUrl: url };
});

/**
 * Обёртка над Filerobot Image Editor.
 * Принимает imageUrl (string) и колбэки onSave / onCancel.
 * onSave получает File — готовое отредактированное изображение.
 */
const ImageEditor = ({ imageUrl, onSave, onCancel }) => {
  const handleSave = useCallback(
    (editedImageObject) => {
      const { imageBase64, fullName, mimeType } = editedImageObject;

      // Конвертация base64 → File
      const byteString = atob(imageBase64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType || 'image/png' });
      const file = new File([blob], fullName || 'edited-image.png', {
        type: mimeType || 'image/png',
      });

      onSave(file);
    },
    [onSave]
  );

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <FilerobotImageEditor
        source={imageUrl}
        onSave={handleSave}
        onClose={onCancel}
        annotationsCommon={{
          fill: '#ffffff',
        }}
        Text={{
          text: 'Текст',
          fontFamily: 'Roboto, Arial',
          fontSize: 32,
          fonts: [
            { label: 'Roboto', value: 'Roboto' },
            { label: 'Arial', value: 'Arial' },
            'Tahoma',
            'Sans-serif',
          ],
        }}
        Image={{
          gallery: stickerGallery,
          disableUpload: false,
        }}
        Rotate={{ angle: 90, componentType: 'slider' }}
        Crop={{
          presetsItems: [
            {
              titleKey: 'classicTv',
              descriptionKey: '4:3',
              ratio: 4 / 3,
            },
            {
              titleKey: 'cinemascope',
              descriptionKey: '21:9',
              ratio: 21 / 9,
            },
            {
              titleKey: 'square',
              descriptionKey: '1:1',
              ratio: 1,
            },
          ],
        }}
        tabsIds={[TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.ANNOTATE, TABS.WATERMARK, TABS.RESIZE]}
        defaultTabId={TABS.FILTERS}
        avoidChangesNotSavedAlertOnLeave
        showBackButton
        defaultSavedImageName="hero-edited"
        defaultSavedImageType="png"
        language="ru"
        useBackendTranslations
      />
    </div>
  );
};

export default ImageEditor;
