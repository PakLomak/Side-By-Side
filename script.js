// ============================================================
// СОСТОЯНИЕ ПЛЕЕРОВ
// ============================================================
//
// type:
//     "youtube"
//     "twitch-vod"
//     "twitch-channel"
//     "local"
//
// player:
//     Twitch Player
//
// iframe:
//     YouTube iframe
//
// video:
//     HTML5 <video> для локального файла
//
// Основные кадровые значения:
//     frame        — текущий номер кадра
//     mediaTime    — фактическое время медиаплеера
//     frameTime    — время, соответствующее текущему кадру
//     frameDuration — длительность одного кадра
// ============================================================

const players = {

    1: {
        type: null,
        player: null,
        iframe: null,
        video: null,

        fps: 60,
        frameDuration: 1 / 60,
        frame: 0,
        mediaTime: 0,
        frameTime: 0,

        twitchReady: false,
        pendingPlay: false,
        isPlaying: false
    },

    2: {
        type: null,
        player: null,
        iframe: null,
        video: null,

        fps: 60,
        frameDuration: 1 / 60,
        frame: 0,
        mediaTime: 0,
        frameTime: 0,

        twitchReady: false,
        pendingPlay: false,
        isPlaying: false
    }

};

// ============================================================
// ЛОКАЛЬНОЕ ВРЕМЯ
// ============================================================

let videoTime1 = 0;
let videoTime2 = 0;

let timersVisible = true;

// ============================================================
// ФОРМАТ ВРЕМЕНИ
// ============================================================

function formatHighResTime(totalSeconds) {

    if (totalSeconds < 0) {
        totalSeconds = 0;
    }

    const mins =
        Math.floor(totalSeconds / 60);

    const secs =
        Math.floor(totalSeconds % 60);

    const ms =
        Math.floor((totalSeconds % 1) * 1000);

    const strMins =
        mins.toString().padStart(2, '0');

    const strSecs =
        secs.toString().padStart(2, '0');

    const strMs =
        ms.toString().padStart(3, '0');

    return `${strMins}:${strSecs}.${strMs}`;
}

// ============================================================
// ОБНОВЛЕНИЕ ТАЙМЕРОВ
// ============================================================

function updateTimerDisplays() {

    const timer1 =
        document.getElementById('timer-display-1');

    const timer2 =
        document.getElementById('timer-display-2');

    if (timer1) {

        timer1.innerText =
            formatHighResTime(videoTime1);

    }

    if (timer2) {

        timer2.innerText =
            formatHighResTime(videoTime2);

    }

}

// ============================================================
// ОБНОВЛЕНИЕ ТАЙМЕРА ИЗ КАДРА
// ============================================================

function updateTimerFromFrame(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    const frame =
        Math.max(
            0,
            Math.round(info.frame)
        );

    const frameTime =
        frame *
        info.frameDuration;

    info.frameTime =
        frameTime;

    if (playerNum === 1) {

        videoTime1 =
            frameTime;

    }

    else {

        videoTime2 =
            frameTime;

    }

    updateTimerDisplays();

}

// ============================================================
// ОПРЕДЕЛЕНИЕ YOUTUBE ID
// ============================================================

function getYouTubeVideoId(input) {

    const value =
        input.trim();

    if (!value) {
        return null;
    }

    // Поддержка прямого ID видео.

    if (
        /^[a-zA-Z0-9_-]{11}$/.test(value)
    ) {

        return value;

    }

    try {

        const url =
            new URL(value);

        const hostname =
            url.hostname.toLowerCase();

        if (
            (
                hostname === 'www.youtube.com' ||
                hostname === 'youtube.com' ||
                hostname === 'm.youtube.com'
            )
            &&
            url.pathname === '/watch'
        ) {

            return url.searchParams.get('v');

        }

        if (
            hostname === 'youtu.be'
        ) {

            return (
                url.pathname
                    .substring(1)
                    .split('/')[0]
                || null
            );

        }

        if (
            (
                hostname === 'www.youtube.com' ||
                hostname === 'youtube.com' ||
                hostname === 'm.youtube.com'
            )
            &&
            url.pathname.startsWith('/shorts/')
        ) {

            return (
                url.pathname.split('/')[2]
                || null
            );

        }

    }

    catch (error) {

        return null;

    }

    return null;

}

// ============================================================
// ОПРЕДЕЛЕНИЕ TWITCH ССЫЛКИ
// ============================================================

function getTwitchInfo(input) {

    const value =
        input.trim();

    if (!value) {
        return null;
    }

    try {

        const url =
            new URL(value);

        const hostname =
            url.hostname.toLowerCase();

        const isTwitch =
            hostname === 'www.twitch.tv' ||
            hostname === 'twitch.tv' ||
            hostname === 'm.twitch.tv';

        if (!isTwitch) {
            return null;
        }

        const parts =
            url.pathname
                .split('/')
                .filter(Boolean);

        if (!parts.length) {
            return null;
        }

        if (
            parts[0] === 'videos' &&
            parts[1]
        ) {

            return {

                type: 'twitch-vod',

                id: parts[1]

            };

        }

        const channel =
            parts[0];

        const reserved = [

            'directory',
            'downloads',
            'jobs',
            'p',
            'search',
            'settings',
            'subscriptions',
            'turbo',
            'wallet',
            'videos',
            'clip',
            'clips'

        ];

        if (
            reserved.includes(
                channel.toLowerCase()
            )
        ) {

            return null;

        }

        return {

            type: 'twitch-channel',

            id: channel

        };

    }

    catch (error) {

        return null;

    }

}

