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
//     HTML5 <video>
//
// Кадровая модель:
//
//     frame          — номер текущего кадра
//     fps            — кадров в секунду
//     frameDuration  — длительность одного кадра
//     frameTime      — точное время текущего кадра
//     mediaTime      — фактическое время медиаплеера
//
// Основной принцип:
//
//     frame -> frame / FPS -> время
//
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
        isPlaying: false,

        duration: 0
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
        isPlaying: false,

        duration: 0
    }

};

// ============================================================
// ЛОКАЛЬНОЕ ВРЕМЯ
// ============================================================

let videoTime1 = 0;
let videoTime2 = 0;

let timersVisible = true;

// ============================================================
// РЕЗУЛЬТАТЫ ЗАЕЗДА
// ============================================================

let finishTime1 = null;
let finishTime2 = null;

let resultTime1 = null;
let resultTime2 = null;

// ============================================================
// ФОРМАТ ВРЕМЕНИ
// ============================================================

function formatHighResTime(totalSeconds) {

    if (!Number.isFinite(totalSeconds)) {
        totalSeconds = 0;
    }

    totalSeconds = Math.max(0, totalSeconds);

    const mins =
        Math.floor(totalSeconds / 60);

    const secs =
        Math.floor(totalSeconds % 60);

    const ms =
        Math.floor(
            (totalSeconds % 1) * 1000
        );

    const strMins =
        mins.toString().padStart(2, '0');

    const strSecs =
        secs.toString().padStart(2, '0');

    const strMs =
        ms.toString().padStart(3, '0');

    return `${strMins}:${strSecs}.${strMs}`;

}

// ============================================================
// ФОРМАТ ВРЕМЕНИ ДЛЯ MOD NOTE
// ------------------------------------------------------------
// 19.983
// 5:12.583
// 65:12.583
// ============================================================

