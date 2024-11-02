let defaultCenter = [55.751244, 37.618423]; // Центр Москвы (по умолчанию)
let isAddingMarker = false; // Флаг для отслеживания режима добавления маркера
const apiKeyWeather = '210ac7fe-f4f8-48bc-ab93-8edc5e8bbc78'; // API-ключ для Яндекс.Погоды

function init() {
    checkHTML5Support();

    let myMap = new ymaps.Map('map-test', {
        center: defaultCenter,
        zoom: 12,
        controls: ['routePanelControl', 'zoomControl']
    });

    myMap.controls.get('zoomControl').options.set({
        position: { right: 10, top: 50 }
    });

    let routePanelControl = myMap.controls.get('routePanelControl');
    routePanelControl.routePanel.options.set({
        types: { auto: true, masstransit: true, pedestrian: true }
    });

    loadMarkers(myMap, routePanelControl);

    const lastLocation = JSON.parse(localStorage.getItem('lastLocation'));
    if (lastLocation) {
        myMap.setCenter(lastLocation, 15);
        let currentLocationMarker = new ymaps.Placemark(lastLocation, {
            balloonContent: 'Последнее известное местоположение'
        });
        myMap.geoObjects.add(currentLocationMarker);
        findNearbySportsFacilities(lastLocation, myMap);
        displayWeather(lastLocation); // Отображаем погоду для последнего местоположения
    } else {
        getUserLocation(myMap, routePanelControl);
    }

    document.getElementById('add-marker').onclick = () => {
        isAddingMarker = !isAddingMarker;
        const button = document.getElementById('add-marker');
        button.style.backgroundColor = isAddingMarker ? 'lightgreen' : '';
        button.textContent = isAddingMarker ? 'Закончить добавление маркера' : 'Добавить маркер';
        alert(isAddingMarker ? 'Кликните на карту, чтобы добавить маркер.' : 'Режим добавления маркера отключен.');
    };

    myMap.events.add('click', function (e) {
        if (isAddingMarker) {
            let coords = e.get('coords');
            let name = prompt("Введите название маркера:");
            const fileInput = document.getElementById('imageUpload');
            const file = fileInput.files[0];

            if (name) {
                const reader = new FileReader();
                reader.onload = function () {
                    // Вывод в консоль результата чтения файла
                    console.log("Файл загружен:", reader.result);

                    // Добавление маркера на карту с изображением
                    addMarkerToMap({ coords: coords, name: name, photo: reader.result }, myMap, routePanelControl);
                    saveMarker({ coords: coords, name: name, photo: reader.result });
                };

                if (file) {
                    reader.readAsDataURL(file);
                } else {
                    // Если файл не выбран, добавляем маркер без фото
                    addMarkerToMap({ coords: coords, name: name, photo: null }, myMap, routePanelControl);
                    saveMarker({ coords: coords, name: name, photo: null });
                }

                isAddingMarker = false;
                const button = document.getElementById('add-marker');
                button.style.backgroundColor = '';
                button.textContent = 'Добавить маркер';
            }
        }
    });


}

// Функция для проверки поддежки HTML5 браузером пользователя
function checkHTML5Support() {
    const features = {
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        canvas: !!document.createElement('canvas').getContext,
        audio: !!document.createElement('audio').canPlayType,
        video: !!document.createElement('video').canPlayType,
        geolocation: 'geolocation' in navigator,
        webSockets: 'WebSocket' in window,
    };

    for (const [feature, isSupported] of Object.entries(features)) {
        console.log(`${feature}: ${isSupported ? 'Supported' : 'Not supported'}`);
    }
}

// Функция для определения локации пользователя
function getUserLocation(myMap, routePanelControl) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                myMap.setCenter(userLocation, 15);

                let currentLocationMarker = new ymaps.Placemark(userLocation, {
                    balloonContent: 'Вы здесь!'
                });
                myMap.geoObjects.add(currentLocationMarker);

                localStorage.setItem('lastLocation', JSON.stringify(userLocation));

                routePanelControl.routePanel.state.set({
                    from: userLocation,
                    toEnabled: true
                });

                findNearbySportsFacilities(userLocation, myMap);
                displayWeather(userLocation);
            },
            (error) => {
                alert("Не удалось определить ваше местоположение. Карта покажет общую область.");
                console.error("Геолокация: ошибка определения местоположения", error);
                myMap.setCenter(defaultCenter, 12);
                findNearbySportsFacilities(defaultCenter, myMap);
                displayWeather(defaultCenter);
            }
        );
    } else {
        alert("Ваш браузер не поддерживает геолокацию.");
    }
}

// Функция для отображения погоды
function displayWeather(coords) {
    const apiUrl = `http://localhost:3000/weather?lat=${coords[0]}&lon=${coords[1]}`; // Ваш локальный прокси-сервер

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при получении данных о погоде');
            }
            return response.json();
        })
        .then(data => {
            const temperature = data.fact.temp;
            const condition = data.fact.condition;
            const weatherData = `Температура: ${temperature}°C<br>Состояние: ${condition}`;

            document.getElementById('weather-data').innerHTML = weatherData;
            document.getElementById('weather-info').style.display = 'block'; // Показываем блок с погодой
        })
        .catch(error => console.error("Ошибка при получении данных о погоде:", error));
}

// Функция для отображения спортивных обьектов поблизости
function findNearbySportsFacilities(userLocation, map) {
    let searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            results: 50,
            noPlacemark: true,
            boundedBy: map.getBounds(),
            strictBounds: false
        }
    });
    map.controls.add(searchControl);

    searchControl.search("спортивный стадион").then(() => {
        searchControl.getResultsArray().forEach((result) => {
            let coords = result.geometry.getCoordinates();
            let name = result.properties.get('name');
            addMarkerToMap({ coords: coords, name: name }, map, routePanelControl);
        });
    }).catch((error) => {
        console.error("Ошибка при поиске стадионов:", error);
    });
}

// Функция для добавления маркера на карту
function addMarkerToMap(marker, map, routePanelControl) {
    const currentTime = new Date().toLocaleString();
    let placemarkContent = `<b>${marker.name}</b><br>${currentTime}`;
    if (marker.photo) {
        placemarkContent += `<br><img src="${marker.photo}" alt="Фото маркера" style="width:100px;height:auto;">`;
    }

    let placemark = new ymaps.Placemark(marker.coords, {
        balloonContent: placemarkContent,
        hintContent: "Нажмите, чтобы построить маршрут"
    });

    placemark.events.add('click', function () {
        routePanelControl.routePanel.state.set({
            to: marker.coords
        });
    });

    map.geoObjects.add(placemark);
}

// Функция сохранения маркера в localStorage
function saveMarker(marker) {
    let markers = JSON.parse(localStorage.getItem('markers')) || [];
    markers.push(marker);
    localStorage.setItem('markers', JSON.stringify(markers));
}

// Функция загрузки маркера из localStorage
function loadMarkers(map, routePanelControl) {
    let markers = JSON.parse(localStorage.getItem('markers')) || [];
    markers.forEach(marker => {
        addMarkerToMap(marker, map, routePanelControl);
    });
}

ymaps.ready(init);
