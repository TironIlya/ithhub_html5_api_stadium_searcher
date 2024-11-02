const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Создаём HTTP-сервер
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Ошибка загрузки файла');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
});

// Создаём WebSocket-сервер, подключая его к нашему HTTP-серверу
const wss = new WebSocket.Server({ server });

let latestNews = [];

// Функция для запроса и обновления новостей
// Импортируем библиотеку для работы с временем
const moment = require('moment');

const axios = require('axios');
const xml2js = require('xml2js');

async function fetchLatestNews() {
    try {
        // Используем RSS-канал Lenta.ru для спортивных новостей
        const response = await axios.get('https://lenta.ru/rss/news/sport');

        // Парсим XML-данные
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

        // Извлекаем последние 5 новостей
        latestNews = result.rss.channel[0].item.slice(0, 5).map(item => ({
            title: item.title[0],
            link: item.link[0],
            pubDate: item.pubDate[0]
        }));

        console.log('Новости обновлены:', latestNews);
    } catch (error) {
        console.error('Ошибка получения новостей:', error);
    }
}


// Отправка новостей всем подключённым клиентам
function broadcastNews() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(latestNews));
        }
    });
}

// Периодическое обновление новостей
setInterval(async () => {
    await fetchLatestNews();
    broadcastNews();
}, 60000); // Каждую минуту

// Подключение клиента WebSocket
wss.on('connection', ws => {
    console.log('Клиент подключен');
    ws.send(JSON.stringify(latestNews)); // Отправляем последние новости при подключении
});

// Запускаем HTTP-сервер на порту 8081
server.listen(8081, () => {
    console.log('Сервер HTTP запущен на http://localhost:8081');
});