function formatModNoteTime(totalSeconds) {

    if (!Number.isFinite(totalSeconds)) {
        totalSeconds = 0;
    }

    totalSeconds =
        Math.max(
            0,
            totalSeconds
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const seconds =
        totalSeconds % 60;


    if (minutes === 0) {

        return seconds
            .toFixed(3);

    }


    return (
        minutes +
        ":" +
        String(
            Math.floor(seconds)
        ).padStart(2, "0") +
        "." +
        String(
            Math.round(
                (seconds % 1) * 1000
            )
        ).padStart(3, "0")
    );
}

// ============================================================
// ОБНОВЛЕНИЕ MOD NOTE
// ============================================================

function updateModNote(videoNumber) {

    const element =
        document.getElementById(
            "mod-note-" + videoNumber
        );

    if (!element) {
        return;
    }


    const startTime =
        getStartTime(videoNumber);


    const endTime =
        videoNumber === 1
            ? finishTime1
            : finishTime2;


    const runTime =
        videoNumber === 1
            ? resultTime1
            : resultTime2;


    const fps =
        getFPS(videoNumber);


    element.textContent =
        "Mod Note: Start Time: " +
        formatModNoteTime(startTime) +
        ", End Time: " +
        formatModNoteTime(
            Number.isFinite(endTime)
                ? endTime
                : 0
        ) +
        ", Frame Rate: " +
        fps +
        ", Time: " +
        formatModNoteTime(
            Number.isFinite(runTime)
                ? runTime
                : 0
        );
}

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ
// ============================================================

function getVideoTime(playerNum) {

    return playerNum === 1
        ? videoTime1
        : videoTime2;

}

// ============================================================
// УСТАНОВКА ТЕКУЩЕГО ВРЕМЕНИ
// ============================================================

function setVideoTime(
    playerNum,
    time
) {

    if (!Number.isFinite(time)) {
        time = 0;
    }

    time = Math.max(0, time);

    if (playerNum === 1) {
        videoTime1 = time;
    }

    else {
        videoTime2 = time;
    }

}

// ============================================================
// ПОЛУЧЕНИЕ FPS
// ============================================================

function getFPS(playerNum) {

    const info =
        players[playerNum];

    if (
        info &&
        Number.isFinite(info.fps) &&
        info.fps > 0
    ) {

        return info.fps;

    }

    const input =
        document.getElementById(
            'fps' + playerNum
        );

    if (!input) {
        return 60;
    }

    const fps =
        parseFloat(input.value);

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {

        return 60;

    }

    return fps;

}

// ============================================================
// КАДР -> ВРЕМЯ
// ============================================================

function frameToTime(
    playerNum,
    frame
) {

    const info =
        players[playerNum];

    if (!info) {
        return 0;
    }

    const fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : getFPS(playerNum);

    return Math.max(
        0,
        Math.round(frame) / fps
    );

}

// ============================================================
// ВРЕМЯ -> КАДР
// ============================================================

function timeToFrame(
    playerNum,
    time
) {

    const fps =
        getFPS(playerNum);

    if (
        !Number.isFinite(time) ||
        time <= 0
    ) {

        return 0;

    }

    return Math.max(
        0,
        Math.round(time * fps)
    );

}

// ============================================================
// УСТАНОВКА КАДРА
// ============================================================

function setPlayerFrame(
    playerNum,
    frame,
    updateTimer = true
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    if (!Number.isFinite(frame)) {
        frame = 0;
    }

    frame =
        Math.max(
            0,
            Math.round(frame)
        );

    const fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : 60;

    info.fps =
        fps;

    info.frameDuration =
        1 / fps;

    info.frame =
        frame;

    info.frameTime =
        frame / fps;

    info.mediaTime =
        info.frameTime;

    setVideoTime(
        playerNum,
        info.frameTime
    );

    if (updateTimer) {
        updateTimerDisplays();
    }

}

// ============================================================
// ОБНОВЛЕНИЕ ТАЙМЕРОВ
// ============================================================

function updateTimerDisplays() {

    const timer1 =
        document.getElementById(
            'current-time-1'
        );

    const timer2 =
        document.getElementById(
            'current-time-2'
        );

    if (timer1) {

        timer1.innerText =
            formatHighResTime(
                videoTime1
            );

    }

    if (timer2) {

        timer2.innerText =
            formatHighResTime(
                videoTime2
            );

    }

    // Дублируем таймеры на плавающую панель
    // полноэкранного режима (theater-mode).
    const theaterTimer1 =
        document.getElementById(
            'theater-time-1'
        );

    const theaterTimer2 =
        document.getElementById(
            'theater-time-2'
        );

    if (theaterTimer1) {

        theaterTimer1.innerText =
            formatHighResTime(
                videoTime1
            );

    }

    if (theaterTimer2) {

        theaterTimer2.innerText =
            formatHighResTime(
                videoTime2
            );

    }

    updateSeekBars();

}

// ============================================================
// ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ
// ============================================================

function updateResultDisplays() {

    const result1 =
        document.getElementById(
            'result-display-1'
        );

    const result2 =
        document.getElementById(
            'result-display-2'
        );

    if (result1) {

        result1.innerText =
            Number.isFinite(resultTime1)
                ? formatHighResTime(resultTime1)
                : '--:--.---';

    }

    if (result2) {

        result2.innerText =
            Number.isFinite(resultTime2)
                ? formatHighResTime(resultTime2)
                : '--:--.---';

    }

}

// ============================================================
// ОБНОВЛЕНИЕ ВИДИМОГО ПОЛЯ "НАЧАЛО"
// ============================================================

function updateStartTimeDisplay(videoNumber) {

    const element =
        document.getElementById(
            'start-time-display-' +
            videoNumber
        );

    if (!element) {
        return;
    }

    element.innerText =
        formatHighResTime(
            getStartTime(videoNumber)
        );
        updateModNote(videoNumber);

}

// ============================================================
// ОБНОВЛЕНИЕ ВИДИМОГО ПОЛЯ "КОНЕЦ"
// ============================================================

function updateEndTimeDisplay(
    videoNumber,
    time
) {

    const element =
        document.getElementById(
            'end-time-display-' +
            videoNumber
        );

    if (!element) {
        return;
    }

    element.innerText =
        formatHighResTime(time);

}

// ============================================================
// ОБНОВЛЕНИЕ ВРЕМЕНИ МЕЖДУ НАЧАЛОМ И КОНЦОМ
// ============================================================

function updateTimeDifferenceDisplay(
    videoNumber,
    diff
) {

    const element =
        document.getElementById(
            'time-difference-' +
            videoNumber
        );

    if (!element) {
        return;
    }

    element.innerText =
        formatHighResTime(diff);

}

// ============================================================
// ФИКСАЦИЯ КОНЕЧНОЙ ТОЧКИ
// ============================================================

function setFinishTime(videoNumber) {

    let currentTime =
        getVideoTime(videoNumber);

    if (!Number.isFinite(currentTime)) {
        currentTime = 0;
    }

    const startTime =
        getStartTime(videoNumber);

    const elapsedTime =
        Math.max(
            0,
            currentTime - startTime
        );

    if (videoNumber === 1) {

        finishTime1 =
            currentTime;

        resultTime1 =
            elapsedTime;

    }

    else {

        finishTime2 =
            currentTime;

        resultTime2 =
            elapsedTime;

    }

    updateResultDisplays();

    updateEndTimeDisplay(
        videoNumber,
        currentTime
    );

    updateTimeDifferenceDisplay(
        videoNumber,
        elapsedTime
    );
    updateModNote(videoNumber);

    console.log(
        'Видео ' +
        videoNumber +
        ': начало =',
        formatHighResTime(startTime),
        'кадр =',
        players[videoNumber]
            ? players[videoNumber].frame
            : 0,
        'конец =',
        formatHighResTime(currentTime),
        'результат =',
        formatHighResTime(elapsedTime)
    );

}

// ============================================================
// КНОПКИ ФИНИША
// ============================================================

window.finishVideo1 =
    function() {

        setFinishTime(1);

    };

window.finishVideo2 =
    function() {

        setFinishTime(2);

    };

// ============================================================
// ОБНОВЛЕНИЕ ТАЙМЕРА ИЗ КАДРА
// ============================================================

function updateTimerFromFrame(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    setPlayerFrame(
        playerNum,
        info.frame
    );

}

// ============================================================
// ПОЛУЧЕНИЕ ОБЛАСТИ ШКАЛЫ
// ============================================================

function getSeekAreaElement(playerNum) {

    const player =
        document.getElementById(
            'player' + playerNum
        );

    if (!player) {
        return null;
    }

    const column =
        player.closest('.player-column');

    if (!column) {
        return null;
    }

    return column.querySelector(
        '.video-seek-area'
    );

}

// ============================================================
// ПОЛУЧЕНИЕ САМОЙ ШКАЛЫ
// ============================================================

function getSeekBarElement(playerNum) {

    const area =
        getSeekAreaElement(playerNum);

    if (!area) {
        return null;
    }

    return area.querySelector(
        '.seek-bar'
    );

}

// ============================================================
// ПОЛУЧЕНИЕ ИНДИКАТОРА ПРОГРЕССА
// ============================================================

function getSeekProgressElement(playerNum) {

    const area =
        getSeekAreaElement(playerNum);

    if (!area) {
        return null;
    }

    return area.querySelector(
        '.seek-progress'
    );

}

// ============================================================
// ПОЛУЧЕНИЕ ДЛИТЕЛЬНОСТИ
// ============================================================

function getVideoDuration(playerNum) {

    const info =
        players[playerNum];

    if (!info) {
        return 0;
    }

    if (
        info.type === 'local' &&
        info.video &&
        Number.isFinite(info.video.duration)
    ) {

        return info.video.duration;

    }

    if (
        Number.isFinite(info.duration) &&
        info.duration > 0
    ) {

        return info.duration;

    }

    return 0;

}

// ============================================================
// ОБНОВЛЕНИЕ ПОЛОЖЕНИЯ ШКАЛЫ
// ============================================================

function updateSeekBar(playerNum) {

    const bar =
        getSeekBarElement(playerNum);

    const progress =
        getSeekProgressElement(playerNum);

    if (!bar || !progress) {
        return;
    }

    const duration =
        getVideoDuration(playerNum);

    const currentTime =
        getVideoTime(playerNum);

    if (
        duration <= 0 ||
        !Number.isFinite(currentTime)
    ) {

        progress.style.width =
            '0%';

        return;

    }

    const ratio =
        Math.max(
            0,
            Math.min(
                1,
                currentTime / duration
            )
        );

    progress.style.width =
        (ratio * 100) + '%';

}

// ============================================================
// ОБНОВЛЕНИЕ ОБЕИХ ШКАЛ
// ============================================================

function updateSeekBars() {

    updateSeekBar(1);
    updateSeekBar(2);

}

// ============================================================
// КАЧЕСТВО ВИДЕО
// ------------------------------------------------------------
// Реальное переключение качества поддерживает только
// Twitch.Player (getQualities / setQuality / getQuality).
//
// У YouTube в текущей iframe API официально отключены
// getPlaybackQuality / setPlaybackQuality / getAvailableQualityLevels —
// вызовы ничего не делают, поэтому там мы просто показываем,
// что качество управляется автоматически самим YouTube.
//
// Для локального файла отдельных уровней качества нет —
// показываем фактическое разрешение самого видео.
// ============================================================

function getQualityDisplayElement(playerNum) {

    return document.getElementById(
        'quality-display-' + playerNum
    );

}

function getQualitySelectElement(playerNum) {

    return document.getElementById(
        'quality-select-' + playerNum
    );

}

// ============================================================
// ПОКАЗАТЬ ТЕКСТОВОЕ ЗНАЧЕНИЕ КАЧЕСТВА
// ============================================================

function updateQualityDisplay(
    playerNum,
    text,
    tooltip
) {

    const span =
        getQualityDisplayElement(playerNum);

    const select =
        getQualitySelectElement(playerNum);

    if (span) {

        span.textContent =
            text;

        span.title =
            tooltip || '';

        span.style.display =
            '';

    }

    if (select) {

        select.style.display =
            'none';

    }

}

// ============================================================
// СБРОС ИНДИКАТОРА КАЧЕСТВА
// ============================================================

function resetQualityUI(playerNum) {

    updateQualityDisplay(
        playerNum,
        '—',
        ''
    );

    const select =
        getQualitySelectElement(playerNum);

    if (select) {

        select.innerHTML =
            '';

    }

}

// ============================================================
// СПИСОК КАЧЕСТВ TWITCH
// ============================================================

// ============================================================
// ОПРЕДЕЛЕНИЕ FPS ПО ВЫБРАННОМУ КАЧЕСТВУ TWITCH
// ------------------------------------------------------------
// Каждый объект качества, который отдаёт getQualities(),
// содержит поле framerate (например, 1080p60 → 60,
// 720p30 → 30). Это официальные данные Twitch о самом
// потоке — используем их, чтобы не выставлять FPS вручную.
// ============================================================

function applyTwitchFramerateForGroup(
    playerNum,
    qualities,
    group
) {

    if (
        !Array.isArray(qualities) ||
        !qualities.length
    ) {

        return;

    }

    let match =
        qualities.find(
            function(quality) {

                return quality.group === group;

            }
        );

    if (!match) {

        match =
            qualities.find(
                function(quality) {

                    return quality.isDefault;

                }
            );

    }

    if (
        match &&
        Number.isFinite(match.framerate) &&
        match.framerate > 0
    ) {

        setPlayerFPS(
            playerNum,
            match.framerate,
            true
        );

    }

}

function populateTwitchQualitySelect(
    playerNum,
    twitchPlayer,
    attempt = 0
) {

    const select =
        getQualitySelectElement(playerNum);

    const span =
        getQualityDisplayElement(playerNum);

    if (!select) {
        return;
    }

    let qualities = [];

    try {

        qualities =
            twitchPlayer.getQualities() || [];

    }

    catch (error) {

        console.log(
            'Не удалось получить список качеств Twitch:',
            error
        );

    }

    // Сразу после READY Twitch иногда ещё не отдаёт список
    // качеств — пробуем ещё раз чуть позже, но не бесконечно.
    if (
        !qualities.length &&
        attempt < 5
    ) {

        setTimeout(
            function() {

                const current =
                    players[playerNum];

                if (
                    current &&
                    current.player === twitchPlayer
                ) {

                    populateTwitchQualitySelect(
                        playerNum,
                        twitchPlayer,
                        attempt + 1
                    );

                }

            },
            600
        );

        return;

    }

    if (!qualities.length) {

        updateQualityDisplay(
            playerNum,
            'Auto (Twitch)',
            ''
        );

        return;

    }

    const playerInfo =
        players[playerNum];

    if (playerInfo) {

        // Сохраняем список — понадобится, когда пользователь
        // сам переключит качество в setTwitchQuality().
        playerInfo.twitchQualities =
            qualities;

    }

    select.innerHTML =
        '';

    qualities.forEach(
        function(quality) {

            const option =
                document.createElement('option');

            option.value =
                quality.group;

            option.textContent =
                quality.name;

            select.appendChild(
                option
            );

        }
    );

    let current = '';

    try {

        current =
            twitchPlayer.getQuality();

    }

    catch (error) {

        console.log(
            'Не удалось получить текущее качество Twitch:',
            error
        );

    }

    if (current) {

        select.value =
            current;

    }

    select.style.display =
        '';

    if (span) {

        span.style.display =
            'none';

    }

    applyTwitchFramerateForGroup(
        playerNum,
        qualities,
        current
    );

}



// ============================================================
// СМЕНА КАЧЕСТВА TWITCH ПОЛЬЗОВАТЕЛЕМ
// ============================================================

function setTwitchQuality(
    playerNum,
    group
) {

    const info =
        players[playerNum];

    if (
        !info ||
        !info.player ||
        typeof info.player.setQuality !== 'function'
    ) {

        return;

    }

    try {

        info.player.setQuality(
            group
        );

    }

    catch (error) {

        console.log(
            'Не удалось изменить качество Twitch:',
            error
        );

    }

    // У выбранного вручную качества тоже есть свой framerate —
    // подтягиваем FPS вместе со сменой качества.
    applyTwitchFramerateForGroup(
        playerNum,
        info.twitchQualities,
        group
    );

}

// ============================================================
// ПЕРЕМЕЩЕНИЕ ПО ШКАЛЕ
// ============================================================

function seekPlayerByRatio(
    playerNum,
    ratio
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    const duration =
        getVideoDuration(playerNum);

    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {

        console.log(
            'Шкала: неизвестна длительность видео',
            playerNum
        );

        return;
    }

    ratio =
        Math.max(
            0,
            Math.min(
                1,
                ratio
            )
        );

    const targetTime =
        ratio * duration;

    const frame =
        Math.round(
            targetTime * info.fps
        );

    const maxFrame =
        Math.max(
            0,
            Math.floor(
                duration * info.fps
            )
        );

    const targetFrame =
        Math.min(
            frame,
            maxFrame
        );

    console.log(
        'Шкала:',
        'player =',
        playerNum,
        'ratio =',
        ratio,
        'time =',
        targetTime,
        'frame =',
        targetFrame
    );

    setPlayerFrame(
        playerNum,
        targetFrame,
        false
    );

    seekVideo(
        playerNum,
        targetFrame / info.fps
    );

    updateTimerDisplays();
}

// ============================================================
// ПОЛУЧЕНИЕ ПОЗИЦИИ МЫШИ
// ============================================================

function getSeekRatio(
    playerNum,
    event
) {

    const bar =
        getSeekBarElement(playerNum);

    if (!bar) {

        console.log(
            'Шкала не найдена:',
            playerNum
        );

        return null;
    }

    const rect =
        bar.getBoundingClientRect();

    if (
        rect.width <= 0
    ) {

        console.log(
            'Ширина шкалы равна 0:',
            playerNum
        );

        return null;
    }

    let ratio =
        (
            event.clientX -
            rect.left
        ) /
        rect.width;

    ratio =
        Math.max(
            0,
            Math.min(
                1,
                ratio
            )
        );

    return ratio;
}

// ============================================================
// ПЕРЕМЕЩЕНИЕ ПО ШКАЛЕ
// ============================================================

function seekPlayerByMouse(
    playerNum,
    event
) {

    const ratio =
        getSeekRatio(
            playerNum,
            event
        );

    if (ratio === null) {
        return;
    }

    seekPlayerByRatio(
        playerNum,
        ratio
    );
}

// ============================================================
// НАСТРОЙКА МЫШИ ДЛЯ ШКАЛЫ
// ============================================================

function setupSeekMouse(
    playerNum
) {

    const bar =
        getSeekBarElement(playerNum);

    if (!bar) {

        console.log(
            'Не удалось подключить мышь к шкале:',
            playerNum
        );

        return;
    }

    if (
        bar.dataset.seekMouseReady === 'true'
    ) {

        return;
    }

    bar.dataset.seekMouseReady =
        'true';

    let dragging =
        false;

    // --------------------------------------------------------
    // НАЖАТИЕ ЛКМ
    // --------------------------------------------------------

    bar.addEventListener(
        'mousedown',
        function(event) {

            if (
                event.button !== 0
            ) {

                return;
            }

            dragging =
                true;

            seekPlayerByMouse(
                playerNum,
                event
            );

            event.preventDefault();
            event.stopPropagation();

        }
    );

    // --------------------------------------------------------
    // ДВИЖЕНИЕ МЫШИ
    // --------------------------------------------------------

    document.addEventListener(
        'mousemove',
        function(event) {

            if (!dragging) {
                return;
            }

            seekPlayerByMouse(
                playerNum,
                event
            );

        }
    );

    // --------------------------------------------------------
    // ОТПУСКАНИЕ ЛКМ
    // --------------------------------------------------------

    document.addEventListener(
        'mouseup',
        function(event) {

            if (
                event.button === 0
            ) {

                dragging =
                    false;

            }

        }
    );

    // --------------------------------------------------------
    // ЗАЩИТА ОТ ПОТЕРИ MOUSEUP
    // --------------------------------------------------------

    window.addEventListener(
        'blur',
        function() {

            dragging =
                false;

        }
    );

}

// ============================================================
// НАСТРОЙКА МЫШИ ДЛЯ ОБЕИХ ШКАЛ
// ============================================================

function setupSeekMouseControls() {

    setupSeekMouse(1);
    setupSeekMouse(2);

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
            ) &&
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
            ) &&
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
// ОПРЕДЕЛЕНИЕ TWITCH
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
// ОПРЕДЕЛЕНИЕ ИСТОЧНИКА
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

                    if (
                        !Number.isFinite(value)
                    ) {

                        this.value = '';

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

                    this.value =
                        value;

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

                    if (
                        !Number.isFinite(value)
                    ) {

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

                    this.value =
                        value;

                }
            );

        }
    );

}

