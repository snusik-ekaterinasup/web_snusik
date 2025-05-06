import React from "react";
import { Link } from "react-router-dom";
import styles from "./notFound.module.scss";

const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.notFoundContainer}>
      <div className={styles.content}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.message}>Упс! Страница не найдена.</p>
        <p className={styles.description}>
          Кажется, вы заблудились. Запрашиваемая вами страница не существует или
          была перемещена.
        </p>
        <Link to="/" className={styles.homeLink}>
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