// ============================================================
// ОПРЕДЕЛЕНИЕ ТИПА ССЫЛКИ
// ============================================================

function detectVideoSource(input) {

    const youtubeId =
        getYouTubeVideoId(input);

    if (youtubeId) {

        return {

            type: 'youtube',

            id: youtubeId

        };

    }

    const twitchInfo =
        getTwitchInfo(input);

    if (twitchInfo) {

        return twitchInfo;

    }

    return null;

}

// ============================================================
// TWITCH PARENT
// ============================================================

function getTwitchParent() {

    let hostname =
        window.location.hostname;

    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
    ) {

        return hostname;

    }

    if (hostname) {
        return hostname;
    }

    return 'localhost';

}

// ============================================================
// ОГРАНИЧЕНИЕ ПОЛЕЙ НАЧАЛЬНОГО ВРЕМЕНИ
// ============================================================

function setupTimeInputLimits() {

    const limits = {

        hour1: 999,
        min1: 59,
        sec1: 59,
        cs1: 999,

        hour2: 999,
        min2: 59,
        sec2: 59,
        cs2: 999

    };


    Object.entries(limits).forEach(
        function([id, max]) {

            const input =
                document.getElementById(id);

            if (!input) {
                return;
            }


            input.addEventListener(
                'input',
                function() {

                    if (this.value === '') {
                        return;
                    }

                    let value =
                        parseInt(
                            this.value,
                            10
                        );


                    if (!Number.isFinite(value)) {

                        this.value = '';

                        return;

                    }


                    if (value < 0) {

                        value = 0;

                    }


                    if (value > max) {

                        value = max;

                    }


                    this.value = value;

                }
            );


            input.addEventListener(
                'blur',
                function() {

                    if (this.value === '') {

                        this.value = 0;

                        return;

                    }

                    let value =
                        parseInt(
                            this.value,
                            10
                        );


                    if (!Number.isFinite(value)) {

                        this.value = 0;

                        return;

                    }


                    value =
                        Math.max(
                            0,
                            Math.min(
                                value,
                                max
                            )
                        );


                    this.value = value;

                }
            );

        }
    );

}

// ============================================================
// НАЧАЛЬНОЕ ВРЕМЯ
// ============================================================

function getStartTime(playerNum) {

    const hours =
        parseInt(
            document.getElementById(
                'hour' + playerNum
            ).value
        ) || 0;

    const minutes =
        parseInt(
            document.getElementById(
                'min' + playerNum
            ).value
        ) || 0;

    const seconds =
        parseInt(
            document.getElementById(
                'sec' + playerNum
            ).value
        ) || 0;

    const milliseconds =
        parseInt(
            document.getElementById(
                'cs' + playerNum
            ).value
        ) || 0;

    return (
        (hours * 3600) +
        (minutes * 60) +
        seconds +
        (milliseconds / 1000)
    );

}

// ============================================================
// FPS
// ============================================================

function getFPS(playerNum) {

    const input =
        document.getElementById(
            'fps' + playerNum
        );

    if (!input) {
        return 60;
    }

    let fps =
        parseFloat(input.value);

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {
        fps = 60;
    }

    return fps;
}

// ============================================================
// УСТАНОВКА FPS ПЛЕЕРА
// ============================================================

function setPlayerFPS(
    playerNum,
    fps,
    automatic = false
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {
        return;
    }

    info.fps = fps;

    info.frameDuration =
        1 / fps;

    const input =
        document.getElementById(
            'fps' + playerNum
        );

    if (input) {

        input.value =
            Number.isInteger(fps)
                ? fps
                : fps.toFixed(2);

        input.disabled = false;

    }

    const status =
        document.getElementById(
            'fps-status-' + playerNum
        );

    if (status) {

        status.textContent =
            automatic
                ? 'автоматически'
                : 'ручной';

    }

}

// ============================================================
// ПРИМЕНИТЬ FPS ИЗ ПОЛЯ
// ============================================================

window.refreshFPS = function(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    const input =
        document.getElementById(
            'fps' + playerNum
        );

    if (!input) {
        return;
    }

    let fps =
        parseFloat(input.value);

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {

        alert(
            'Введите корректное значение FPS.'
        );

        input.value =
            info.fps;

        return;

    }

    info.fps =
        fps;

    info.frameDuration =
        1 / fps;

    input.disabled =
        false;

    const status =
        document.getElementById(
            'fps-status-' + playerNum
        );

    if (status) {

        status.textContent =
            'ручной';

    }

    // После смены FPS текущая позиция переводится
    // в новый кадровый масштаб.

    let currentTime = 0;

    if (
        info.type === 'local' &&
        info.video
    ) {

        if (
            Number.isFinite(
                info.video.currentTime
            )
        ) {

            currentTime =
                info.video.currentTime;

        }

    }

    else {

        currentTime =
            playerNum === 1
                ? videoTime1
                : videoTime2;

    }

    info.frame =
        Math.max(
            0,
            Math.round(
                currentTime * fps
            )
        );

    const frameTime =
        info.frame *
        info.frameDuration;

    if (playerNum === 1) {

        videoTime1 =
            frameTime;

    }

    else {

        videoTime2 =
            frameTime;

    }

    updateTimerDisplays();

    console.log(
        'FPS видео ' +
        playerNum +
        ' изменён на:',
        fps
    );

};

