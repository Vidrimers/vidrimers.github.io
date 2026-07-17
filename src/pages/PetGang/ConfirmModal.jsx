import styles from './PetGang.module.css';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Удалить' }) => {
  return (
    <div className={styles.modal} onClick={onCancel}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {message && <p className={styles.confirmMessage}>{message}</p>}
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onCancel}>Отмена</button>
          <button className={styles.btnDanger} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