// ============================================================
// НАЧАЛЬНОЕ ВРЕМЯ
// ============================================================

function getStartTime(playerNum) {

    const hoursInput =
        document.getElementById(
            'hour' + playerNum
        );

    const minutesInput =
        document.getElementById(
            'min' + playerNum
        );

    const secondsInput =
        document.getElementById(
            'sec' + playerNum
        );

    const millisecondsInput =
        document.getElementById(
            'cs' + playerNum
        );

    const hours =
        hoursInput
            ? parseInt(hoursInput.value, 10) || 0
            : 0;

    const minutes =
        minutesInput
            ? parseInt(minutesInput.value, 10) || 0
            : 0;

    const seconds =
        secondsInput
            ? parseInt(secondsInput.value, 10) || 0
            : 0;

    const milliseconds =
        millisecondsInput
            ? parseInt(millisecondsInput.value, 10) || 0
            : 0;

    return (
        hours * 3600 +
        minutes * 60 +
        seconds +
        milliseconds / 1000
    );

}

// ============================================================
// УСТАНОВКА FPS
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

    const oldTime =
        getVideoTime(playerNum);

    info.fps =
        fps;

    info.frameDuration =
        1 / fps;

    info.frame =
        Math.max(
            0,
            Math.round(
                oldTime * fps
            )
        );

    info.frameTime =
        info.frame / fps;

    info.mediaTime =
        info.frameTime;

    setVideoTime(
        playerNum,
        info.frameTime
    );

    const input =
        document.getElementById(
            'fps' + playerNum
        );

    if (input) {

        input.value =
            Number.isInteger(fps)
                ? fps
                : fps.toFixed(2);

        input.disabled =
            false;

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

    updateTimerDisplays();

}