// ============================================================
// АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ FPS ЛОКАЛЬНОГО ВИДЕО
// ============================================================
//
// requestVideoFrameCallback позволяет получать информацию
// о фактически отображаемых кадрах HTML5-видео.
// FPS определяется по разнице mediaTime между кадрами.
// ============================================================

function detectLocalVideoFPS(
    playerNum,
    video
) {

    if (
        !video ||
        typeof video.requestVideoFrameCallback !==
            'function'
    ) {

        console.log(
            'requestVideoFrameCallback недоступен'
        );

        return;
    }

    const samples = [];

    let lastMediaTime = null;

    function collectFrame(
        now,
        metadata
    ) {

        const mediaTime =
            metadata.mediaTime;

        if (
            Number.isFinite(mediaTime)
        ) {

            if (
                lastMediaTime !== null
            ) {

                const delta =
                    mediaTime -
                    lastMediaTime;

                if (
                    delta > 0 &&
                    delta < 1
                ) {

                    samples.push(delta);

                }

            }

            lastMediaTime =
                mediaTime;

        }

        if (
            samples.length < 30
        ) {

            video.requestVideoFrameCallback(
                collectFrame
            );

            return;

        }

        const average =
            samples.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) /
            samples.length;

        if (
            average > 0
        ) {

            const detectedFPS =
                1 / average;

            // Округляем небольшие ошибки, например 59.94 → 60.

            const roundedFPS =
                Math.abs(
                    detectedFPS -
                    Math.round(detectedFPS)
                ) < 0.15
                    ? Math.round(detectedFPS)
                    : Number(
                        detectedFPS.toFixed(2)
                    );

            console.log(
                `Видео ${playerNum}: определён FPS =`,
                roundedFPS
            );

            setPlayerFPS(
                playerNum,
                roundedFPS,
                true
            );

        }

    }

    video.requestVideoFrameCallback(
        collectFrame
    );

}

// ============================================================
// ОСТАНОВКА СТАРОГО ПЛЕЕРА
// ============================================================

function destroyPlayer(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (
        info.player &&
        typeof info.player.pause === 'function'
    ) {

        try {

            info.player.pause();

        }

        catch (error) {

            console.log(
                'Ошибка остановки Twitch:',
                error
            );

        }

    }

    if (info.video) {

        try {

            info.video.pause();

            info.video.removeAttribute('src');

            info.video.load();

        }

        catch (error) {

            console.log(
                'Ошибка остановки локального видео:',
                error
            );

        }

    }

    players[playerNum] = {
        type: null,
        player: null,
        iframe: null,
        video: null,

        fps: 60,
        frameDuration: 1 / 60,
        frame: 0,

        mediaTime: 0,
        frameTime: 0,

        twitchReady: false,
        pendingPlay: false,
        isPlaying: false
    };

}

// ============================================================
// СОЗДАНИЕ ЛОКАЛЬНОГО VIDEO
// ============================================================

function createLocalVideoPlayer(
    playerNum,
    file,
    startTime
) {

    const container =
        document.getElementById(
            'player' + playerNum
        );

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(function(element) {

            element.remove();

        });

    const video =
        document.createElement('video');

    video.id =
        'local-video-' + playerNum;

    video.controls = true;

    video.preload = 'auto';

    video.playsInline = true;

    video.style.width = '100%';

    video.style.height = '100%';

    video.style.display = 'block';

    video.style.objectFit = 'contain';

    // Object URL используется для воспроизведения
    // выбранного пользователем локального файла.

    const objectUrl =
        URL.createObjectURL(file);

    video.src =
        objectUrl;

    container.appendChild(video);

    players[playerNum] = {
        type: 'local',

        player: null,
        iframe: null,
        video: video,

        fps: 60,
        frameDuration: 1 / 60,
        frame: 0,

        mediaTime: 0,
        frameTime: 0,

        twitchReady: false,
        pendingPlay: false,

        isPlaying: false
    };

    video.addEventListener(
        'loadedmetadata',
        function() {

            let time =
                startTime;

            if (
                Number.isFinite(video.duration)
            ) {

                time =
                    Math.min(
                        time,
                        video.duration
                    );

            }

            try {

                video.currentTime =
                    time;

            }

            catch (error) {

                console.log(
                    'Ошибка установки времени:',
                    error
                );

            }

            if (playerNum === 1) {

                videoTime1 =
                    time;

            }

            else {

                videoTime2 =
                    time;

            }

            updateTimerDisplays();

            detectLocalVideoFPS(
                playerNum,
                video
            );

        }
    );

    // Object URL больше не нужен после полной очистки видео.

    video.addEventListener(
        'emptied',
        function() {

            try {

                URL.revokeObjectURL(
                    objectUrl
                );

            }

            catch (error) {

                // Ничего не делаем.

            }

        }
    );

}

// ============================================================
// СОЗДАНИЕ YOUTUBE PLAYER
// ============================================================

