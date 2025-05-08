// src/components/ParticipantsModal.tsx
import React, { useEffect } from 'react';
import styles from './participantsModal.module.scss'; // Создайте этот файл стилей
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    closeParticipantsModal,
    fetchParticipants,
    selectParticipantsModalState
} from '../features/events/eventsSlice';

const ParticipantsModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isOpen, eventId, participants, isLoading, error } = useAppSelector(selectParticipantsModalState);

    // Загружаем участников при открытии модального окна и наличии eventId
    useEffect(() => {
        if (isOpen && eventId && participants.length === 0 && !isLoading) { // Загружаем только если нет участников и не идет загрузка
            dispatch(fetchParticipants(eventId));
        }
    }, [isOpen, eventId, dispatch, participants.length, isLoading]);


    if (!isOpen) {
        return null; // Не рендерим ничего, если модалка закрыта
    }

    return (
        <div className={styles.modalOverlay} onClick={() => dispatch(closeParticipantsModal())}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Предотвращаем закрытие при клике на контент */}
                <div className={styles.modalHeader}>
                    <h2>Участники мероприятия {eventId ? `(#${eventId})` : ''}</h2>
                    <button onClick={() => dispatch(closeParticipantsModal())} className={styles.closeButton}>×</button>
                </div>
                <div className={styles.modalBody}>
                    {isLoading && <p>Загрузка участников...</p>}
                    {error && <p className={styles.errorText}>Ошибка загрузки: {error}</p>}
                    {!isLoading && !error && participants.length === 0 && <p>На это мероприятие пока никто не зарегистрировался.</p>}
                    {!isLoading && !error && participants.length > 0 && (
                        <ul className={styles.participantList}>
                            {participants.map(p => (
                                <li key={p.id} className={styles.participantItem}>
                                    {p.name} ({p.email})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {/* Можно добавить футер с кнопкой "Закрыть", если нужно */}
                {/* <div className={styles.modalFooter}>
                    <button onClick={() => dispatch(closeParticipantsModal())}>Закрыть</button>
                </div> */}
            </div>
        </div>
    );
};

export default ParticipantsModal;