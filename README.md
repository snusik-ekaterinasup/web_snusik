Ненашев ПрИ-22

backend:

Для запуска проекта нужно удостовериться, что установлены node.js и npm с https://nodejs.org/
Если они установлены, проверка версий осуществляется командами:
node -v
npm -v

Иницализация:
npm init -y

Установка зависимостей:
npm install express sequelize pg pg-hstore cors dotenv
npm install --save-dev nodemon
npm install swagger-jsdoc swagger-ui-express

Настройка переменных окружения в .env файле
Создать .env в корне backend и объявить следующее:
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
MAX_EVENTS_PER_DAY=