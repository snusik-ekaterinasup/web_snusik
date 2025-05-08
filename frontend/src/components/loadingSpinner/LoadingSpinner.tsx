import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography"; // Для текста
import styles from "./loadingSpinner.module.scss";

interface LoadingSpinnerProps {
  text?: string; // Опциональный текст рядом со спиннером
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = "Загрузка...",
}) => {
  return (
    // Используем Box для удобного центрирования
    <Box className={styles.loadingContainer}>
      <CircularProgress size={40} thickness={4} />{" "}
      {/* Настраиваемый спиннер MUI */}
      {text && ( // Отображаем текст, только если он передан
        <Typography variant="body1" className={styles.loadingText}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
