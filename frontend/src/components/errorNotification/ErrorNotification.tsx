import React from "react";
import styles from "./errorNotification.module.scss";

interface ErrorNotificationProps {
  message: string | null; // Сообщение об ошибке или null, если ошибки нет
  onDismiss?: () => void; // Опциональная функция для закрытия/сброса ошибки
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  message,
  onDismiss,
}) => {
  // Если сообщения нет, ничего не рендерим
  if (!message) {
    return null;
  }

  return (
    <div className={styles.errorNotification} role="alert">
      <span className={styles.errorMessage}>{message}</span>
      {/* Отображаем кнопку закрытия, только если передан обработчик onDismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={styles.closeButton}
          aria-label="Закрыть ошибку" // Для доступности
        >
          × {/* Простой символ "крестик" */}
        </button>
      )}
    </div>
  );
};

export default ErrorNotification;