// ============================================================
// ПРИМЕНИТЬ FPS
// ============================================================

window.refreshFPS =
    function(playerNum) {

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

        setPlayerFPS(
            playerNum,
            fps,
            false
        );

    };

// ============================================================
// АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ FPS
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

        if (average > 0) {

            const detectedFPS =
                1 / average;

            const roundedFPS =
                Math.abs(
                    detectedFPS -
                    Math.round(detectedFPS)
                ) < 0.15
                    ? Math.round(detectedFPS)
                    : Number(
                        detectedFPS.toFixed(2)
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
// ОСТАНОВКА ПЛЕЕРА
// ============================================================

function destroyPlayer(playerNum) {

    stopFrameTimer(playerNum);
    stopYouTubeTimer(playerNum);

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
        isPlaying: false,

        duration: 0

    };

    resetQualityUI(
        playerNum
    );

    // После смены плеера повторно подключаем мышь
    // к новой .seek-bar, если она уже существует.
    setTimeout(
        function() {

            setupSeekMouseControls();
            updateSeekBars();

        },
        0
    );

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

    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(
            function(element) {
                element.remove();
            }
        );

    const video =
        document.createElement('video');

    video.id =
        'local-video-' + playerNum;

    video.controls =
        true;

    video.preload =
        'auto';

    video.playsInline =
        true;

    video.style.width =
        '100%';

    video.style.height =
        '100%';

    video.style.display =
        'block';

    video.style.objectFit =
        'contain';

    const objectUrl =
        URL.createObjectURL(file);

    video.src =
        objectUrl;

    container.appendChild(
        video
    );

    players[playerNum] = {

        type: 'local',

        player: null,
        iframe: null,
        video: video,

        fps: getFPS(playerNum),
        frameDuration:
            1 / getFPS(playerNum),

        frame: 0,
        mediaTime: 0,
        frameTime: 0,

        twitchReady: false,
        pendingPlay: false,
        isPlaying: false,

        duration: 0

    };

    video.addEventListener(
        'loadedmetadata',
        function() {

            const info =
                players[playerNum];

            if (!info) {
                return;
            }

            let time =
                Number.isFinite(startTime)
                    ? startTime
                    : 0;

            if (
                Number.isFinite(video.duration)
            ) {

                info.duration =
                    video.duration;

                time =
                    Math.min(
                        time,
                        video.duration
                    );

            }

            const frame =
                Math.round(
                    time * info.fps
                );

            const frameTime =
                frame /
                info.fps;

            try {

                video.currentTime =
                    frameTime;

            }

            catch (error) {

                console.log(
                    'Ошибка установки времени:',
                    error
                );

            }

            info.mediaTime =
                frameTime;

            info.frame =
                frame;

            info.frameTime =
                frameTime;

            setVideoTime(
                playerNum,
                frameTime
            );

            updateTimerDisplays();

            setupSeekMouseControls();

            updateSeekBars();

            detectLocalVideoFPS(
                playerNum,
                video
            );

            // У локального файла нет уровней качества —
            // показываем реальное разрешение видео.
            if (
                video.videoWidth &&
                video.videoHeight
            ) {

                updateQualityDisplay(
                    playerNum,
                    video.videoWidth + '×' + video.videoHeight,
                    'Разрешение локального файла'
                );

            }

        }
    );

    video.addEventListener(
        'durationchange',
        function() {

            if (
                Number.isFinite(
                    video.duration
                )
            ) {

                players[playerNum].duration =
                    video.duration;

                updateSeekBars();

            }

        }
    );

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

    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(
            function(element) {
                element.remove();
            }
        );

    const iframe =
        document.createElement('iframe');

    iframe.id =
        'yt-iframe-' + playerNum;

    const fps =
        getFPS(playerNum);

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

    container.appendChild(
        iframe
    );

    const startFrame =
        Math.round(
            startTime * fps
        );

    const startFrameTime =
        startFrame /
        fps;

    players[playerNum] = {

        type: 'youtube',

        player: null,
        iframe: iframe,
        video: null,

        fps: fps,
        frameDuration:
            1 / fps,

        frame:
            startFrame,

        mediaTime:
            startFrameTime,

        frameTime:
            startFrameTime,

        twitchReady: false,
        pendingPlay: false,
        isPlaying: false,

        duration: 0

    };

    // YouTube официально отключил getPlaybackQuality /
    // setPlaybackQuality / getAvailableQualityLevels — эти
    // вызовы больше ничего не делают. Честно показываем,
    // что качеством управляет сам YouTube, без селектора.
    updateQualityDisplay(
        playerNum,
        'Auto (YouTube)',
        'YouTube больше не позволяет читать или менять качество через API — регулируется самим плеером'
    );

    iframe.onload =
        function() {

            // Без этого сообщения YouTube никогда не начнёт
            // присылать события 'infoDelivery' с currentTime
            // и duration — шкала не сможет узнать длительность.
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    event: 'listening',
                    id: iframe.id
                }),
                '*'
            );

            setTimeout(
                function() {

                    sendYouTubeCommand(
                        playerNum,
                        'seekTo',
                        [
                            startFrameTime,
                            true
                        ]
                    );

                    sendYouTubeCommand(
                        playerNum,
                        'pauseVideo'
                    );

                    sendYouTubeCommand(
                        playerNum,
                        'getDuration'
                    );

                    setupSeekMouseControls();
                    updateSeekBars();

                    // YouTube официально отключил ручное
                    // переключение качества в iframe API —
                    // setPlaybackQuality больше ни на что не влияет,
                    // качество всегда подбирается автоматически.
                    updateQualityDisplay(
                        playerNum,
                        'Auto (YouTube)',
                        'YouTube больше не позволяет менять качество через встроенный плеер — оно выбирается автоматически'
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

    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            'iframe, video, [id^="twitch-player-"]'
        )
        .forEach(
            function(element) {
                element.remove();
            }
        );

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

    const fps =
        getFPS(playerNum);

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

    const startFrame =
        Math.round(
            startTime * fps
        );

    const startFrameTime =
        startFrame /
        fps;

    players[playerNum] = {

        type:
            twitchInfo.type,

        player:
            twitchPlayer,

        iframe:
            null,

        video:
            null,

        fps:
            fps,

        frameDuration:
            1 / fps,

        frame:
            startFrame,

        mediaTime:
            startFrameTime,

        frameTime:
            startFrameTime,

        twitchReady:
            false,

        twitchQualities:
            [],

        pendingPlay:
            false,

        isPlaying:
            false,

        duration:
            0

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

            // Twitch.Player отдаёт длительность синхронно,
            // но без этого вызова info.duration так и
            // остаётся равным 0, и шкала не может работать.
            try {

                const twitchDuration =
                    twitchPlayer.getDuration();

                if (
                    Number.isFinite(twitchDuration) &&
                    twitchDuration > 0
                ) {

                    info.duration =
                        twitchDuration;

                }

            }

            catch (error) {

                console.log(
                    'Не удалось получить длительность Twitch:',
                    error
                );

            }

            if (
                twitchInfo.type === 'twitch-vod'
            ) {

                if (startFrameTime > 0) {

                    try {

                        twitchPlayer.seek(
                            startFrameTime
                        );

                    }

                    catch (error) {

                        console.log(
                            'Ошибка Twitch seek:',
                            error
                        );

                    }

                }

            }

            setupSeekMouseControls();
            updateSeekBars();

            populateTwitchQualitySelect(
                playerNum,
                twitchPlayer
            );

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
                            current.player ===
                                twitchPlayer &&
                            current.twitchReady
                        ) {

                            current.player.play();

                            current.isPlaying =
                                true;

                            startExternalFrameTimer(
                                playerNum
                            );

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
// ЗАГРУЗКА ЛОКАЛЬНОГО ВИДЕО
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

    if (playerNum === 1) {

        finishTime1 = null;
        resultTime1 = null;

    }

    else {

        finishTime2 = null;
        resultTime2 = null;

    }

    updateResultDisplays();

    destroyPlayer(playerNum);

    setVideoTime(
        playerNum,
        startTime
    );

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

        if (!input) {
            return;
        }

        const value =
            input.value.trim();

        if (!value) {

            const fileInput =
                document.getElementById(
                    'local-file-' +
                    playerNum
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

            finishTime1 = null;
            resultTime1 = null;

        }

        else {

            finishTime2 = null;
            resultTime2 = null;

        }

        updateResultDisplays();

        setVideoTime(
            playerNum,
            startTime
        );

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

        }

    };

// ============================================================
// ОБРАБОТЧИК ЛОКАЛЬНОГО ФАЙЛА
// ============================================================

window.handleLocalFile =
    function(
        playerNum,
        input
    ) {

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

            event:
                'command',

            func:
                funcName,

            args:
                argsArray

        });

    info.iframe.contentWindow.postMessage(
        message,
        '*'
    );

}

