import React, { useCallback } from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

/**
 * Обёртка над Filerobot Image Editor.
 * Принимает imageUrl (string) и колбэки onSave / onCancel.
 * onSave получает File — готовое отредактированное изображение.
 */
const ImageEditor = ({ imageUrl, onSave, onCancel }) => {
  const handleSave = useCallback(
    (editedImageObject) => {
      // editedImageObject.imageBase64 — base64 строка
      // editedImageObject.fullName — имя файла
      // editedImageObject.mimeType — mime тип
      // editedImageObject.quality — качество

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
        tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.RESIZE]}
        defaultTabId={TABS.ADJUST}
        defaultToolId={TOOLS.CROP}
        avoidChangesNotSavedAlertOnLeave
        showBackButton
        defaultSavedImageName="hero-edited"
        defaultSavedImageType="png"
        language="ru"
      />
    </div>
  );
};

export default ImageEditor;
