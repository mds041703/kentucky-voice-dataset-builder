"use strict";

window.Recorder = (() => {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        initialized: false,

        recording: false,
        countdownActive: false,

        stream: null,
        mediaRecorder: null,

        audioContext: null,
        analyser: null,
        microphoneSource: null,
        audioAnimationFrame: null,

        durationAnimationFrame: null,
        countdownTimer: null,
        silenceTimer: null,
        maximumDurationTimer: null,

        recordingStartTime: 0,
        recordingDuration: 0,

        chunks: [],

        lastBlob: null,
        lastObjectUrl: null,
        currentMimeType: "",

        currentSentenceId: null,
        lastSentenceId: null,
        redoSentenceId: null,

        audioLevel: 0,
        hasSpoken: false,

        /*
         * Prevents a completed recording from being
         * accidentally associated with a different sentence
         * if the Dataset cursor advances while the result is
         * still visible.
         */
        resultSentenceId: null
    };


    const DEFAULTS = {

        countdownSeconds: 2,

        silenceBeforeStop: 1.2,

        minimumDuration: 0.5,

        maximumDuration: 15,

        silenceThreshold: 0.015
    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function init() {

        if (state.initialized) {
            return;
        }

        setupButtons();

        setupEvents();

        state.initialized = true;

        updateRecordingButtons();

        console.log(
            "Recorder initialized."
        );
    }


    function setupButtons() {

        const recordButton =
            document.getElementById(
                "record-button"
            );

        const stopButton =
            document.getElementById(
                "stop-button"
            );

        const redoButton =
            document.getElementById(
                "redo-button"
            );

        const skipButton =
            document.getElementById(
                "skip-button"
            );

        const saveButton =
            document.getElementById(
                "save-recording-button"
            );

        const retakeButton =
            document.getElementById(
                "retake-recording-button"
            );


        if (recordButton) {

            recordButton.addEventListener(
                "click",
                start
            );
        }


        if (stopButton) {

            stopButton.addEventListener(
                "click",
                stop
            );
        }


        if (redoButton) {

            redoButton.addEventListener(
                "click",
                redo
            );
        }


        if (skipButton) {

            skipButton.addEventListener(
                "click",
                skip
            );
        }


        if (saveButton) {

            saveButton.addEventListener(
                "click",
                saveCurrentRecording
            );
        }


        if (retakeButton) {

            retakeButton.addEventListener(
                "click",
                redo
            );
        }
    }


    function setupEvents() {

        /*
         * Dataset.rerecordEntry() deliberately emits this
         * event so the recorder knows exactly which sentence
         * must be recorded again.
         */
        window.addEventListener(
            "kvdb:rerecord-sentence",
            event => {

                if (
                    !event.detail
                ) {
                    return;
                }

                handleRerecordRequest(
                    event.detail
                );
            }
        );


        /*
         * If another component changes the current sentence,
         * only adopt it when the recorder is idle and there is
         * no active REDO target.
         */
        window.addEventListener(
            "kvdb:advance-sentence",
            () => {

                if (
                    state.recording ||
                    state.countdownActive
                ) {
                    return;
                }

                if (
                    state.redoSentenceId
                ) {
                    return;
                }

                state.currentSentenceId =
                    null;

                updateRecordingButtons();
            }
        );
    }


    /* =====================================================
       RERECORD
       ===================================================== */

    function handleRerecordRequest(
        detail
    ) {

        if (
            state.recording ||
            state.countdownActive
        ) {
            return;
        }


        const sentenceId =
            detail.sentenceId ||
            (
                detail.sentence &&
                detail.sentence.id
            );


        if (!sentenceId) {

            console.warn(
                "Recorder received a re-record request without a sentence ID."
            );

            return;
        }


        const sentence =
            findSentenceById(
                sentenceId
            );


        if (!sentence) {

            console.warn(
                "Recorder could not find requested re-record sentence:",
                sentenceId
            );

            return;
        }


        /*
         * Dataset.resetEntry() has already removed the old
         * recording and marked the entry pending.
         */
        state.currentSentenceId =
            sentenceId;

        state.redoSentenceId =
            sentenceId;

        state.lastSentenceId =
            null;

        state.resultSentenceId =
            null;

        state.lastBlob =
            null;

        state.chunks =
            [];

        state.recordingDuration =
            0;

        state.audioLevel =
            0;

        state.hasSpoken =
            false;


        revokeLastObjectUrl();

        hideRecordingResult();

        clearSilenceTimer();

        stopDurationMonitor();

        stopAudioLevelMonitoring();

        updateAudioMeter(
            0
        );


        const countdown =
            document.getElementById(
                "countdown"
            );


        if (countdown) {

            countdown.textContent =
                "Ready";
        }


        restoreSentenceDisplay(
            sentence
        );


        setRecordingState(
            "Ready to re-record."
        );


        updateRecordingButtons();
    }


    /* =====================================================
       START
       ===================================================== */

    async function start() {

        if (
            state.recording ||
            state.countdownActive
        ) {
            return;
        }


        const sentence =
            getCurrentSentence();


        if (!sentence) {

            setRecordingState(
                "No sentence selected."
            );

            return;
        }


        if (!sentence.id) {

            setRecordingState(
                "Selected sentence has no ID."
            );

            return;
        }


        state.currentSentenceId =
            sentence.id;


        hideRecordingResult();


        try {

            await requestMicrophone();


            if (
                !state.currentSentenceId
            ) {
                return;
            }


            await runCountdown();


            if (
                !state.currentSentenceId
            ) {

                setRecordingState(
                    "Recording cancelled."
                );

                updateRecordingButtons();

                return;
            }


            const stillExists =
                findSentenceById(
                    state.currentSentenceId
                );


            if (!stillExists) {

                state.currentSentenceId =
                    null;

                setRecordingState(
                    "Sentence no longer exists."
                );

                updateRecordingButtons();

                return;
            }


            await beginRecording();

        } catch (error) {

            console.error(
                "Unable to start recording:",
                error
            );


            cancelCountdown();

            state.recording =
                false;

            state.currentSentenceId =
                null;

            updateRecordingButtons();

            setRecordingState(
                getMicrophoneErrorMessage(
                    error
                )
            );
        }
    }


    /* =====================================================
       MICROPHONE
       ===================================================== */

    async function requestMicrophone() {

        if (state.stream) {

            if (
                state.audioContext &&
                state.audioContext.state ===
                    "suspended"
            ) {

                try {

                    await state.audioContext.resume();

                } catch (error) {

                    console.warn(
                        "Unable to resume AudioContext:",
                        error
                    );
                }
            }

            return state.stream;
        }


        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !==
                "function"
        ) {

            throw new Error(
                "getUserMedia is not available. Use localhost or HTTPS."
            );
        }


        state.stream =
            await navigator.mediaDevices.getUserMedia({

                audio: {

                    channelCount: 1,

                    echoCancellation: false,

                    noiseSuppression: false,

                    autoGainControl: false
                },

                video: false
            });


        setupAudioAnalysis();


        return state.stream;
    }


    function setupAudioAnalysis() {

        if (!state.stream) {
            return;
        }


        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {

            console.warn(
                "Web Audio API is unavailable."
            );

            return;
        }


        if (state.audioContext) {

            try {

                state.audioContext.close();

            } catch (_) {}
        }


        state.audioContext =
            new AudioContext();


        state.microphoneSource =
            state.audioContext.createMediaStreamSource(
                state.stream
            );


        state.analyser =
            state.audioContext.createAnalyser();


        state.analyser.fftSize =
            2048;

        state.analyser.smoothingTimeConstant =
            0.15;


        state.microphoneSource.connect(
            state.analyser
        );


        if (
            state.audioContext.state ===
            "suspended"
        ) {

            state.audioContext
                .resume()
                .catch(
                    error => {

                        console.warn(
                            "Unable to resume AudioContext:",
                            error
                        );
                    }
                );
        }


        startAudioLevelMonitoring();
    }


    /* =====================================================
       COUNTDOWN
       ===================================================== */

    async function runCountdown() {

        const configured =
            Number(
                getConfigValue(
                    "recording.countdownSeconds",
                    DEFAULTS.countdownSeconds
                )
            );


        const seconds =
            Number.isFinite(
                configured
            )
                ? Math.max(
                    0,
                    Math.floor(
                        configured
                    )
                )
                : DEFAULTS.countdownSeconds;


        const element =
            document.getElementById(
                "countdown"
            );


        if (seconds <= 0) {

            if (element) {

                element.textContent =
                    "GO";
            }

            state.countdownActive =
                false;

            updateRecordingButtons();

            return;
        }


        state.countdownActive =
            true;

        updateRecordingButtons();


        setRecordingState(
            "Get ready..."
        );


        return new Promise(
            resolve => {

                let remaining =
                    seconds;

                let resolved =
                    false;


                const finish = () => {

                    if (resolved) {
                        return;
                    }


                    resolved =
                        true;


                    if (
                        state.countdownTimer !==
                        null
                    ) {

                        clearInterval(
                            state.countdownTimer
                        );

                        state.countdownTimer =
                            null;
                    }


                    resolve();
                };


                const update = () => {

                    if (
                        !state.countdownActive
                    ) {

                        finish();

                        return;
                    }


                    if (
                        remaining > 0
                    ) {

                        if (element) {

                            element.textContent =
                                String(
                                    remaining
                                );
                        }

                        remaining--;

                        return;
                    }


                    if (element) {

                        element.textContent =
                            "GO";
                    }


                    state.countdownActive =
                        false;


                    updateRecordingButtons();

                    finish();
                };


                update();


                state.countdownTimer =
                    setInterval(
                        update,
                        1000
                    );
            }
        );
    }


    function cancelCountdown() {

        state.countdownActive =
            false;


        if (
            state.countdownTimer !==
            null
        ) {

            clearInterval(
                state.countdownTimer
            );

            state.countdownTimer =
                null;
        }


        const countdown =
            document.getElementById(
                "countdown"
            );


        if (
            countdown &&
            !state.recording
        ) {

            countdown.textContent =
                "Ready";
        }


        updateRecordingButtons();
    }


    /* =====================================================
       RECORDING
       ===================================================== */

    async function beginRecording() {

        if (!state.stream) {

            throw new Error(
                "Microphone is not available."
            );
        }


        if (
            typeof window.MediaRecorder ===
            "undefined"
        ) {

            throw new Error(
                "MediaRecorder is not supported by this browser."
            );
        }


        state.chunks =
            [];

        state.lastBlob =
            null;

        state.lastSentenceId =
            null;

        state.resultSentenceId =
            null;

        state.hasSpoken =
            false;

        state.recordingDuration =
            0;

        state.audioLevel =
            0;


        state.recordingStartTime =
            performance.now();


        state.currentMimeType =
            selectMimeType();


        let recorderOptions =
            null;


        if (
            state.currentMimeType
        ) {

            recorderOptions = {

                mimeType:
                    state.currentMimeType
            };
        }


        try {

            state.mediaRecorder =
                recorderOptions
                    ? new MediaRecorder(
                        state.stream,
                        recorderOptions
                    )
                    : new MediaRecorder(
                        state.stream
                    );

        } catch (error) {

            console.error(
                "Failed to create MediaRecorder:",
                error
            );

            state.mediaRecorder =
                null;

            throw error;
        }


        state.mediaRecorder.addEventListener(
            "dataavailable",
            handleData
        );


        state.mediaRecorder.addEventListener(
            "stop",
            handleRecorderStopped,
            {
                once: true
            }
        );


        state.mediaRecorder.addEventListener(
            "error",
            handleRecorderError,
            {
                once: true
            }
        );


        state.recording =
            true;

        state.hasSpoken =
            false;


        updateRecordingButtons();


        setRecordingState(
            "Listening..."
        );


        try {

            state.mediaRecorder.start(
                100
            );

        } catch (error) {

            state.recording =
                false;

            state.mediaRecorder =
                null;

            updateRecordingButtons();

            throw error;
        }


        startDurationMonitor();

        startMaximumDurationTimer();
    }


    function selectMimeType() {

        const types = [

            "audio/webm;codecs=opus",

            "audio/webm",

            "audio/mp4",

            "audio/ogg;codecs=opus"
        ];


        if (
            typeof window.MediaRecorder ===
                "undefined" ||
            typeof MediaRecorder.isTypeSupported !==
                "function"
        ) {

            return "";
        }


        for (
            const type of types
        ) {

            try {

                if (
                    MediaRecorder.isTypeSupported(
                        type
                    )
                ) {

                    return type;
                }

            } catch (_) {}
        }


        return "";
    }


    function handleData(
        event
    ) {

        if (
            event.data &&
            event.data.size > 0
        ) {

            state.chunks.push(
                event.data
            );
        }
    }


    function stop() {

        if (
            !state.recording ||
            !state.mediaRecorder
        ) {
            return;
        }


        setRecordingState(
            "Finishing recording..."
        );


        clearMaximumDurationTimer();

        stopDurationMonitor();

        clearSilenceTimer();


        try {

            if (
                state.mediaRecorder.state !==
                "inactive"
            ) {

                state.mediaRecorder.stop();

            } else {

                handleRecorderStopped();
            }

        } catch (error) {

            console.error(
                "Stop failed:",
                error
            );

            cleanupRecording();
        }
    }


    /* =====================================================
       MAXIMUM DURATION
       ===================================================== */

    function startMaximumDurationTimer() {

        clearMaximumDurationTimer();


        const configured =
            Number(
                getConfigValue(
                    "recording.maximumDuration",
                    DEFAULTS.maximumDuration
                )
            );


        const maximum =
            Number.isFinite(
                configured
            )
                ? Math.max(
                    0,
                    configured
                )
                : DEFAULTS.maximumDuration;


        if (maximum <= 0) {
            return;
        }


        state.maximumDurationTimer =
            setTimeout(
                () => {

                    if (
                        !state.recording
                    ) {
                        return;
                    }


                    setRecordingState(
                        "Maximum recording length reached."
                    );


                    stop();
                },
                maximum * 1000
            );
    }


    function clearMaximumDurationTimer() {

        if (
            state.maximumDurationTimer !==
            null
        ) {

            clearTimeout(
                state.maximumDurationTimer
            );

            state.maximumDurationTimer =
                null;
        }
    }


    /* =====================================================
       RECORDER EVENTS
       ===================================================== */

    function handleRecorderStopped() {

        state.recording =
            false;


        clearMaximumDurationTimer();

        stopDurationMonitor();

        clearSilenceTimer();


        state.recordingDuration =
            Math.max(
                0,
                (
                    performance.now() -
                    state.recordingStartTime
                ) / 1000
            );


        const blobType =
            state.mediaRecorder &&
            state.mediaRecorder.mimeType
                ? state.mediaRecorder.mimeType
                : state.currentMimeType ||
                    (
                        state.chunks[0] &&
                        state.chunks[0].type
                    ) ||
                    "audio/webm";


        const blob =
            new Blob(
                state.chunks,
                {
                    type: blobType
                }
            );


        if (
            blob.size === 0
        ) {

            state.lastBlob =
                null;

            state.lastSentenceId =
                null;

            state.resultSentenceId =
                null;

            state.mediaRecorder =
                null;

            stopAudioLevelMonitoring();

            updateAudioMeter(
                0
            );

            updateRecordingButtons();

            setRecordingState(
                "Recording was empty."
            );

            return;
        }


        const sentenceId =
            state.currentSentenceId;


        if (!sentenceId) {

            console.warn(
                "Recording completed without a sentence ID."
            );

            state.mediaRecorder =
                null;

            stopAudioLevelMonitoring();

            updateAudioMeter(
                0
            );

            updateRecordingButtons();

            setRecordingState(
                "Recording completed, but no sentence was selected."
            );

            return;
        }


        state.lastBlob =
            blob;

        state.lastSentenceId =
            sentenceId;

        state.resultSentenceId =
            sentenceId;

        state.redoSentenceId =
            sentenceId;


        revokeLastObjectUrl();


        try {

            state.lastObjectUrl =
                URL.createObjectURL(
                    blob
                );

        } catch (error) {

            console.warn(
                "Unable to create recording preview URL:",
                error
            );

            state.lastObjectUrl =
                null;
        }


        stopAudioLevelMonitoring();

        updateAudioMeter(
            0
        );

        updateRecordingDisplay();

        showRecordingResult();


        /*
         * Dataset owns persistence. The recorder only
         * publishes the completed recording.
         *
         * Dataset.receiveRecording() will mark this exact
         * sentence recorded and advance its own cursor.
         */
        window.dispatchEvent(
            new CustomEvent(
                "kvdb:recording-ready",
                {
                    detail: {

                        blob,

                        duration:
                            state.recordingDuration,

                        mimeType:
                            blob.type,

                        sentenceId,

                        createdAt:
                            new Date().toISOString()
                    }
                }
            )
        );


        /*
         * Do not clear resultSentenceId or lastSentenceId.
         * REDO needs those IDs after Dataset advances.
         *
         * currentSentenceId is cleared because the Dataset
         * cursor now points at the next pending sentence.
         * getCurrentSentence() will use the Dataset cursor
         * until REDO or Re-record establishes a new target.
         */
        state.currentSentenceId =
            null;

        state.mediaRecorder =
            null;


        updateRecordingButtons();
    }


    function handleRecorderError(
        event
    ) {

        console.error(
            "MediaRecorder error:",
            event &&
            event.error
        );


        state.recording =
            false;


        clearMaximumDurationTimer();

        stopDurationMonitor();

        clearSilenceTimer();

        stopAudioLevelMonitoring();


        state.mediaRecorder =
            null;


        updateAudioMeter(
            0
        );

        updateRecordingButtons();


        setRecordingState(
            "Recording error."
        );
    }


    /* =====================================================
       DURATION
       ===================================================== */

    function startDurationMonitor() {

        stopDurationMonitor();


        const tick = () => {

            if (
                !state.recording
            ) {
                return;
            }


            state.recordingDuration =
                Math.max(
                    0,
                    (
                        performance.now() -
                        state.recordingStartTime
                    ) / 1000
                );


            updateRecordingDisplay();


            state.durationAnimationFrame =
                requestAnimationFrame(
                    tick
                );
        };


        state.durationAnimationFrame =
            requestAnimationFrame(
                tick
            );
    }


    function stopDurationMonitor() {

        if (
            state.durationAnimationFrame !==
            null
        ) {

            cancelAnimationFrame(
                state.durationAnimationFrame
            );

            state.durationAnimationFrame =
                null;
        }
    }


    /* =====================================================
       AUDIO LEVEL
       ===================================================== */

    function startAudioLevelMonitoring() {

        if (!state.analyser) {
            return;
        }


        stopAudioLevelMonitoring();


        const data =
            new Float32Array(
                state.analyser.fftSize
            );


        const monitor = () => {

            if (
                !state.analyser
            ) {
                return;
            }


            try {

                state.analyser.getFloatTimeDomainData(
                    data
                );

            } catch (error) {

                console.warn(
                    "Unable to read microphone level:",
                    error
                );

                return;
            }


            const rms =
                calculateRMS(
                    data
                );


            state.audioLevel =
                rms;


            updateAudioMeter(
                rms
            );


            if (
                state.recording
            ) {

                monitorSilence(
                    rms
                );
            }


            state.audioAnimationFrame =
                requestAnimationFrame(
                    monitor
                );
        };


        state.audioAnimationFrame =
            requestAnimationFrame(
                monitor
            );
    }


    function stopAudioLevelMonitoring() {

        if (
            state.audioAnimationFrame !==
            null
        ) {

            cancelAnimationFrame(
                state.audioAnimationFrame
            );

            state.audioAnimationFrame =
                null;
        }
    }


    function calculateRMS(
        samples
    ) {

        if (
            !samples ||
            samples.length === 0
        ) {

            return 0;
        }


        let sum =
            0;


        for (
            let i = 0;
            i < samples.length;
            i++
        ) {

            sum +=
                samples[i] *
                samples[i];
        }


        return Math.sqrt(
            sum /
            samples.length
        );
    }


    /* =====================================================
       SILENCE DETECTION
       ===================================================== */

    function monitorSilence(
        level
    ) {

        const configuredThreshold =
            Number(
                getConfigValue(
                    "recording.silenceThreshold",
                    DEFAULTS.silenceThreshold
                )
            );


        const threshold =
            Number.isFinite(
                configuredThreshold
            )
                ? Math.max(
                    0,
                    configuredThreshold
                )
                : DEFAULTS.silenceThreshold;


        if (
            level >= threshold
        ) {

            state.hasSpoken =
                true;

            clearSilenceTimer();

            return;
        }


        /*
         * Do not stop before the user has actually spoken.
         * Otherwise the recorder would spend its life stopping
         * itself because the microphone is, inconveniently,
         * initially silent.
         */
        if (
            !state.hasSpoken
        ) {
            return;
        }


        if (
            state.silenceTimer !==
            null
        ) {
            return;
        }


        const configuredMinimum =
            Number(
                getConfigValue(
                    "recording.minimumDuration",
                    DEFAULTS.minimumDuration
                )
            );


        const minimum =
            Number.isFinite(
                configuredMinimum
            )
                ? Math.max(
                    0,
                    configuredMinimum
                )
                : DEFAULTS.minimumDuration;


        if (
            state.recordingDuration <
            minimum
        ) {
            return;
        }


        const configuredDelay =
            Number(
                getConfigValue(
                    "recording.silenceBeforeStop",
                    DEFAULTS.silenceBeforeStop
                )
            );


        const delay =
            Number.isFinite(
                configuredDelay
            )
                ? Math.max(
                    0,
                    configuredDelay
                )
                : DEFAULTS.silenceBeforeStop;


        if (
            delay <= 0
        ) {

            setRecordingState(
                "Silence detected."
            );

            stop();

            return;
        }


        state.silenceTimer =
            setTimeout(
                () => {

                    state.silenceTimer =
                        null;


                    if (
                        !state.recording
                    ) {
                        return;
                    }


                    setRecordingState(
                        "Silence detected."
                    );


                    stop();
                },
                delay * 1000
            );
    }


    function clearSilenceTimer() {

        if (
            state.silenceTimer !==
            null
        ) {

            clearTimeout(
                state.silenceTimer
            );

            state.silenceTimer =
                null;
        }
    }


    /* =====================================================
       AUDIO METER
       ===================================================== */

    function updateAudioMeter(
        rms
    ) {

        const meter =
            document.getElementById(
                "audio-meter-level"
            );


        if (!meter) {
            return;
        }


        const safeRms =
            Number.isFinite(
                Number(rms)
            )
                ? Math.max(
                    0,
                    Number(rms)
                )
                : 0;


        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    safeRms * 500
                )
            );


        meter.style.width =
            `${percentage}%`;
    }


    /* =====================================================
       RECORDING DISPLAY
       ===================================================== */

    function updateRecordingDisplay() {

        const countdown =
            document.getElementById(
                "countdown"
            );


        if (
            countdown &&
            state.recording
        ) {

            countdown.textContent =
                formatDuration(
                    state.recordingDuration
                );
        }
    }


    function formatDuration(
        seconds
    ) {

        const value =
            Math.max(
                0,
                Number(seconds) || 0
            );


        const minutes =
            Math.floor(
                value / 60
            );


        const remaining =
            Math.floor(
                value % 60
            );


        const tenths =
            Math.floor(
                (value % 1) * 10
            );


        return (
            `${minutes}:` +
            `${String(
                remaining
            ).padStart(
                2,
                "0"
            )}.` +
            `${tenths}`
        );
    }


    /* =====================================================
       RECORDING RESULT
       ===================================================== */

    function showRecordingResult() {

        const result =
            document.getElementById(
                "recording-result"
            );


        const preview =
            document.getElementById(
                "recording-preview"
            );


        const details =
            document.getElementById(
                "recording-result-details"
            );


        if (result) {

            result.classList.remove(
                "hidden"
            );
        }


        if (
            preview &&
            state.lastObjectUrl
        ) {

            preview.src =
                state.lastObjectUrl;


            try {

                preview.load();

            } catch (_) {}
        }


        if (details) {

            details.textContent =
                `${formatDuration(
                    state.recordingDuration
                )} • ` +
                `${formatBytes(
                    state.lastBlob
                        ? state.lastBlob.size
                        : 0
                )}`;
        }


        setRecordingState(
            "Recording complete."
        );
    }


    function hideRecordingResult() {

        const result =
            document.getElementById(
                "recording-result"
            );


        const preview =
            document.getElementById(
                "recording-preview"
            );


        if (result) {

            result.classList.add(
                "hidden"
            );
        }


        if (preview) {

            try {

                preview.pause();

                preview.removeAttribute(
                    "src"
                );

                preview.load();

            } catch (_) {}
        }
    }


    /* =====================================================
       REDO / RECORD AGAIN
       ===================================================== */

    function redo() {

        if (
            state.recording ||
            state.countdownActive
        ) {
            return;
        }


        const sentenceId =
            state.redoSentenceId ||
            state.lastSentenceId;


        if (!sentenceId) {

            setRecordingState(
                "There is no recording to redo."
            );

            return;
        }


        const sentence =
            findSentenceById(
                sentenceId
            );


        if (!sentence) {

            setRecordingState(
                "The recorded sentence no longer exists."
            );

            return;
        }


        /*
         * Dataset.resetEntry() is the authoritative way to
         * remove the previous recording and return the exact
         * sentence to pending status.
         */
        if (
            window.Dataset &&
            typeof window.Dataset.resetEntry ===
                "function"
        ) {

            const reset =
                window.Dataset.resetEntry(
                    sentenceId
                );


            if (!reset) {

                console.warn(
                    "Dataset.resetEntry() failed:",
                    sentenceId
                );

                return;
            }

        } else {

            /*
             * Defensive fallback for operation without the
             * Dataset module.
             */
            sentence.status =
                "pending";

            sentence.recording =
                null;

            sentence.updatedAt =
                new Date().toISOString();
        }


        state.redoSentenceId =
            sentenceId;

        state.currentSentenceId =
            sentenceId;

        state.lastSentenceId =
            null;

        state.resultSentenceId =
            null;

        state.chunks =
            [];

        state.lastBlob =
            null;

        state.hasSpoken =
            false;

        state.recordingDuration =
            0;

        state.audioLevel =
            0;


        revokeLastObjectUrl();

        hideRecordingResult();

        clearSilenceTimer();

        stopDurationMonitor();

        stopAudioLevelMonitoring();

        updateAudioMeter(
            0
        );


        restoreSentenceDisplay(
            sentence
        );


        const countdown =
            document.getElementById(
                "countdown"
            );


        if (countdown) {

            countdown.textContent =
                "Ready";
        }


        setRecordingState(
            "Ready to record again."
        );


        updateRecordingButtons();
    }


    function restoreSentenceDisplay(
        sentence
    ) {

        if (!sentence) {
            return;
        }


        if (
            window.App &&
            window.App.state
        ) {

            window.App.state.currentSentence =
                sentence;
        }


        const sentenceElement =
            document.getElementById(
                "current-sentence"
            );


        const categoryElement =
            document.getElementById(
                "recording-category"
            );


        const metadataElement =
            document.getElementById(
                "sentence-metadata"
            );


        if (sentenceElement) {

            sentenceElement.textContent =
                sentence.text || "";
        }


        if (categoryElement) {

            categoryElement.textContent =
                sentence.category ||
                "general";
        }


        if (metadataElement) {

            const metadata = [];


            if (sentence.intent) {

                metadata.push(
                    `Intent: ${sentence.intent}`
                );
            }


            if (sentence.style) {

                metadata.push(
                    `Style: ${sentence.style}`
                );
            }


            if (
                Array.isArray(
                    sentence.regionalInfluence
                ) &&
                sentence.regionalInfluence.length
            ) {

                metadata.push(
                    `Regional: ${
                        sentence.regionalInfluence.join(
                            ", "
                        )
                    }`
                );
            }


            metadataElement.textContent =
                metadata.join(
                    " • "
                );
        }
    }


    /* =====================================================
       SAVE CURRENT RECORDING
       ===================================================== */

    function saveCurrentRecording() {

        if (!state.lastBlob) {

            setRecordingState(
                "There is no recording to save."
            );

            return;
        }


        /*
         * The normal recording path already sends
         * kvdb:recording-ready and Dataset.receiveRecording()
         * persists it immediately.
         *
         * Keep this event for compatibility with other modules.
         */
        window.dispatchEvent(
            new CustomEvent(
                "kvdb:save-recording",
                {
                    detail: {

                        blob:
                            state.lastBlob,

                        duration:
                            state.recordingDuration,

                        mimeType:
                            state.lastBlob.type,

                        sentenceId:
                            state.resultSentenceId ||
                            state.lastSentenceId,

                        createdAt:
                            new Date().toISOString()
                    }
                }
            )
        );


        setRecordingState(
            "Recording saved."
        );


        hideRecordingResult();

        updateRecordingButtons();
    }


    /* =====================================================
       SKIP
       ===================================================== */

    function skip() {

        if (
            state.recording ||
            state.countdownActive
        ) {
            return;
        }


        const sentence =
            getCurrentSentence();


        if (!sentence) {

            setRecordingState(
                "No sentence selected."
            );

            return;
        }


        window.dispatchEvent(
            new CustomEvent(
                "kvdb:sentence-skipped",
                {
                    detail: {
                        ...sentence
                    }
                }
            )
        );


        state.currentSentenceId =
            null;

        state.lastSentenceId =
            null;

        state.redoSentenceId =
            null;

        state.resultSentenceId =
            null;

        state.chunks =
            [];

        state.lastBlob =
            null;

        state.hasSpoken =
            false;

        state.recordingDuration =
            0;

        state.audioLevel =
            0;


        clearSilenceTimer();

        stopDurationMonitor();

        stopAudioLevelMonitoring();

        revokeLastObjectUrl();

        hideRecordingResult();

        updateAudioMeter(
            0
        );


        const countdown =
            document.getElementById(
                "countdown"
            );


        if (countdown) {

            countdown.textContent =
                "Ready";
        }


        updateRecordingButtons();


        setRecordingState(
            "Skipped."
        );
    }


    /* =====================================================
       BUTTON STATE
       ===================================================== */

    function updateRecordingButtons() {

        const record =
            document.getElementById(
                "record-button"
            );


        const stopButton =
            document.getElementById(
                "stop-button"
            );


        const redoButton =
            document.getElementById(
                "redo-button"
            );


        const skipButton =
            document.getElementById(
                "skip-button"
            );


        const saveButton =
            document.getElementById(
                "save-recording-button"
            );


        const retakeButton =
            document.getElementById(
                "retake-recording-button"
            );


        const busy =
            state.recording ||
            state.countdownActive;


        const hasRedoTarget =
            Boolean(
                state.lastBlob &&
                (
                    state.redoSentenceId ||
                    state.lastSentenceId
                )
            );


        if (record) {

            record.disabled =
                busy;
        }


        if (stopButton) {

            stopButton.disabled =
                !state.recording;
        }


        if (redoButton) {

            redoButton.disabled =
                busy ||
                !hasRedoTarget;
        }


        if (skipButton) {

            skipButton.disabled =
                busy;
        }


        if (saveButton) {

            saveButton.disabled =
                busy ||
                !state.lastBlob;
        }


        if (retakeButton) {

            retakeButton.disabled =
                busy ||
                !hasRedoTarget;
        }
    }


    /* =====================================================
       DATASET ACCESS
       ===================================================== */

    function getCurrentSentence() {

        /*
         * An explicit sentence ID always wins. This is what
         * makes Dataset-tab Re-record reliable.
         */
        if (
            state.currentSentenceId
        ) {

            const explicit =
                findSentenceById(
                    state.currentSentenceId
                );


            if (explicit) {

                return explicit;
            }


            state.currentSentenceId =
                null;
        }


        if (
            window.Dataset &&
            typeof window.Dataset.getCurrentSentence ===
                "function"
        ) {

            const sentence =
                window.Dataset.getCurrentSentence();


            if (sentence) {

                return sentence;
            }
        }


        if (
            window.App &&
            window.App.state &&
            window.App.state.currentSentence
        ) {

            return window.App.state.currentSentence;
        }


        return null;
    }


    function findSentenceById(
        id
    ) {

        if (
            !id ||
            !window.Dataset ||
            typeof window.Dataset.getEntries !==
                "function"
        ) {

            return null;
        }


        const entries =
            window.Dataset.getEntries();


        if (
            !Array.isArray(
                entries
            )
        ) {

            return null;
        }


        return (
            entries.find(
                entry =>
                    entry &&
                    entry.id === id
            ) ||
            null
        );
    }


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    function getConfigValue(
        path,
        fallback
    ) {

        if (
            window.App &&
            window.App.state &&
            window.App.state.config
        ) {

            const parts =
                String(
                    path
                ).split(
                    "."
                );


            let value =
                window.App.state.config;


            for (
                const part of parts
            ) {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return fallback;
                }


                value =
                    value[part];
            }


            if (
                value !== undefined &&
                value !== null
            ) {

                return value;
            }
        }


        return fallback;
    }


    /* =====================================================
       UI HELPERS
       ===================================================== */

    function setRecordingState(
        message
    ) {

        const element =
            document.getElementById(
                "recording-state"
            );


        if (element) {

            element.textContent =
                message;
        }


        console.log(
            "Recorder state:",
            message
        );
    }


    function getMicrophoneErrorMessage(
        error
    ) {

        if (!error) {

            return (
                "Unable to access microphone."
            );
        }


        switch (
            error.name
        ) {

            case "NotAllowedError":

            case "PermissionDeniedError":

                return (
                    "Microphone permission was denied. " +
                    "Allow microphone access for this site."
                );


            case "NotFoundError":

            case "DevicesNotFoundError":

                return (
                    "No microphone was found."
                );


            case "NotReadableError":

                return (
                    "The microphone is already being used " +
                    "or cannot be accessed."
                );


            case "SecurityError":

                return (
                    "The browser blocked microphone access."
                );


            case "AbortError":

                return (
                    "Microphone access was interrupted."
                );


            default:

                return (
                    `Microphone error: ${
                        error.message ||
                        error.name ||
                        "unknown error"
                    }`
                );
        }
    }


    function formatBytes(
        bytes
    ) {

        if (
            !Number.isFinite(
                bytes
            ) ||
            bytes <= 0
        ) {

            return "0 B";
        }


        const units = [

            "B",
            "KB",
            "MB",
            "GB"
        ];


        const exponent =
            Math.min(
                Math.floor(
                    Math.log(
                        bytes
                    ) /
                    Math.log(
                        1024
                    )
                ),
                units.length - 1
            );


        const value =
            bytes /
            Math.pow(
                1024,
                exponent
            );


        return (
            `${value.toFixed(
                exponent === 0
                    ? 0
                    : 1
            )} ${units[exponent]}`
        );
    }


    /* =====================================================
       OBJECT URL
       ===================================================== */

    function revokeLastObjectUrl() {

        if (
            !state.lastObjectUrl
        ) {
            return;
        }


        try {

            URL.revokeObjectURL(
                state.lastObjectUrl
            );

        } catch (_) {}


        state.lastObjectUrl =
            null;
    }


    /* =====================================================
       CLEANUP
       ===================================================== */

    function cleanupRecording() {

        state.recording =
            false;


        clearMaximumDurationTimer();

        stopDurationMonitor();

        clearSilenceTimer();

        stopAudioLevelMonitoring();


        if (
            state.mediaRecorder &&
            state.mediaRecorder.state !==
                "inactive"
        ) {

            try {

                state.mediaRecorder.stop();

            } catch (_) {}
        }


        state.mediaRecorder =
            null;


        updateAudioMeter(
            0
        );

        updateRecordingButtons();
    }


    function cleanup() {

        cancelCountdown();

        clearMaximumDurationTimer();

        stopDurationMonitor();

        clearSilenceTimer();

        stopAudioLevelMonitoring();


        if (
            state.mediaRecorder
        ) {

            try {

                if (
                    state.mediaRecorder.state !==
                        "inactive"
                ) {

                    state.mediaRecorder.ondataavailable =
                        null;

                    state.mediaRecorder.onstop =
                        null;

                    state.mediaRecorder.onerror =
                        null;

                    state.mediaRecorder.stop();
                }

            } catch (_) {}
        }


        if (state.stream) {

            state.stream
                .getTracks()
                .forEach(
                    track => {

                        try {

                            track.stop();

                        } catch (_) {}
                    }
                );


            state.stream =
                null;
        }


        if (state.audioContext) {

            try {

                state.audioContext.close();

            } catch (_) {}
        }


        revokeLastObjectUrl();


        state.audioContext =
            null;

        state.analyser =
            null;

        state.microphoneSource =
            null;

        state.mediaRecorder =
            null;

        state.recording =
            false;

        state.countdownActive =
            false;

        state.currentSentenceId =
            null;

        state.lastSentenceId =
            null;

        state.redoSentenceId =
            null;

        state.resultSentenceId =
            null;

        state.chunks =
            [];

        state.lastBlob =
            null;

        state.hasSpoken =
            false;

        state.recordingDuration =
            0;

        state.audioLevel =
            0;


        updateAudioMeter(
            0
        );

        updateRecordingButtons();
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        start,

        stop,

        redo,

        skip,

        saveCurrentRecording,

        cleanup,

        requestMicrophone,


        getLastBlob: () => {

            return state.lastBlob;
        },


        getLastRecording: () => {

            return {

                blob:
                    state.lastBlob,

                duration:
                    state.recordingDuration,

                mimeType:
                    state.lastBlob
                        ? state.lastBlob.type
                        : state.currentMimeType,

                sentenceId:
                    state.resultSentenceId ||
                    state.lastSentenceId
            };
        },


        isRecording: () => {

            return state.recording;
        },


        getState: () => {

            return {
                ...state
            };
        }
    };

})();


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            window.Recorder &&
            typeof window.Recorder.init ===
                "function"
        ) {

            window.Recorder.init();
        }
    }
);


/* =========================================================
   PAGE CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            window.Recorder &&
            typeof window.Recorder.cleanup ===
                "function"
        ) {

            window.Recorder.cleanup();
        }
    }
);