function createYouTubePlayer(
    playerNum,
    videoId,
    startTime
) {

    const container =
        document.getElementById(
            'player' + playerNum
        );

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(function(element) {

            element.remove();

        });

    const iframe =
        document.createElement('iframe');

    iframe.id =
        'yt-iframe-' + playerNum;

    const start =
        Math.floor(startTime);

    iframe.src =
        'https://www.youtube.com/embed/' +
        encodeURIComponent(videoId) +
        '?enablejsapi=1' +
        '&autoplay=0' +
        '&controls=1' +
        '&start=' +
        start;

    iframe.setAttribute(
        'allow',
        'autoplay; encrypted-media'
    );

    iframe.setAttribute(
        'allowfullscreen',
        ''
    );

    iframe.setAttribute(
        'referrerpolicy',
        'no-referrer-when-downgrade'
    );

    iframe.style.width =
        '100%';

    iframe.style.height =
        '100%';

    iframe.style.border =
        '0';

    container.appendChild(iframe);

    players[playerNum] = {

        type: 'youtube',

        player: null,

        iframe: iframe,

        video: null,

        fps: getFPS(playerNum),

        frameDuration:
            1 / getFPS(playerNum),

        frame: 0,

        twitchReady: false,

        pendingPlay: false,
        isPlaying: false

    };

    iframe.onload =
        function() {

            setTimeout(
                function() {

                    sendYouTubeCommand(
                        playerNum,
                        'seekTo',
                        [
                            startTime,
                            true
                        ]
                    );

                    sendYouTubeCommand(
                        playerNum,
                        'pauseVideo'
                    );

                },
                700
            );

        };

}

// ============================================================
// TWITCH PLAYER
// ============================================================

function createTwitchPlayer(
    playerNum,
    twitchInfo,
    startTime
) {

    const container =
        document.getElementById(
            'player' + playerNum
        );

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(function(element) {

            element.remove();

        });

    const twitchContainer =
        document.createElement('div');

    twitchContainer.id =
        'twitch-player-' +
        playerNum;

    twitchContainer.style.width =
        '100%';

    twitchContainer.style.height =
        '100%';

    container.appendChild(
        twitchContainer
    );

    const parent =
        getTwitchParent();

    const options = {

        width: '100%',

        height: '100%',

        autoplay: false,

        parent: [
            parent
        ]

    };

    if (
        twitchInfo.type === 'twitch-vod'
    ) {

        options.video =
            twitchInfo.id;

    }

    if (
        twitchInfo.type === 'twitch-channel'
    ) {

        options.channel =
            twitchInfo.id;

    }

    const twitchPlayer =
        new Twitch.Player(
            twitchContainer.id,
            options
        );

    console.log(
        'Twitch',
        playerNum,
        'создан:',
        twitchInfo
    );

    players[playerNum] = {

        type: twitchInfo.type,

        player: twitchPlayer,

        iframe: null,

        video: null,

        fps: getFPS(playerNum),

        frameDuration:
            1 / getFPS(playerNum),

        frame: 0,

        twitchReady: false,

        pendingPlay: false,

        isPlaying: false

    };

    twitchPlayer.addEventListener(
        Twitch.Player.READY,
        function() {

            console.log(
                'Twitch',
                playerNum,
                'READY'
            );

            const info =
                players[playerNum];

            if (!info) {
                return;
            }

            info.twitchReady =
                true;

            if (
                twitchInfo.type === 'twitch-vod' &&
                startTime > 0
            ) {

                try {

                    twitchPlayer.seek(
                        startTime
                    );

                }

                catch (error) {

                    console.log(
                        'Ошибка Twitch seek:',
                        error
                    );

                }

            }

            // Если PLAY был нажат до READY,
            // запускаем воспроизведение после готовности плеера.

            if (
                info.pendingPlay
            ) {

                info.pendingPlay =
                    false;

                setTimeout(
                    function() {

                        const current =
                            players[playerNum];

                        if (
                            current &&
                            current.player === twitchPlayer &&
                            current.twitchReady
                        ) {

                            console.log(
                                'Twitch',
                                playerNum,
                                'PLAY → pendingPlay'
                            );

                            current.player.play();

                            current.isPlaying =
                                true;

                        }

                    },
                    100
                );

            }

        }
    );

}

// ============================================================
// ПРОВЕРКА ЛОКАЛЬНОГО ФАЙЛА
// ============================================================

function isLocalVideoFile(input) {

    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {

        return false;

    }

    const file =
        input.files[0];

    return (
        file.type.startsWith('video/')
    );

}

// ============================================================
// ЗАГРУЗКА ЛОКАЛЬНОГО ФАЙЛА
// ============================================================

function loadLocalVideo(
    playerNum,
    file
) {

    if (!file) {
        return;
    }

    if (
        !file.type.startsWith('video/')
    ) {

        alert(
            'Выбранный файл не является видео.'
        );

        return;

    }

    const startTime =
        getStartTime(playerNum);

    destroyPlayer(playerNum);

    if (playerNum === 1) {

        videoTime1 =
            startTime;

    }

    else {

        videoTime2 =
            startTime;

    }

    updateTimerDisplays();

    createLocalVideoPlayer(
        playerNum,
        file,
        startTime
    );

}

// ============================================================
// ЗАГРУЗКА ВИДЕО
// ============================================================

