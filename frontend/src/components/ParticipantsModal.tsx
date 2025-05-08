// --- НАЧАЛО ФАЙЛА: src/components/ParticipantsModal.tsx ---

import React from 'react';
// Предполагаем, что стили находятся в файле рядом
import styles from './participantsModal.module.scss';

// --- Интерфейс для типа Participant ---
// (Если этот тип уже определен глобально или в другом месте, можно импортировать оттуда)
interface Participant {
    id: number;
    name: string;
    email: string;
}

// --- Интерфейс для пропсов компонента ---
// Определяем, какие данные и функции компонент ожидает получить извне
interface ParticipantsModalProps {
  isOpen: boolean;           // Обязательный: флаг открытия/закрытия
  onClose: () => void;       // Обязательный: функция для закрытия
  participants: Participant[]; // Обязательный: массив участников
  isLoading: boolean;        // Обязательный: флаг загрузки
  error: string | null;      // Обязательный: сообщение об ошибке или null
  eventId?: number | null;    // Опционально: ID события для заголовка
}

// --- Функциональный компонент React ---
// Явно указываем, что компонент принимает пропсы типа ParticipantsModalProps
const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  // Используем деструктуризацию для получения значений из пропсов
  isOpen,
  onClose,
  participants,
  isLoading,
  error,
  eventId,
}) => {

  // Если пропс isOpen равен false, компонент ничего не рендерит
  if (!isOpen) {
    return null;
  }

  // --- JSX разметка компонента ---
  return (
    // Оверлей: занимает весь экран, затемняет фон, закрывает модалку при клике
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* Контейнер контента: предотвращает закрытие при клике внутри */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

        {/* Шапка модального окна */}
        <div className={styles.modalHeader}>
          <h2>Участники мероприятия {eventId ? `(#${eventId})` : ''}</h2>
          {/* Кнопка закрытия */}
          <button onClick={onClose} className={styles.closeButton} aria-label="Закрыть окно">
            × {/* Символ крестика */}
          </button>
        </div>

        {/* Тело модального окна */}
        <div className={styles.modalBody}>
          {/* Отображение состояния загрузки */}
          {isLoading && <p className={styles.loadingText}>Загрузка участников...</p>}

          {/* Отображение ошибки */}
          {error && <p className={styles.errorText}>Ошибка загрузки: {error}</p>}

          {/* Отображение списка участников или сообщения об их отсутствии */}
          {!isLoading && !error && (
            participants.length === 0 ? (
              <p>На это мероприятие пока никто не зарегистрировался.</p>
            ) : (
              <ul className={styles.participantList}>
                {participants.map(participant => (
                  <li key={participant.id} className={styles.participantItem}>
                    <span className={styles.participantName}>{participant.name}</span>
                    <span className={styles.participantEmail}>({participant.email})</span>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>

        {/* Опциональный футер (можно добавить кнопку "Закрыть") */}
        {/* <div className={styles.modalFooter}>
            <button onClick={onClose} className={styles.footerCloseButton}>Закрыть</button>
        </div> */}

      </div>
    </div>
  );
};

// --- Экспорт по умолчанию ---
// Убедитесь, что компонент экспортируется по умолчанию
export default ParticipantsModal;

// --- КОНЕЦ ФАЙЛА: src/components/ParticipantsModal.tsx ---