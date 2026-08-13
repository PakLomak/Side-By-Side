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
// twitchReady:
//     готов ли Twitch Player
//
// pendingPlay:
//     нужно ли запустить Twitch Player после READY
// ============================================================

const players = {

    1: {
        type: null,
        player: null,
        iframe: null,
        video: null,
        twitchReady: false,
        pendingPlay: false
    },

    2: {
        type: null,
        player: null,
        iframe: null,
        video: null,
        twitchReady: false,
        pendingPlay: false
    }

};


// ============================================================
// ЛОКАЛЬНОЕ ВРЕМЯ
// ============================================================

let videoTime1 = 0;
let videoTime2 = 0;

let localTimerInterval = null;

let isCurrentlyPlaying = false;

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
// ОПРЕДЕЛЕНИЕ YOUTUBE ID
// ============================================================

function getYouTubeVideoId(input) {

    const value =
        input.trim();

    if (!value) {
        return null;
    }


    // Просто ID

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


        // youtube.com/watch?v=XXXX

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


        // youtu.be/XXXX

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


        // youtube.com/shorts/XXXX

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


        // Twitch VOD

        if (
            parts[0] === 'videos' &&
            parts[1]
        ) {

            return {

                type: 'twitch-vod',

                id: parts[1]

            };

        }


        // Twitch channel

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
// НАЧАЛЬНОЕ ВРЕМЯ
// ============================================================

function getStartTime(playerNum) {

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
        (minutes * 60) +
        seconds +
        (milliseconds / 1000)
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


    // Twitch

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


    // Local video

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
        twitchReady: false,
        pendingPlay: false

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


    container.innerHTML = '';


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


    // Создаём временный URL
    // для локального файла

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

        twitchReady: false,

        pendingPlay: false

    };


    // Когда видео загрузило метаданные

    video.addEventListener(
        'loadedmetadata',
        function() {

            let time =
                startTime;


            // Не позволяем поставить
            // время дальше длины видео

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

        }
    );


    // Освобождаем Object URL
    // после полной очистки видео

    video.addEventListener(
        'emptied',
        function() {

            try {

                URL.revokeObjectURL(
                    objectUrl
                );

            }

            catch (error) {

                // Ничего не делаем

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


    container.innerHTML = '';


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

        twitchReady: false,

        pendingPlay: false

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


    container.innerHTML = '';


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
            'v' + twitchInfo.id;

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


    players[playerNum] = {

        type: twitchInfo.type,

        player: twitchPlayer,

        iframe: null,

        video: null,

        twitchReady: false,

        pendingPlay: false

    };


    twitchPlayer.addEventListener(
        Twitch.Player.READY,
        function() {

            const info =
                players[playerNum];


            if (!info) {
                return;
            }


            info.twitchReady =
                true;


            // VOD: начальная позиция

            if (
                twitchInfo.type ===
                    'twitch-vod' &&
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


            // Если PLAY был нажат
            // до READY

            if (
                info.pendingPlay
            ) {

                info.pendingPlay =
                    false;


                setTimeout(
                    function() {

                        if (
                            players[playerNum] &&
                            players[playerNum].player
                        ) {

                            players[playerNum]
                                .player
                                .play();

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


        // ----------------------------------------------------
        // Если поле пустое — предлагаем выбрать локальный файл
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // YouTube
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Twitch
        // ----------------------------------------------------

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


        // Позволяем повторно выбрать
        // тот же самый файл

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
// PLAY
// ============================================================

function playVideo(playerNum) {

    const info =
        players[playerNum];


    if (!info) {
        return;
    }


    // --------------------------------------------------------
    // Local
    // --------------------------------------------------------

    if (
        info.type === 'local'
    ) {

        if (!info.video) {
            return;
        }


        const promise =
            info.video.play();


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


    // --------------------------------------------------------
    // YouTube
    // --------------------------------------------------------

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'playVideo'
        );


        return;

    }


    // --------------------------------------------------------
    // Twitch
    // --------------------------------------------------------

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

    }

}


// ============================================================
// PAUSE
// ============================================================

function pauseVideo(playerNum) {

    const info =
        players[playerNum];


    if (!info) {
        return;
    }


    // Local

    if (
        info.type === 'local'
    ) {

        if (info.video) {

            info.video.pause();

        }

        return;

    }


    // YouTube

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'pauseVideo'
        );

        return;

    }


    // Twitch

    if (
        info.type === 'twitch-vod' ||
        info.type === 'twitch-channel'
    ) {

        info.pendingPlay =
            false;


        if (info.player) {

            info.player.pause();

        }

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


    // --------------------------------------------------------
    // Local
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // YouTube
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Twitch VOD
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Twitch LIVE
    // --------------------------------------------------------

    if (
        info.type === 'twitch-channel'
    ) {

        console.log(
            'Перемотка Twitch Live недоступна.'
        );

    }

}


// ============================================================
// СИНХРОНИЗАЦИЯ ВРЕМЕНИ ЛОКАЛЬНОГО VIDEO
// ============================================================
//
// Если есть локальный файл, берём его реальное currentTime.
// Это делает таймер намного точнее.
// ============================================================

function updateLocalVideoTimes() {

    const info1 =
        players[1];

    const info2 =
        players[2];


    if (
        info1 &&
        info1.type === 'local' &&
        info1.video &&
        !info1.video.paused
    ) {

        videoTime1 =
            info1.video.currentTime;

    }


    if (
        info2 &&
        info2.type === 'local' &&
        info2.video &&
        !info2.video.paused
    ) {

        videoTime2 =
            info2.video.currentTime;

    }

}


// ============================================================
// ЗАПУСК ЛОКАЛЬНОГО ТАЙМЕРА
// ============================================================

function startLocalTimer() {

    if (isCurrentlyPlaying) {
        return;
    }


    isCurrentlyPlaying =
        true;


    localTimerInterval =
        setInterval(
            function() {

                // Если локальное видео —
                // используем его настоящий currentTime.

                updateLocalVideoTimes();


                // Для остальных источников
                // оставляем существующий локальный счётчик.

                const info1 =
                    players[1];

                const info2 =
                    players[2];


                if (
                    !(
                        info1 &&
                        info1.type === 'local' &&
                        info1.video &&
                        !info1.video.paused
                    )
                ) {

                    videoTime1 += 0.01;

                }


                if (
                    !(
                        info2 &&
                        info2.type === 'local' &&
                        info2.video &&
                        !info2.video.paused
                    )
                ) {

                    videoTime2 += 0.01;

                }


                updateTimerDisplays();

            },
            10
        );

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


        clearInterval(
            localTimerInterval
        );


        localTimerInterval =
            null;


        isCurrentlyPlaying =
            false;

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


        updateTimerDisplays();


        seekVideo(
            1,
            start1
        );


        seekVideo(
            2,
            start2
        );

    };


// ============================================================
// НАЗАД
// ============================================================

window.syncRewind =
    function(secondsToRewind) {

        videoTime1 =
            Math.max(
                0,
                videoTime1 -
                    secondsToRewind
            );


        videoTime2 =
            Math.max(
                0,
                videoTime2 -
                    secondsToRewind
            );


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
// ВПЕРЁД
// ============================================================

window.syncForward =
    function(secondsToForward) {

        videoTime1 +=
            secondsToForward;

        videoTime2 +=
            secondsToForward;


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


// ============================================================
// ПЕРВОНАЧАЛЬНОЕ ОБНОВЛЕНИЕ
// ============================================================

updateTimerDisplays();