window.loadEmbedVideo =
    function(playerNum) {

        const input =
            document.getElementById(
                'code' + playerNum
            );

        const value =
            input.value.trim();

        if (!value) {

            const fileInput =
                document.getElementById(
                    'local-file-' + playerNum
                );

            if (fileInput) {

                fileInput.click();

            }

            else {

                alert(
                    'Вставьте ссылку YouTube/Twitch или выберите локальный файл.'
                );

            }

            return;

        }

        const source =
            detectVideoSource(value);

        if (!source) {

            alert(

                "Не удалось распознать ссылку.\n\n" +

                "Поддерживаются:\n\n" +

                "YouTube:\n" +

                "https://www.youtube.com/watch?v=...\n" +

                "https://youtu.be/...\n\n" +

                "Twitch VOD:\n" +

                "https://www.twitch.tv/videos/123456789\n\n" +

                "Twitch канал:\n" +

                "https://www.twitch.tv/username\n\n" +

                "Или можно выбрать локальный видеофайл."

            );

            return;

        }

        const startTime =
            getStartTime(playerNum);

        if (playerNum === 1) {

            videoTime1 =
                startTime;

        }

        else {

            videoTime2 =
                startTime;

        }

        updateTimerDisplays();

        destroyPlayer(playerNum);

        if (
            source.type === 'youtube'
        ) {

            createYouTubePlayer(
                playerNum,
                source.id,
                startTime
            );

            return;

        }

        if (
            source.type === 'twitch-vod' ||
            source.type === 'twitch-channel'
        ) {

            createTwitchPlayer(
                playerNum,
                source,
                startTime
            );

            return;

        }

};

// ============================================================
// ОБРАБОТЧИК ВЫБОРА ЛОКАЛЬНОГО ФАЙЛА
// ============================================================

window.handleLocalFile =
    function(playerNum, input) {

        if (
            !input ||
            !input.files ||
            !input.files.length
        ) {

            return;

        }

        const file =
            input.files[0];

        loadLocalVideo(
            playerNum,
            file
        );

        // Позволяет повторно выбрать тот же файл.

        input.value = '';

    };

// ============================================================
// YOUTUBE COMMAND
// ============================================================

function sendYouTubeCommand(
    playerNum,
    funcName,
    argsArray = []
) {

    const info =
        players[playerNum];

    if (
        !info ||
        !info.iframe
    ) {

        return;

    }

    const message =
        JSON.stringify({

            event: 'command',

            func: funcName,

            args: argsArray

        });

    info.iframe.contentWindow.postMessage(
        message,
        '*'
    );

}

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ YOUTUBE
// ============================================================

function requestYouTubeCurrentTime(playerNum) {

    const info =
        players[playerNum];

    if (
        !info ||
        info.type !== 'youtube' ||
        !info.iframe
    ) {

        return;

    }

    info.iframe.contentWindow.postMessage(

        JSON.stringify({

            event: 'command',

            func: 'getCurrentTime',

            args: []

        }),

        '*'

    );

}

// ============================================================
// ОТВЕТ ОТ YOUTUBE
// ============================================================

window.addEventListener(
    'message',
    function(event) {

        let data;

        try {

            data =
                typeof event.data === 'string'
                    ? JSON.parse(event.data)
                    : event.data;

        }

        catch (error) {

            return;

        }

        if (!data) {
            return;
        }

        for (
            const playerNum of [1, 2]
        ) {

            const info =
                players[playerNum];

            if (
                !info ||
                info.type !== 'youtube' ||
                !info.iframe
            ) {

                continue;

            }

            // Принимаем сообщения только от нашего iframe.

            if (
                event.source !==
                info.iframe.contentWindow
            ) {

                continue;

            }

            // infoDelivery содержит текущее состояние YouTube-плеера.

            if (
                data.event === 'infoDelivery' &&
                data.info
            ) {

                if (
                    Number.isFinite(
                        data.info.currentTime
                    )
                ) {

                    info.mediaTime =
                        data.info.currentTime;

                    console.log(
                        'YouTube',
                        playerNum,
                        'реальное время:',
                        info.mediaTime
                    );

                }

            }

        }

    }
);

// ============================================================
// ВОСПРОИЗВЕДЕНИЕ
// ============================================================

function playVideo(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (
        info.type === 'local'
    ) {

        if (!info.video) {
            return;
        }

        const promise =
            info.video.play();

        info.isPlaying = true;

        if (
            promise &&
            typeof promise.catch === 'function'
        ) {

            promise.catch(
                function(error) {

                    console.log(
                        'Ошибка запуска локального видео:',
                        error
                    );

                }
            );

        }

        return;

    }

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'playVideo'
        );

        info.isPlaying = true;

        return;

    }

    if (
        info.type === 'twitch-vod' ||
        info.type === 'twitch-channel'
    ) {

        if (!info.player) {
            return;
        }

        if (!info.twitchReady) {

            info.pendingPlay =
                true;

            return;

        }

        info.player.play();
        info.isPlaying = true;

    }

}

// ============================================================
// ПАУЗА
// ============================================================

function pauseVideo(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (
        info.type === 'local'
    ) {

        if (info.video) {

            // Перед паузой сохраняем фактическое положение видео.

            if (
                Number.isFinite(
                    info.video.currentTime
                )
            ) {

                info.mediaTime =
                    info.video.currentTime;

                info.frame =
                    Math.max(
                        0,
                        Math.round(
                            info.mediaTime *
                            info.fps
                        )
                    );

            }

            info.video.pause();

        }

        info.isPlaying = false;

        return;

    }

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'pauseVideo'
        );

        info.isPlaying = false;
        return;

    }

    if (
        info.type === 'twitch-vod' ||
        info.type === 'twitch-channel'
    ) {

        info.pendingPlay =
            false;

        if (info.player) {

            info.player.pause();

        }

        info.isPlaying = false;

    }

}