// ============================================================
// ПОЛУЧЕНИЕ ВРЕМЕНИ YOUTUBE
// ============================================================

function requestYouTubeCurrentTime(
    playerNum
) {

    const info =
        players[playerNum];

    if (
        !info ||
        info.type !== 'youtube' ||
        !info.iframe
    ) {

        return;

    }

    sendYouTubeCommand(
        playerNum,
        'getCurrentTime'
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

            if (
                event.source !==
                info.iframe.contentWindow
            ) {

                continue;

            }

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

                }

                if (
                    Number.isFinite(
                        data.info.duration
                    )
                ) {

                    info.duration =
                        data.info.duration;

                }

                if (
                    Number.isFinite(
                        info.mediaTime
                    ) &&
                    !info.isPlaying
                ) {

                    setPlayerFrame(
                        playerNum,
                        timeToFrame(
                            playerNum,
                            info.mediaTime
                        ),
                        false
                    );

                }

                updateTimerDisplays();

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

        syncFramePosition(
            playerNum
        );

        const promise =
            info.video.play();

        info.isPlaying =
            true;

        startLocalFrameTimer(
            playerNum
        );

        if (
            promise &&
            typeof promise.catch ===
                'function'
        ) {

            promise.catch(
                function(error) {

                    info.isPlaying =
                        false;

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

        syncFramePosition(
            playerNum
        );

        sendYouTubeCommand(
            playerNum,
            'playVideo'
        );

        info.isPlaying =
            true;

        startYouTubeTimer(
            playerNum
        );

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

        if (info.duration <= 0) {

            try {

                const twitchDuration =
                    info.player.getDuration();

                if (
                    Number.isFinite(twitchDuration) &&
                    twitchDuration > 0
                ) {

                    info.duration =
                        twitchDuration;

                }

            }

            catch (error) {

                console.log(
                    'Не удалось получить длительность Twitch:',
                    error
                );

            }

        }

        syncFramePosition(
            playerNum
        );

        info.player.play();

        info.isPlaying =
            true;

        startExternalFrameTimer(
            playerNum
        );

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

    stopFrameTimer(playerNum);
    stopYouTubeTimer(playerNum);

    if (
        info.type === 'local'
    ) {

        if (info.video) {

            if (
                Number.isFinite(
                    info.video.currentTime
                )
            ) {

                info.mediaTime =
                    info.video.currentTime;

                setPlayerFrame(
                    playerNum,
                    timeToFrame(
                        playerNum,
                        info.mediaTime
                    ),
                    false
                );

            }

            info.video.pause();

        }

        info.isPlaying =
            false;

        updateTimerDisplays();

        return;

    }

    if (
        info.type === 'youtube'
    ) {

        sendYouTubeCommand(
            playerNum,
            'pauseVideo'
        );

        info.isPlaying =
            false;

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

        info.isPlaying =
            false;

    }

}

// ============================================================
// ПЕРЕМОТКА
// ============================================================

function seekVideo(
    playerNum,
    time
) {

    if (!Number.isFinite(time)) {
        time = 0;
    }

    time =
        Math.max(
            0,
            time
        );

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    const frame =
        timeToFrame(
            playerNum,
            time
        );

    const frameTime =
        frameToTime(
            playerNum,
            frame
        );

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

                    const maxFrame =
                        Math.floor(
                            info.video.duration *
                            info.fps
                        );

                    const limitedFrame =
                        Math.min(
                            frame,
                            maxFrame
                        );

                    setPlayerFrame(
                        playerNum,
                        limitedFrame,
                        false
                    );

                }

                else {

                    setPlayerFrame(
                        playerNum,
                        frame,
                        false
                    );

                }

                info.video.currentTime =
                    info.frameTime;

            }

            catch (error) {

                console.log(
                    'Ошибка перемотки локального видео:',
                    error
                );

            }

        }

        updateTimerDisplays();

        return;

    }

    if (
        info.type === 'youtube'
    ) {

        stopYouTubeTimer(
            playerNum
        );

        setPlayerFrame(
            playerNum,
            frame,
            false
        );

        sendYouTubeCommand(
            playerNum,
            'seekTo',
            [
                frameTime,
                true
            ]
        );

        updateTimerDisplays();

        if (info.isPlaying) {

            startYouTubeTimer(
                playerNum
            );

        }

        return;

    }

    if (
        info.type === 'twitch-vod'
    ) {

        stopFrameTimer(
            playerNum
        );

        setPlayerFrame(
            playerNum,
            frame,
            false
        );

        if (info.player) {

            try {

                info.player.seek(
                    frameTime
                );

            }

            catch (error) {

                console.log(
                    'Ошибка Twitch seek:',
                    error
                );

            }

        }

        updateTimerDisplays();

        if (info.isPlaying) {

            startExternalFrameTimer(
                playerNum
            );

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
// КАДРОВЫЕ ТАЙМЕРЫ
// ============================================================

let frameTimerHandles = {

    1: null,
    2: null

};

let youtubeTimerHandles = {

    1: null,
    2: null

};

// ============================================================
// ОСТАНОВКА КАДРОВОГО ТАЙМЕРА
// ============================================================

function stopFrameTimer(
    playerNum
) {

    const handle =
        frameTimerHandles[playerNum];

    if (handle !== null) {

        clearTimeout(handle);

        frameTimerHandles[playerNum] =
            null;

    }

}

// ============================================================
// ОСТАНОВКА YOUTUBE ТАЙМЕРА
// ============================================================

function stopYouTubeTimer(
    playerNum
) {

    const handle =
        youtubeTimerHandles[playerNum];

    if (handle !== null) {

        clearInterval(handle);

        youtubeTimerHandles[playerNum] =
            null;

    }

}

// ============================================================
// YOUTUBE КАДРОВОЙ ТАЙМЕР
// ============================================================

function startYouTubeTimer(
    playerNum
) {

    const info =
        players[playerNum];

    if (
        !info ||
        info.type !== 'youtube'
    ) {

        return;

    }

    stopYouTubeTimer(
        playerNum
    );

    let lastClock =
        performance.now();

    let accumulatedTime =
        0;

    let currentFrame =
        Number.isFinite(info.frame)
            ? info.frame
            : 0;

    function update() {

        const current =
            players[playerNum];

        if (
            !current ||
            current.type !== 'youtube'
        ) {

            stopYouTubeTimer(
                playerNum
            );

            return;

        }

        if (!current.isPlaying) {

            stopYouTubeTimer(
                playerNum
            );

            return;

        }

        const now =
            performance.now();

        const delta =
            Math.max(
                0,
                (now - lastClock) / 1000
            );

        lastClock =
            now;

        accumulatedTime +=
            delta;

        const framesPassed =
            Math.floor(
                accumulatedTime *
                current.fps
            );

        if (framesPassed > 0) {

            accumulatedTime -=
                framesPassed /
                current.fps;

            currentFrame +=
                framesPassed;

        }

        if (
            current.duration > 0
        ) {

            const maxFrame =
                Math.floor(
                    current.duration *
                    current.fps
                );

            currentFrame =
                Math.min(
                    currentFrame,
                    maxFrame
                );

        }

        setPlayerFrame(
            playerNum,
            currentFrame
        );

    }

    youtubeTimerHandles[playerNum] =
        setInterval(
            update,
            5
        );

    update();

}

// ============================================================
// TWITCH / EXTERNAL КАДРОВОЙ ТАЙМЕР
// ============================================================

function startExternalFrameTimer(
    playerNum
) {

    const info =
        players[playerNum];

    if (!info) {
        return;
    }

    stopFrameTimer(
        playerNum
    );

    let lastClock =
        performance.now();

    let accumulatedTime =
        0;

    let currentFrame =
        Number.isFinite(info.frame)
            ? info.frame
            : 0;

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

        const now =
            performance.now();

        const delta =
            Math.max(
                0,
                (now - lastClock) / 1000
            );

        lastClock =
            now;

        accumulatedTime +=
            delta;

        const framesPassed =
            Math.floor(
                accumulatedTime *
                current.fps
            );

        if (framesPassed > 0) {

            accumulatedTime -=
                framesPassed /
                current.fps;

            currentFrame +=
                framesPassed;

        }

        if (
            current.duration > 0
        ) {

            const maxFrame =
                Math.floor(
                    current.duration *
                    current.fps
                );

            currentFrame =
                Math.min(
                    currentFrame,
                    maxFrame
                );

        }

        setPlayerFrame(
            playerNum,
            currentFrame
        );

        frameTimerHandles[playerNum] =
            setTimeout(
                nextFrame,
                Math.max(
                    1,
                    current.frameDuration *
                    1000
                )
            );

    }

    nextFrame();

}

// ============================================================
// ЛОКАЛЬНЫЙ VIDEO FRAME CALLBACK
// ============================================================

function startLocalFrameTimer(
    playerNum
) {

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

        if (
            metadata &&
            Number.isFinite(
                metadata.mediaTime
            )
        ) {

            const mediaTime =
                metadata.mediaTime;

            const frame =
                Math.max(
                    0,
                    Math.round(
                        mediaTime *
                        current.fps
                    )
                );

            setPlayerFrame(
                playerNum,
                frame
            );

        }

        video.requestVideoFrameCallback(
            onVideoFrame
        );

    }

    video.requestVideoFrameCallback(
        onVideoFrame
    );

}

