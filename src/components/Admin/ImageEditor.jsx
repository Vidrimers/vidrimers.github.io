import React, { useCallback } from 'react';
import FilerobotImageEditor from 'react-filerobot-image-editor';

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
          <p style={{ fontSize: 12, color: '#999', maxWidth: 400, textAlign: 'center', wordBreak: 'break-all' }}>{this.state.error?.message}</p>
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

  if (!imageUrl) return null;

  return (
    <EditorErrorBoundary onCancel={onCancel}>
      <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
        <FilerobotImageEditor
          source={imageUrl}
          onSave={handleSave}
          onClose={onCancel}
          useBackendTranslations={false}
        />
      </div>
    </EditorErrorBoundary>
  );
};

export default ImageEditor;