// ============================================================
// ПЕРЕМОТКА
// ============================================================

function seekVideo(
    playerNum,
    time
) {

    if (time < 0) {
        time = 0;
    }

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (
        info.type === 'local'
    ) {

        if (info.video) {

            try {

                if (
                    Number.isFinite(
                        info.video.duration
                    )
                ) {

                    time =
                        Math.min(
                            time,
                            info.video.duration
                        );

                }

                info.video.currentTime =
                    time;

            }

            catch (error) {

                console.log(
                    'Ошибка перемотки локального видео:',
                    error
                );

            }

        }

        return;

    }

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'seekTo',
            [
                time,
                true
            ]
        );

        return;

    }

    if (
        info.type === 'twitch-vod'
    ) {

        if (info.player) {

            try {

                info.player.seek(
                    time
                );

            }

            catch (error) {

                console.log(
                    'Ошибка Twitch seek:',
                    error
                );

            }

        }

        return;

    }

    if (
        info.type === 'twitch-channel'
    ) {

        console.log(
            'Перемотка Twitch Live недоступна.'
        );

    }

}

// ============================================================
// КАДРОВЫЙ ТАЙМЕР
// ============================================================
//
// Локальное видео:
//     время обновляется через requestVideoFrameCallback()
//
// YouTube / Twitch:
//     положение рассчитывается по прошедшему времени и FPS.
//
// Кадровая модель:
//     frame        — номер кадра
//     frameDuration — длительность кадра
//     frameTime    — время, соответствующее кадру
//     mediaTime    — фактическое время медиаплеера
// ============================================================

let frameTimerHandles = {
    1: null,
    2: null
};

// ============================================================
// ОСТАНОВКА КАДРОВОГО ТАЙМЕРА
// ============================================================

function stopFrameTimer(playerNum) {

    const handle =
        frameTimerHandles[playerNum];

    if (handle !== null) {

        clearTimeout(handle);

        frameTimerHandles[playerNum] =
            null;

    }

}

// ============================================================
// ТАЙМЕР YOUTUBE
// ============================================================

let youtubeTimerHandles = {
    1: null,
    2: null
};

function stopYouTubeTimer(playerNum) {

    const handle =
        youtubeTimerHandles[playerNum];

    if (handle !== null) {

        clearInterval(handle);

        youtubeTimerHandles[playerNum] =
            null;

    }

}

function startYouTubeTimer(playerNum) {

    const info =
        players[playerNum];

    if (
        !info ||
        info.type !== 'youtube'
    ) {

        return;

    }

    stopYouTubeTimer(playerNum);

    // Для YouTube таймер использует системные часы браузера,
    // а затем переводит прошедшее время в кадры выбранного FPS.

    const startClock =
        performance.now();

    const startFrame =
        Number.isFinite(info.frame)
            ? info.frame
            : 0;

    const startTime =
        startFrame *
        info.frameDuration;

    function update() {

        const current =
            players[playerNum];

        if (
            !current ||
            current.type !== 'youtube'
        ) {

            stopYouTubeTimer(playerNum);
            return;

        }

        if (!current.isPlaying) {

            stopYouTubeTimer(playerNum);
            return;

        }

        const elapsed =
            (
                performance.now() -
                startClock
            ) / 1000;

        const time =
            startTime +
            elapsed;

        current.frame =
            Math.max(
                0,
                Math.round(
                    time *
                    current.fps
                )
            );

        const frameTime =
            current.frame *
            current.frameDuration;

        if (playerNum === 1) {

            videoTime1 =
                frameTime;

        }

        else {

            videoTime2 =
                frameTime;

        }

        updateTimerDisplays();

    }

    youtubeTimerHandles[playerNum] =
        setInterval(
            update,
            15
        );

    update();

}

// ============================================================
// КАДРОВЫЙ ТАЙМЕР YOUTUBE / TWITCH
// ============================================================
//
// Эти плееры не дают прямого доступа к фактически отображаемому
// кадру, поэтому положение рассчитывается по прошедшему времени
// и FPS конкретного видео.
// ============================================================

function startExternalFrameTimer(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    stopFrameTimer(playerNum);

    const startClock =
        performance.now();

    const startFrame =
        Number.isFinite(info.frame)
            ? info.frame
            : 0;

    const startTime =
        startFrame *
        info.frameDuration;

    function nextFrame() {

        const current =
            players[playerNum];

        if (!current) {

            frameTimerHandles[playerNum] =
                null;

            return;

        }

        if (!current.isPlaying) {

            frameTimerHandles[playerNum] =
                null;

            return;

        }

        if (
            current.type === 'local'
        ) {

            frameTimerHandles[playerNum] =
                null;

            return;

        }

        const elapsed =
            (
                performance.now() -
                startClock
            ) / 1000;

        const time =
            startTime +
            elapsed;

        current.frame =
            Math.max(
                0,
                Math.round(
                    time *
                    current.fps
                )
            );

        const frameTime =
            current.frame *
            current.frameDuration;

        if (playerNum === 1) {

            videoTime1 =
                frameTime;

        }

        else {

            videoTime2 =
                frameTime;

        }

        updateTimerDisplays();

        frameTimerHandles[playerNum] =
            setTimeout(
                nextFrame,
                current.frameDuration * 1000
            );

    }

    nextFrame();

}

