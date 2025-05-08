import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  closeParticipantsModal,
  fetchParticipants,
  selectParticipantsModalState
} from '../../features/events/eventsSlice';
import Modal from '@mui/material/Modal'; // Используем Modal из MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close'; // Иконка закрытия
import styles from './participantsModal.module.scss'; // Стили

// Импортируем стили для лоадера и ошибки, если они нужны внутри модалки
import loadingSpinnerStyles from '../loadingSpinner/loadingSpinner.module.scss';
import errorNotificationStyles from '../errorNotification/errorNotification.module.scss';


const ParticipantsModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isOpen, eventId, isLoading, error, list } = useAppSelector(selectParticipantsModalState);

  // Загружаем список участников при открытии модалки и наличии eventId
  useEffect(() => {
    if (isOpen && eventId && list.length === 0 && !isLoading && !error) { // Загружаем только если список пуст и нет загрузки/ошибки
      dispatch(fetchParticipants(eventId));
    }
  }, [isOpen, eventId, dispatch, list.length, isLoading, error]);

  const handleClose = () => {
    dispatch(closeParticipantsModal());
  };

  // Стили для Box внутри Modal (MUI способ)
  const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: 'none', // Убираем границу по умолчанию
    borderRadius: '8px', // Добавляем скругление
    boxShadow: 24, // Тень
    p: 3, // Отступы внутренние
    outline: 'none', // Убираем outline при фокусе
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="participants-modal-title"
      aria-describedby="participants-modal-description"
    >
      <Box sx={style}>
        <IconButton
           aria-label="close"
           onClick={handleClose}
           sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
         >
           <CloseIcon />
         </IconButton>
        <Typography id="participants-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Участники мероприятия
        </Typography>
        <Box id="participants-modal-description" sx={{ maxHeight: '60vh', overflowY: 'auto' }}> {/* Ограничение высоты и скролл */}
          {isLoading && (
            <div className={loadingSpinnerStyles.loadingContainer}>
              <CircularProgress size={30} />
              <p className={loadingSpinnerStyles.loadingText}>Загрузка списка...</p>
            </div>
          )}
          {error && (
             <div className={`${errorNotificationStyles.errorNotification} ${styles.modalError}`}>
                Ошибка: {error}
             </div>
          )}
          {!isLoading && !error && list.length === 0 && (
            <Typography sx={{ mt: 2 }}>Нет зарегистрированных участников.</Typography>
          )}
          {!isLoading && !error && list.length > 0 && (
            <List dense> {/* dense делает список компактнее */}
              {list.map((participant) => (
                <ListItem key={participant.id} disablePadding>
                   {/* Здесь можно добавить Avatar, если есть ссылка на него */}
                  <ListItemText primary={participant.name} secondary={participant.email} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default ParticipantsModal;