// ============================================================
// СИНХРОНИЗАЦИЯ КАДРА
// ============================================================

function syncFramePosition(
    playerNum
) {

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

    info.fps =
        fps;

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

        time =
            getVideoTime(playerNum);

    }

    const frame =
        Math.max(
            0,
            Math.round(
                time *
                fps
            )
        );

    setPlayerFrame(
        playerNum,
        frame
    );

}

// ============================================================
// ЗАПУСК КАДРОВЫХ ТАЙМЕРОВ
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

function waitForTwitchPlaying(
    playerNum
) {

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

                    resolve(
                        !!(
                            current &&
                            current.twitchReady
                        )
                    );

                },
                15000
            );

        }
    );

}

// ============================================================
// ОСТАНОВКА ОДНОГО ВИДЕО (ПАУЗА + ВОЗВРАТ К НАЧАЛУ)
// ============================================================

function stopVideoPlayer(playerNum) {

    pauseVideo(playerNum);

    stopFrameTimer(playerNum);
    stopYouTubeTimer(playerNum);

    const start =
        getStartTime(playerNum);

    const info =
        players[playerNum];

    if (info) {

        const frame =
            Math.round(
                start * info.fps
            );

        setPlayerFrame(
            playerNum,
            frame,
            false
        );

    }

    updateTimerDisplays();

    seekVideo(
        playerNum,
        getVideoTime(playerNum)
    );

}

// ============================================================
// ЛОКАЛЬНОЕ УПРАВЛЕНИЕ ВИДЕО 1
// ============================================================

window.playVideo1 =
    function() {

        playVideo(1);

    };

window.pauseVideo1 =
    function() {

        pauseVideo(1);

        stopFrameTimer(1);
        stopYouTubeTimer(1);

    };

window.stopVideo1 =
    function() {

        stopVideoPlayer(1);

    };

// ============================================================
// ЛОКАЛЬНОЕ УПРАВЛЕНИЕ ВИДЕО 2
// ============================================================

window.playVideo2 =
    function() {

        playVideo(2);

    };

window.pauseVideo2 =
    function() {

        pauseVideo(2);

        stopFrameTimer(2);
        stopYouTubeTimer(2);

    };

window.stopVideo2 =
    function() {

        stopVideoPlayer(2);

    };

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

        const info1 =
            players[1];

        const info2 =
            players[2];

        if (info1) {

            const frame1 =
                Math.round(
                    start1 *
                    info1.fps
                );

            setPlayerFrame(
                1,
                frame1,
                false
            );

        }

        if (info2) {

            const frame2 =
                Math.round(
                    start2 *
                    info2.fps
                );

            setPlayerFrame(
                2,
                frame2,
                false
            );

        }

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

function seekPlayerByFrames(
    playerNum,
    frameDelta
) {

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

    info.fps =
        fps;

    info.frameDuration =
        1 / fps;

    let currentFrame;

    if (
        info.type === 'local' &&
        info.video
    ) {

        currentFrame =
            Math.round(
                info.video.currentTime *
                fps
            );

    }

    else {

        currentFrame =
            Number.isFinite(info.frame)
                ? info.frame
                : timeToFrame(
                    playerNum,
                    getVideoTime(playerNum)
                );

    }

    const newFrame =
        Math.max(
            0,
            Math.round(
                currentFrame +
                frameDelta
            )
        );

    setPlayerFrame(
        playerNum,
        newFrame
    );

    seekVideo(
        playerNum,
        info.frameTime
    );

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

    const fps =
        Number.isFinite(info.fps) &&
        info.fps > 0
            ? info.fps
            : getFPS(playerNum);

    const frameDelta =
        Math.round(
            seconds *
            fps
        );

    seekPlayerByFrames(
        playerNum,
        frameDelta
    );

}

