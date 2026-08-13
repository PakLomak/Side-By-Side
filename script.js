// ============================================================
// СОСТОЯНИЕ ПЛЕЕРОВ
// ============================================================

// Для каждого окна храним информацию:
//
// type:
//     "youtube"
//     "twitch-vod"
//     "twitch-channel"
//
// player:
//     объект Twitch Player
//
// iframe:
//     iframe YouTube
//
// twitchReady:
//     готов ли Twitch Player
//
// pendingPlay:
//     нужно ли запустить Twitch Player,
//     когда он станет READY

const players = {

    1: {
        type: null,
        player: null,
        iframe: null,
        twitchReady: false,
        pendingPlay: false
    },

    2: {
        type: null,
        player: null,
        iframe: null,
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
        Math.floor(
            totalSeconds / 60
        );

    const secs =
        Math.floor(
            totalSeconds % 60
        );

    const ms =
        Math.floor(
            (totalSeconds % 1) * 1000
        );

    const strMins =
        mins
            .toString()
            .padStart(2, '0');

    const strSecs =
        secs
            .toString()
            .padStart(2, '0');

    const strMs =
        ms
            .toString()
            .padStart(3, '0');

    return (
        `${strMins}:${strSecs}.${strMs}`
    );

}


// ============================================================
// ОБНОВЛЕНИЕ ТАЙМЕРОВ
// ============================================================

function updateTimerDisplays() {

    document.getElementById(
        'timer-display-1'
    ).innerText =
        formatHighResTime(
            videoTime1
        );

    document.getElementById(
        'timer-display-2'
    ).innerText =
        formatHighResTime(
            videoTime2
        );

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
        /^[a-zA-Z0-9_-]{11}$/.test(
            value
        )
    ) {

        return value;

    }


    try {

        const url =
            new URL(value);


        // youtube.com/watch?v=XXXX

        if (

            (
                url.hostname ===
                    'www.youtube.com' ||

                url.hostname ===
                    'youtube.com' ||

                url.hostname ===
                    'm.youtube.com'
            )

            &&

            url.pathname ===
                '/watch'

        ) {

            return (
                url.searchParams
                    .get('v')
            );

        }


        // youtu.be/XXXX

        if (
            url.hostname ===
                'youtu.be'
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
                url.hostname ===
                    'www.youtube.com' ||

                url.hostname ===
                    'youtube.com' ||

                url.hostname ===
                    'm.youtube.com'
            )

            &&

            url.pathname.startsWith(
                '/shorts/'
            )

        ) {

            return (
                url.pathname
                    .split('/')[2]
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


        // Проверяем домен Twitch

        const isTwitch =

            url.hostname ===
                'www.twitch.tv'

            ||

            url.hostname ===
                'twitch.tv'

            ||

            url.hostname ===
                'm.twitch.tv';


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


        // ----------------------------------------------------
        // Twitch VOD
        //
        // /videos/123456789
        // ----------------------------------------------------

        if (
            parts[0] ===
                'videos'
            &&
            parts[1]
        ) {

            return {

                type: 'twitch-vod',

                id: parts[1]

            };

        }


        // ----------------------------------------------------
        // Twitch channel
        //
        // /username
        // ----------------------------------------------------

        const channel =
            parts[0];


        // Служебные страницы Twitch
        // не считаем каналами

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
// ОПРЕДЕЛЯЕМ PARENT ДЛЯ TWITCH
// ============================================================

function getTwitchParent() {

    let hostname =
        window.location.hostname;


    // При открытии через localhost

    if (
        hostname ===
            'localhost'
        ||
        hostname ===
            '127.0.0.1'
    ) {

        return hostname;

    }


    // Если сайт открыт по IP

    if (
        hostname
    ) {

        return hostname;

    }


    return 'localhost';

}


// ============================================================
// ПОЛУЧАЕМ НАЧАЛЬНОЕ ВРЕМЯ
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

        (minutes * 60)

        +

        seconds

        +

        (
            milliseconds / 1000
        )

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


    // Очищаем старый плеер

    container.innerHTML = '';


    const iframe =
        document.createElement(
            'iframe'
        );


    iframe.id =
        'yt-iframe-' + playerNum;


    const start =
        Math.floor(
            startTime
        );


    iframe.src =

        'https://www.youtube.com/embed/' +

        encodeURIComponent(
            videoId
        ) +

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


    container.appendChild(
        iframe
    );


    players[playerNum] = {

        type: 'youtube',

        player: null,

        iframe: iframe,

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


    // Создаём уникальный контейнер

    const twitchContainer =
        document.createElement(
            'div'
        );


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


    // Twitch требует parent

    const parent =
        getTwitchParent();


    // --------------------------------------------------------
    // VOD
    // --------------------------------------------------------

    if (
        twitchInfo.type ===
            'twitch-vod'
    ) {

        const twitchPlayer =
            new Twitch.Player(
                twitchContainer.id,
                {

                    width: '100%',

                    height: '100%',

                    video:
                        'v' +
                        twitchInfo.id,

                    autoplay:
                        false,

                    parent: [
                        parent
                    ]

                }
            );


        players[playerNum] = {

            type: 'twitch-vod',

            player:
                twitchPlayer,

            iframe: null,

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


        info.twitchReady = true;


        // Выставляем начальную позицию

        if (
            startTime > 0
        ) {

            twitchPlayer.seek(
                startTime
            );

        }


        // Если пользователь уже нажал PLAY
        // до того, как Twitch стал READY,
        // запускаем после небольшой задержки.

        if (
            info.pendingPlay
        ) {

            info.pendingPlay = false;


            setTimeout(
                function() {

                    // Проверяем, что плеер
                    // всё ещё существует.

                    if (
                        players[playerNum]
                        &&
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


        return;

    }


    // --------------------------------------------------------
    // LIVE CHANNEL
    // --------------------------------------------------------

    if (
        twitchInfo.type ===
            'twitch-channel'
    ) {

        const twitchPlayer =
            new Twitch.Player(
                twitchContainer.id,
                {

                    width: '100%',

                    height: '100%',

                    channel:
                        twitchInfo.id,

                    autoplay:
                        false,

                    parent: [
                        parent
                    ]

                }
            );


        players[playerNum] = {

            type: 'twitch-channel',

            player:
                twitchPlayer,

            iframe: null,

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


        info.twitchReady = true;


        // Если пользователь уже нажал PLAY
        // до того, как Twitch стал READY.

        if (
            info.pendingPlay
        ) {

            info.pendingPlay = false;


            setTimeout(
                function() {

                    if (
                        players[playerNum]
                        &&
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

}


// ============================================================
// ЗАГРУЗКА ВИДЕО
// ============================================================

window.loadEmbedVideo =
    function(playerNum) {

        const input =
            document.getElementById(
                'code' + playerNum
            ).value;


        const source =
            detectVideoSource(
                input
            );


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

                "https://www.twitch.tv/username"

            );


            return;

        }


        const startTime =
            getStartTime(
                playerNum
            );


        // ----------------------------------------------------
        // Сохраняем локальное время
        // ----------------------------------------------------

        if (
            playerNum === 1
        ) {

            videoTime1 =
                startTime;

        }


        if (
            playerNum === 2
        ) {

            videoTime2 =
                startTime;

        }


        updateTimerDisplays();


        // ----------------------------------------------------
        // Если уже был Twitch Player
        // ----------------------------------------------------

        const oldPlayer =
            players[playerNum];


        if (
            oldPlayer &&
            oldPlayer.player
        ) {

            try {

                if (
                    typeof oldPlayer.player.pause ===
                    'function'
                ) {

                    oldPlayer.player.pause();

                }

            }

            catch (error) {

                console.log(
                    'Ошибка остановки старого плеера:',
                    error
                );

            }

        }


        // ----------------------------------------------------
        // YouTube
        // ----------------------------------------------------

        if (
            source.type ===
                'youtube'
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

            source.type ===
                'twitch-vod'

            ||

            source.type ===
                'twitch-channel'

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
// YOUTUBE COMMAND
// ============================================================

function sendYouTubeCommand(
    playerNum,
    funcName,
    argsArray = []
) {

    const iframe =
        players[playerNum]
            .iframe;


    if (!iframe) {

        return;

    }


    const message =
        JSON.stringify({

            event: 'command',

            func: funcName,

            args: argsArray

        });


    iframe.contentWindow.postMessage(
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
    // YouTube
    // --------------------------------------------------------

    if (
        info.type ===
            'youtube'
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
        info.type ===
            'twitch-vod'
        ||
        info.type ===
            'twitch-channel'
    ) {

        if (
            !info.player
        ) {

            return;

        }


        // Twitch ещё не готов.
        // Запоминаем команду запуска.

        if (
            !info.twitchReady
        ) {

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


    // --------------------------------------------------------
    // YouTube
    // --------------------------------------------------------

    if (
        info.type ===
            'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'pauseVideo'
        );


        return;

    }


    // --------------------------------------------------------
    // Twitch
    // --------------------------------------------------------

    if (
        info.type ===
            'twitch-vod'
        ||
        info.type ===
            'twitch-channel'
    ) {

        // Отменяем отложенный запуск

        info.pendingPlay =
            false;


        if (
            info.player
        ) {

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
    // YouTube
    // --------------------------------------------------------

    if (
        info.type ===
            'youtube'
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
        info.type ===
            'twitch-vod'
    ) {

        if (
            info.player
        ) {

            info.player.seek(
                time
            );

        }


        return;

    }


    // --------------------------------------------------------
    // Twitch LIVE
    // --------------------------------------------------------

    if (
        info.type ===
            'twitch-channel'
    ) {

        console.log(
            'Перемотка Twitch Live недоступна.'
        );


        return;

    }

}


// ============================================================
// ЗАПУСК ЛОКАЛЬНОГО ТАЙМЕРА
// ============================================================

function startLocalTimer() {

    if (
        !isCurrentlyPlaying
    ) {

        isCurrentlyPlaying =
            true;


        localTimerInterval =
            setInterval(
                function() {

                    videoTime1 +=
                        0.01;


                    videoTime2 +=
                        0.01;


                    updateTimerDisplays();

                },
                10
            );

    }

}


// ============================================================
// ОЖИДАНИЕ ГОТОВНОСТИ TWITCH
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


            // YouTube не требует
            // ожидания Twitch

            if (
                info.type ===
                    'youtube'
            ) {

                resolve(true);

                return;

            }


            // Если Twitch уже готов

            if (
                info.twitchReady
            ) {

                resolve(true);

                return;

            }


            // Ждём READY

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

            // Защита от бесконечного ожидания

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

        console.log('SYNC PLAY');

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


            btn.style.background =
                '#424242';


            timersVisible =
                false;

        }

        else {

            timer1.style.display =
                'block';


            timer2.style.display =
                'block';


            btn.style.background =
                '#00796b';


            timersVisible =
                true;

        }

    };

// ============================================================
// ТЕСТ PLAY — ДЕЛАЕМ TWITCH-КОНТЕЙНЕР ВИДИМЫМ ДЛЯ VIEWPORT
// ============================================================

window.testPlay = function(playerNum) {

    console.log('==============================');
    console.log('TEST PLAY:', playerNum);

    const info = players[playerNum];

    if (!info) {
        console.log('TEST PLAY: player info not found');
        return;
    }

    if (!info.player) {
        console.log('TEST PLAY: Twitch player not found');
        return;
    }

    const twitchContainer = document.getElementById(
        `twitch-player-${playerNum}`
    );

    console.log(
        'TEST PLAY: twitchContainer:',
        twitchContainer
    );

    if (!twitchContainer) {
        console.log(
            'TEST PLAY: twitchContainer not found'
        );

        return;
    }

    console.log(
        'TEST PLAY: BEFORE RECT:',
        twitchContainer.getBoundingClientRect()
    );

    // ========================================================
    // СОХРАНЯЕМ ИСХОДНЫЕ СТИЛИ
    // ========================================================

    const oldPosition = twitchContainer.style.position;
    const oldLeft = twitchContainer.style.left;
    const oldTop = twitchContainer.style.top;
    const oldWidth = twitchContainer.style.width;
    const oldHeight = twitchContainer.style.height;

    // ========================================================
    // ВРЕМЕННО ПЕРЕМЕЩАЕМ ПЛЕЕР В VIEWPORT
    // ========================================================

    twitchContainer.style.position = 'fixed';

    twitchContainer.style.left = '0px';
    twitchContainer.style.top = '0px';

    twitchContainer.style.width = '640px';
    twitchContainer.style.height = '360px';

    console.log(
        'TEST PLAY: AFTER RECT:',
        twitchContainer.getBoundingClientRect()
    );

    // ========================================================
    // ЗАПУСК
    // ========================================================

    console.log(
        'TEST PLAY: calling player.play()',
        playerNum
    );

    info.player.play();

    // ========================================================
    // ВОЗВРАЩАЕМ ПЛЕЕР НАЗАД
    // ========================================================

    setTimeout(function() {

        twitchContainer.style.position = oldPosition;
        twitchContainer.style.left = oldLeft;
        twitchContainer.style.top = oldTop;
        twitchContainer.style.width = oldWidth;
        twitchContainer.style.height = oldHeight;

        console.log(
            'TEST PLAY: original position restored'
        );

    }, 1500);

};

// ============================================================
// ПЕРВОНАЧАЛЬНОЕ ОБНОВЛЕНИЕ
// ============================================================

updateTimerDisplays();