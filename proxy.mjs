import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express(); // Инициализация приложения Express
app.use(cors()); // Подключение CORS

const PORT = 3000; // Порт, на котором будет работать сервер

// Обработчик маршрута для получения данных о погоде
app.get('/weather', async (req, res) => {
    const { lat, lon } = req.query; // Получаем параметры lat и lon из запроса
    const apiKey = '210ac7fe-f4f8-48bc-ab93-8edc5e8bbc78'; // API-ключ для Яндекс.Погоды

    try {
        const apiUrl = `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU`;
        const response = await fetch(apiUrl, {
            headers: {
                'X-Yandex-API-Key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при получении данных о погоде');
        }

        const data = await response.json(); // Парсим ответ в формате JSON
        res.json(data); // Отправляем данные обратно клиенту
    } catch (error) {
        console.error("Ошибка при получении данных о погоде:", error);
        res.status(500).json({ error: 'Не удалось получить данные о погоде' }); // Отправляем ошибку клиенту
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