// ============================================================
// СИНХРОННАЯ ПЕРЕМОТКА НА СЕКУНДЫ
// ============================================================

window.syncSeekBySeconds =
    function(seconds) {

        seekPlayerBySeconds(1, seconds);
        seekPlayerBySeconds(2, seconds);

    };

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
// ПОЛНОЭКРАННЫЙ РЕЖИМ ДВУХ ЗАБЕГОВ (THEATER MODE)
// ------------------------------------------------------------
// Кнопка в углу переключает body.theater-mode, который
// через CSS растягивает оба плеера на весь экран и прячет
// всё лишнее, оставляя только таймеры и плавающую панель
// с play/pause/stop/±10с (те же самые общие sync-функции).
//
// Дополнительно пробуем включить настоящий Fullscreen API —
// если браузер/страница это запрещает (например, из-за
// Permissions Policy), просто остаёмся в CSS-полноэкранном
// режиме, который работает всегда.
// ============================================================

let theaterModeActive = false;

function setTheaterToggleButton(active) {

    const btn =
        document.getElementById(
            'btn-theater-mode'
        );

    if (!btn) {
        return;
    }

    btn.textContent =
        active ? '✕' : '⛶';

    btn.title =
        active
            ? 'Выйти из полноэкранного режима'
            : 'Полноэкранный просмотр двух забегов';

}

window.toggleTheaterMode =
    function() {

        theaterModeActive =
            !theaterModeActive;

        document.body.classList.toggle(
            'theater-mode',
            theaterModeActive
        );

        setTheaterToggleButton(
            theaterModeActive
        );

        // Разворачиваем в fullscreen весь документ (<html>),
        // а не только .compare-layout — иначе браузер прячет
        // кнопку и плавающую панель, так как они лежат
        // вне фуллскрин-элемента и его поддерева.
        const fullscreenTarget =
            document.documentElement;

        if (theaterModeActive) {

            if (
                fullscreenTarget &&
                fullscreenTarget.requestFullscreen
            ) {

                fullscreenTarget
                    .requestFullscreen()
                    .catch(
                        function(error) {

                            console.log(
                                'Полноэкранный режим (API) недоступен, остаёмся в CSS-режиме:',
                                error
                            );

                        }
                    );

            }

        }

        else {

            if (
                document.fullscreenElement &&
                document.exitFullscreen
            ) {

                document
                    .exitFullscreen()
                    .catch(
                        function(error) {

                            console.log(
                                'Не удалось выйти из полноэкранного режима:',
                                error
                            );

                        }
                    );

            }

        }

        updateTimerDisplays();

    };

// ============================================================
// ПЕРЕКЛЮЧЕНИЕ ВИДА: ОБА ВИДЕО / ТОЛЬКО ОДНО
// ------------------------------------------------------------
// Кнопка в левом верхнем углу циклически переключает:
// оба видео -> только Видео 1 -> только Видео 2 -> оба видео.
// Удобно, когда нужно смотреть и считать только один забег.
// Работает и в обычном режиме, и в theater-mode.
// ============================================================

let singleViewState = 0; // 0 = оба видео, 1 = только Видео 1, 2 = только Видео 2

function setViewToggleButton() {

    const btn =
        document.getElementById(
            'btn-view-toggle'
        );

    if (!btn) {
        return;
    }

    if (singleViewState === 0) {

        btn.textContent = '1';

        btn.title =
            'Показать только Видео 1';

    }

    else if (singleViewState === 1) {

        btn.textContent = '2';

        btn.title =
            'Показать только Видео 2';

    }

    else {

        btn.textContent = '⊞';

        btn.title =
            'Показать оба видео';

    }

}

window.toggleSingleView =
    function() {

        singleViewState =
            (singleViewState + 1) % 3;

        const grid =
            document.getElementById(
                'video-grid'
            );

        const column1 =
            document.querySelector(
                '.player-column-1'
            );

        const column2 =
            document.querySelector(
                '.player-column-2'
            );

        if (!grid || !column1 || !column2) {
            return;
        }

        grid.classList.toggle(
            'single-view',
            singleViewState !== 0
        );

        column1.classList.toggle(
            'active-single',
            singleViewState === 1
        );

        column2.classList.toggle(
            'active-single',
            singleViewState === 2
        );

        setViewToggleButton();

    };

// Если пользователь вышел из настоящего fullscreen
// клавишей Esc, синхронизируем состояние кнопки и режима.
document.addEventListener(
    'fullscreenchange',
    function() {

        if (
            !document.fullscreenElement &&
            theaterModeActive
        ) {

            theaterModeActive =
                false;

            document.body.classList.remove(
                'theater-mode'
            );

            setTheaterToggleButton(
                false
            );

        }

    }
);

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

            if (timer1) {
                timer1.style.display =
                    'none';
            }

            if (timer2) {
                timer2.style.display =
                    'none';
            }

            if (btn) {

                btn.style.background =
                    '#424242';

            }

            timersVisible =
                false;

        }

        else {

            if (timer1) {

                timer1.style.display =
                    'table';

            }

            if (timer2) {

                timer2.style.display =
                    'table';

            }

            if (btn) {

                btn.style.background =
                    '#00796b';

            }

            timersVisible =
                true;

        }

    };

// ============================================================
// СБРОС НАЧАЛЬНОГО ВРЕМЕНИ
// ============================================================

function resetStartTime(
    videoNumber
) {

    document.getElementById(
        `hour${videoNumber}`
    ).value = 0;

    document.getElementById(
        `min${videoNumber}`
    ).value = 0;

    document.getElementById(
        `sec${videoNumber}`
    ).value = 0;

    document.getElementById(
        `cs${videoNumber}`
    ).value = 0;

    updateStartTimeDisplay(
        videoNumber
    );

}

// ============================================================
// УСТАНОВКА НАЧАЛЬНОГО ВРЕМЕНИ ИЗ ТАЙМЕРА
// ============================================================

function setStartTimeFromTimer(
    videoNumber
) {

    if (videoNumber === 1) {

        finishTime1 = null;
        resultTime1 = null;

    }

    else {

        finishTime2 = null;
        resultTime2 = null;

    }

    updateResultDisplays();

    // Новое "начало" делает старый "конец" и разницу
    // неактуальными, пока их не зафиксируют заново.
    updateEndTimeDisplay(
        videoNumber,
        0
    );

    updateTimeDifferenceDisplay(
        videoNumber,
        0
    );

    let time =
        getVideoTime(videoNumber);

    if (
        !Number.isFinite(time) ||
        time < 0
    ) {

        time = 0;

    }

    const totalMilliseconds =
        Math.round(
            time * 1000
        );

    const hours =
        Math.floor(
            totalMilliseconds /
            3600000
        );

    const minutes =
        Math.floor(
            (
                totalMilliseconds %
                3600000
            ) /
            60000
        );

    const seconds =
        Math.floor(
            (
                totalMilliseconds %
                60000
            ) /
            1000
        );

    const milliseconds =
        totalMilliseconds %
        1000;

    document.getElementById(
        `hour${videoNumber}`
    ).value = hours;

    document.getElementById(
        `min${videoNumber}`
    ).value = minutes;

    document.getElementById(
        `sec${videoNumber}`
    ).value = seconds;

    document.getElementById(
        `cs${videoNumber}`
    ).value = milliseconds;

    updateStartTimeDisplay(
        videoNumber
    );

}

// ============================================================
// НАСТРОЙКА НОВЫХ ШКАЛ
// ============================================================