// ============================================================
// КАДРОВОЙ CALLBACK ЛОКАЛЬНОГО VIDEO
// ============================================================
//
// requestVideoFrameCallback вызывается браузером при отображении
// нового кадра. Поэтому локальное видео может использовать
// фактическое время отображаемого кадра.
// ============================================================

function startLocalFrameTimer(playerNum) {

    const info =
        players[playerNum];

    if (
        !info ||
        info.type !== 'local' ||
        !info.video
    ) {

        return;

    }

    const video =
        info.video;

    if (
        typeof video.requestVideoFrameCallback !==
        'function'
    ) {

        return;

    }

    function onVideoFrame(
        now,
        metadata
    ) {

        const current =
            players[playerNum];

        if (
            !current ||
            current.video !== video
        ) {

            return;

        }

        if (!current.isPlaying) {
            return;
        }

        // mediaTime — реальное время отображаемого кадра.

        if (
            metadata &&
            Number.isFinite(
                metadata.mediaTime
            )
        ) {

            const mediaTime =
                metadata.mediaTime;

            current.mediaTime =
                mediaTime;

            current.frame =
                Math.max(
                    0,
                    Math.round(
                        mediaTime *
                        current.fps
                    )
                );

            updateTimerFromFrame(
                playerNum
            );

        }

        else {

            // Запасной вариант, если браузер не передал mediaTime.

            current.frame += 1;

            updateTimerFromFrame(
                playerNum
            );

        }

        updateTimerDisplays();

        video.requestVideoFrameCallback(
            onVideoFrame
        );

    }

    video.requestVideoFrameCallback(
        onVideoFrame
    );

}

// ============================================================
// СИНХРОНИЗАЦИЯ НАЧАЛЬНОГО КАДРА
// ============================================================

function syncFramePosition(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    const fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : getFPS(playerNum);

    info.fps = fps;

    info.frameDuration =
        1 / fps;

    let time = 0;

    if (
        info.type === 'local' &&
        info.video
    ) {

        time =
            info.video.currentTime;

    }

    else {

        if (playerNum === 1) {

            time =
                videoTime1;

        }

        else {

            time =
                videoTime2;

        }

    }

    info.frame =
        Math.max(
            0,
            Math.round(
                time * fps
            )
        );

    // После округления возвращаем время,
    // соответствующее фактическому кадру.

    const frameTime =
        info.frame *
        info.frameDuration;

    if (playerNum === 1) {

        videoTime1 =
            frameTime;

    }

    else {

        videoTime2 =
            frameTime;

    }

}

// ============================================================
// ЗАПУСК КАДРОВОГО ТАЙМЕРА
// ============================================================

function startLocalTimer() {

    syncFramePosition(1);
    syncFramePosition(2);

    const info1 =
        players[1];

    const info2 =
        players[2];

    if (
        info1 &&
        info1.type === 'local'
    ) {

        startLocalFrameTimer(1);

    }

    else if (
        info1 &&
        info1.type === 'youtube'
    ) {

        startYouTubeTimer(1);

    }

    else {

        startExternalFrameTimer(1);

    }

    if (
        info2 &&
        info2.type === 'local'
    ) {

        startLocalFrameTimer(2);

    }

    else if (
        info2 &&
        info2.type === 'youtube'
    ) {

        startYouTubeTimer(2);

    }

    else {

        startExternalFrameTimer(2);

    }

    updateTimerDisplays();

}

// ============================================================
// ОЖИДАНИЕ TWITCH READY
// ============================================================

function waitForTwitchPlaying(playerNum) {

    return new Promise(
        function(resolve) {

            const info =
                players[playerNum];

            if (!info) {

                resolve(false);

                return;

            }

            if (
                info.type === 'youtube' ||
                info.type === 'local'
            ) {

                resolve(true);

                return;

            }

            if (info.twitchReady) {

                resolve(true);

                return;

            }

            const checkInterval =
                setInterval(
                    function() {

                        const current =
                            players[playerNum];

                        if (
                            current &&
                            current.twitchReady
                        ) {

                            clearInterval(
                                checkInterval
                            );

                            resolve(true);

                        }

                    },
                    50
                );

            setTimeout(
                function() {

                    clearInterval(
                        checkInterval
                    );

                    const current =
                        players[playerNum];

                    if (
                        current &&
                        current.twitchReady
                    ) {

                        resolve(true);

                    }

                    else {

                        resolve(false);

                    }

                },
                15000
            );

        }
    );

}

// ============================================================
// СИНХРОННЫЙ СТАРТ
// ============================================================

window.syncPlay =
    function() {

        playVideo(1);

        playVideo(2);

        startLocalTimer();

    };

// ============================================================
// СИНХРОННАЯ ПАУЗА
// ============================================================

window.syncPause =
    function() {

        pauseVideo(1);

        pauseVideo(2);

        stopFrameTimer(1);

        stopFrameTimer(2);

        stopYouTubeTimer(1);

        stopYouTubeTimer(2);

    };

// ============================================================
// СТОП / В НАЧАЛО
// ============================================================