function initializeSeekBars() {

    setupSeekMouseControls();

    updateSeekBars();

}

// ============================================================
// КОПИРОВАНИЕ MOD NOTE
// ============================================================

async function copyModNote(videoNumber) {

    const element =
        document.getElementById(
            "mod-note-" + videoNumber
        );

    if (!element) {
        return;
    }


    const text =
        element.textContent;


    try {

        await navigator.clipboard.writeText(
            text
        );

    }

    catch (error) {

        const textarea =
            document.createElement("textarea");

        textarea.value =
            text;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand(
            "copy"
        );

        textarea.remove();

    }


    const panel =
        element.closest(
            ".mod-note-panel"
        );


    const button =
        panel
            ? panel.querySelector(
                ".btn-copy-mod-note"
            )
            : null;


    if (button) {

        button.textContent =
            "Copied";

        setTimeout(
            () => {

                button.textContent =
                    "Copy";

            },
            1000
        );

    }

}

// ============================================================
// ПОДЕЛИТЬСЯ ССЫЛКОЙ (ВИДЕО + СТАРТ + ФИНИШ + FPS)
// ------------------------------------------------------------
// Состояние обоих видео упаковывается в JSON, кодируется в
// base64url и кладётся в хэш ссылки (#s=...), а не в query —
// хэш не уходит на сервер и не засоряет адрес при статичном
// хостинге (GitHub Pages и т.п.). При открытии такой ссылки
// восстанавливаем поля ввода и сами открываем оба видео.
// ============================================================

function toBase64Url(str) {

    const base64 =
        btoa(
            unescape(
                encodeURIComponent(str)
            )
        );

    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

}

function fromBase64Url(base64url) {

    let base64 =
        base64url
            .replace(/-/g, '+')
            .replace(/_/g, '/');

    while (base64.length % 4) {
        base64 += '=';
    }

    return decodeURIComponent(
        escape(
            atob(base64)
        )
    );

}

async function copyTextToClipboard(text) {

    if (
        navigator.clipboard &&
        navigator.clipboard.writeText
    ) {

        try {

            await navigator.clipboard.writeText(
                text
            );

            return true;

        }

        catch (error) {

            console.log(
                'Не удалось скопировать через Clipboard API:',
                error
            );

        }

    }

    // Резервный вариант — показать ссылку, чтобы
    // скопировать вручную (например, на http:// без HTTPS).
    window.prompt(
        'Скопируйте ссылку вручную:',
        text
    );

    return false;

}

window.copyShareLink =
    function() {

        const state = {};

        [1, 2].forEach(
            function(playerNum) {

                const codeInput =
                    document.getElementById(
                        'code' + playerNum
                    );

                const url =
                    codeInput
                        ? codeInput.value.trim()
                        : '';

                if (!url) {
                    return;
                }

                const entry = {

                    u: url,

                    s: getStartTime(
                        playerNum
                    ),

                    f: getFPS(
                        playerNum
                    )

                };

                const finishTime =
                    playerNum === 1
                        ? finishTime1
                        : finishTime2;

                if (
                    Number.isFinite(finishTime)
                ) {

                    entry.e = finishTime;

                }

                state[playerNum] = entry;

            }
        );

        if (
            !state[1] &&
            !state[2]
        ) {

            alert(
                'Сначала откройте хотя бы одно видео.'
            );

            return;

        }

        const encoded =
            toBase64Url(
                JSON.stringify(state)
            );

        const shareUrl =
            window.location.origin +
            window.location.pathname +
            '#s=' + encoded;

        copyTextToClipboard(
            shareUrl
        ).then(
            function(copied) {

                const button =
                    document.getElementById(
                        'btn-share-link'
                    );

                if (!button) {
                    return;
                }

                const original =
                    button.textContent;

                button.textContent =
                    copied ? '✓' : '…';

                setTimeout(
                    function() {

                        button.textContent =
                            original;

                    },
                    1500
                );

            }
        );

    };

// ============================================================
// ПРИМЕНЕНИЕ НАЧАЛЬНОГО ВРЕМЕНИ ИЗ ССЫЛКИ
// ============================================================

function applyStartTimeInputs(
    playerNum,
    totalSeconds
) {

    if (
        !Number.isFinite(totalSeconds) ||
        totalSeconds < 0
    ) {

        totalSeconds = 0;

    }

    const hours =
        Math.floor(totalSeconds / 3600);

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        Math.floor(totalSeconds % 60);

    const milliseconds =
        Math.round(
            (totalSeconds % 1) * 1000
        );

    const hourInput =
        document.getElementById(
            'hour' + playerNum
        );

    const minInput =
        document.getElementById(
            'min' + playerNum
        );

    const secInput =
        document.getElementById(
            'sec' + playerNum
        );

    const csInput =
        document.getElementById(
            'cs' + playerNum
        );

    if (hourInput) {
        hourInput.value = hours;
    }

    if (minInput) {
        minInput.value = minutes;
    }

    if (secInput) {
        secInput.value = seconds;
    }

    if (csInput) {
        csInput.value = milliseconds;
    }

}

// ============================================================
// ПРИМЕНЕНИЕ ФИНИША ИЗ ССЫЛКИ
// ------------------------------------------------------------
// Повторяет побочные эффекты setFinishTime(), но без реальной
// перемотки — конечная точка уже известна из ссылки.
// ============================================================

function applySharedFinishTime(
    playerNum,
    endTime
) {

    if (!Number.isFinite(endTime)) {
        return;
    }

    const startTime =
        getStartTime(playerNum);

    const elapsedTime =
        Math.max(
            0,
            endTime - startTime
        );

    if (playerNum === 1) {

        finishTime1 = endTime;
        resultTime1 = elapsedTime;

    }

    else {

        finishTime2 = endTime;
        resultTime2 = elapsedTime;

    }

    updateResultDisplays();

    updateEndTimeDisplay(
        playerNum,
        endTime
    );

    updateTimeDifferenceDisplay(
        playerNum,
        elapsedTime
    );

    updateModNote(
        playerNum
    );

}

// ============================================================
// ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ИЗ ССЫЛКИ ПРИ ЗАГРУЗКЕ
// ============================================================

function restoreStateFromHash() {

    const hash =
        window.location.hash;

    if (
        !hash ||
        hash.indexOf('#s=') !== 0
    ) {

        return;

    }

    let data;

    try {

        data =
            JSON.parse(
                fromBase64Url(
                    hash.slice(3)
                )
            );

    }

    catch (error) {

        console.log(
            'Не удалось прочитать состояние из ссылки:',
            error
        );

        return;

    }

    [1, 2].forEach(
        function(playerNum) {

            const entry =
                data[playerNum];

            if (
                !entry ||
                !entry.u
            ) {

                return;

            }

            const codeInput =
                document.getElementById(
                    'code' + playerNum
                );

            if (codeInput) {

                codeInput.value =
                    entry.u;

            }

            applyStartTimeInputs(
                playerNum,
                entry.s || 0
            );

            updateStartTimeDisplay(
                playerNum
            );

            loadEmbedVideo(
                playerNum
            );

            if (
                Number.isFinite(entry.f) &&
                entry.f > 0
            ) {

                setPlayerFPS(
                    playerNum,
                    entry.f,
                    false
                );

            }

            if (
                Number.isFinite(entry.e)
            ) {

                applySharedFinishTime(
                    playerNum,
                    entry.e
                );

            }

        }
    );

}

// ============================================================
// ПЕРВОНАЧАЛЬНОЕ ОБНОВЛЕНИЕ
// ============================================================

setupTimeInputLimits();

initializeSeekBars();

setViewToggleButton();

updateTimerDisplays();

updateResultDisplays();

updateStartTimeDisplay(1);
updateStartTimeDisplay(2);

restoreStateFromHash();