window.syncStop =
    function() {

        window.syncPause();

        const start1 =
            getStartTime(1);

        const start2 =
            getStartTime(2);

        videoTime1 =
            start1;

        videoTime2 =
            start2;

        players[1].frame =
            Math.max(
                0,
                Math.round(
                    start1 *
                    players[1].fps
                )
            );

        players[2].frame =
            Math.max(
                0,
                Math.round(
                    start2 *
                    players[2].fps
                )
            );

        videoTime1 =
            players[1].frame *
            players[1].frameDuration;

        videoTime2 =
            players[2].frame *
            players[2].frameDuration;

        updateTimerDisplays();

        seekVideo(
            1,
            videoTime1
        );

        seekVideo(
            2,
            videoTime2
        );

    };

// ============================================================
// ПЕРЕМОТКА ПО КАДРАМ
// ============================================================
//
// Для каждого видео используется собственный FPS.
//
// Например:
//     Видео 1 = 60 FPS → 1 кадр = 1/60 сек.
//     Видео 2 = 30 FPS → 1 кадр = 1/30 сек.
// ============================================================

function seekPlayerByFrames(
    playerNum,
    frameDelta
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    let fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : getFPS(playerNum);

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {

        fps = 60;

    }

    info.fps =
        fps;

    info.frameDuration =
        1 / fps;

    // Для локального видео берём фактическое currentTime.
    // Остальные источники используют время таймера.

    let currentTime = 0;

    if (
        info.type === 'local' &&
        info.video
    ) {

        currentTime =
            Number.isFinite(
                info.video.currentTime
            )
                ? info.video.currentTime
                : 0;

    }

    else {

        currentTime =
            playerNum === 1
                ? videoTime1
                : videoTime2;

    }

    const currentFrame =
        Math.round(
            currentTime * fps
        );

    let newFrame =
        currentFrame +
        frameDelta;

    newFrame =
        Math.max(
            0,
            Math.round(newFrame)
        );

    info.frame =
        newFrame;

    const newTime =
        newFrame *
        info.frameDuration;

    if (playerNum === 1) {

        videoTime1 =
            newTime;

    }

    else {

        videoTime2 =
            newTime;

    }

    seekVideo(
        playerNum,
        newTime
    );

    updateTimerDisplays();

}

// ============================================================
// ПЕРЕМОТКА ВИДЕО 1 ПО КАДРАМ
// ============================================================

window.rewindVideo1Frames =
    function(frames) {

        seekPlayerByFrames(
            1,
            -Math.abs(frames)
        );

    };

window.forwardVideo1Frames =
    function(frames) {

        seekPlayerByFrames(
            1,
            Math.abs(frames)
        );

    };

// ============================================================
// ПЕРЕМОТКА ВИДЕО 2 ПО КАДРАМ
// ============================================================

window.rewindVideo2Frames =
    function(frames) {

        seekPlayerByFrames(
            2,
            -Math.abs(frames)
        );

    };

window.forwardVideo2Frames =
    function(frames) {

        seekPlayerByFrames(
            2,
            Math.abs(frames)
        );

    };

// ============================================================
// ПЕРЕМОТКА НА СЕКУНДЫ
// ============================================================

function seekPlayerBySeconds(
    playerNum,
    seconds
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    let fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : getFPS(playerNum);

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {

        fps = 60;

    }

    // Секунды переводятся в целое количество кадров.

    const frameDelta =
        Math.round(
            seconds * fps
        );

    seekPlayerByFrames(
        playerNum,
        frameDelta
    );

}

// ============================================================
// ПЕРЕМОТКА ВИДЕО 1 ПО СЕКУНДАМ
// ============================================================

window.rewindVideo1Seconds =
    function(seconds) {

        seekPlayerBySeconds(
            1,
            -Math.abs(seconds)
        );

    };

window.forwardVideo1Seconds =
    function(seconds) {

        seekPlayerBySeconds(
            1,
            Math.abs(seconds)
        );

    };

// ============================================================
// ПЕРЕМОТКА ВИДЕО 2 ПО СЕКУНДАМ
// ============================================================

window.rewindVideo2Seconds =
    function(seconds) {

        seekPlayerBySeconds(
            2,
            -Math.abs(seconds)
        );

    };

window.forwardVideo2Seconds =
    function(seconds) {

        seekPlayerBySeconds(
            2,
            Math.abs(seconds)
        );

    };

// ============================================================
// ПОКАЗ / СКРЫТИЕ ТАЙМЕРОВ
// ============================================================

window.toggleTimersVisibility =
    function() {

        const timer1 =
            document.getElementById(
                'timer-display-1'
            );

        const timer2 =
            document.getElementById(
                'timer-display-2'
            );

        const btn =
            document.querySelector(
                '.btn-toggle-timers'
            );

        if (timersVisible) {

            timer1.style.display =
                'none';

            timer2.style.display =
                'none';

            if (btn) {

                btn.style.background =
                    '#424242';

            }

            timersVisible =
                false;

        }

        else {

            timer1.style.display =
                'block';

            timer2.style.display =
                'block';

            if (btn) {

                btn.style.background =
                    '#00796b';

            }

            timersVisible =
                true;

        }

    };

function resetStartTime(videoNumber) {

    document.getElementById(`hour${videoNumber}`).value = 0;
    document.getElementById(`min${videoNumber}`).value = 0;
    document.getElementById(`sec${videoNumber}`).value = 0;
    document.getElementById(`cs${videoNumber}`).value = 0;

}

// ============================================================
// ПЕРВОНАЧАЛЬНОЕ ОБНОВЛЕНИЕ
// ============================================================

setupTimeInputLimits();

updateTimerDisplays();