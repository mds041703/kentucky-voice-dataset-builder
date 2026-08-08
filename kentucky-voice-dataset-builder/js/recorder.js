"use strict";

window.Recorder = (() => {
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

        audioLevel: 0,
        hasSpoken: false
    };

    const DEFAULTS = {
        countdownSeconds: 2,
        silenceBeforeStop: 1.2,
        minimumDuration: 0.5,
        maximumDuration: 15,
        silenceThreshold: 0.015
    };

    function init() {
        if (state.initialized) {
            return;
        }

        setupButtons();

        state.initialized = true;

        updateRecordingButtons();

        console.log("Recorder initialized.");
    }

    function setupButtons() {
        const recordButton =
            document.getElementById("record-button");

        const stopButton =
            document.getElementById("stop-button");

        const redoButton =
            document.getElementById("redo-button");

        const skipButton =
            document.getElementById("skip-button");

        const saveButton =
            document.getElementById("save-recording-button");

        const retakeButton =
            document.getElementById("retake-recording-button");

        if (recordButton) {
            recordButton.addEventListener("click", start);
            console.log("Record button connected.");
        } else {
            console.warn(
                "Record button not found: #record-button"
            );
        }

        if (stopButton) {
            stopButton.addEventListener("click", stop);
            console.log("Stop button connected.");
        } else {
            console.warn(
                "Stop button not found: #stop-button"
            );
        }

        if (redoButton) {
            redoButton.addEventListener("click", redo);
            console.log("Redo button connected.");
        } else {
            console.warn(
                "Redo button not found: #redo-button"
            );
        }

        if (skipButton) {
            skipButton.addEventListener("click", skip);
            console.log("Skip button connected.");
        } else {
            console.warn(
                "Skip button not found: #skip-button"
            );
        }

        if (saveButton) {
            saveButton.addEventListener(
                "click",
                saveCurrentRecording
            );
            console.log("Save button connected.");
        }

        if (retakeButton) {
            retakeButton.addEventListener("click", redo);
            console.log("Retake button connected.");
        }

        console.log("Recorder buttons connected.");
    }

    async function start() {
        console.log("Record button clicked.");

        if (
            state.recording ||
            state.countdownActive
        ) {
            console.log("Recorder is already busy.");
            return;
        }

        const sentence =
            getCurrentSentence();

        if (!sentence) {
            console.warn(
                "No current sentence available."
            );

            setRecordingState(
                "No sentence selected."
            );

            return;
        }

        state.currentSentenceId =
            sentence.id;

        try {
            await requestMicrophone();

            console.log("Microphone ready.");

            await runCountdown();

            if (!state.currentSentenceId) {
                console.warn(
                    "Sentence was cleared during countdown."
                );

                return;
            }

            const stillExists =
                findSentenceById(
                    state.currentSentenceId
                );

            if (!stillExists) {
                console.warn(
                    "Current sentence no longer exists."
                );

                state.currentSentenceId = null;

                setRecordingState(
                    "Sentence no longer exists."
                );

                return;
            }

            await beginRecording();

        } catch (error) {
            console.error(
                "Unable to start recording:",
                error
            );

            state.countdownActive = false;
            state.currentSentenceId = null;

            updateRecordingButtons();

            setRecordingState(
                getMicrophoneErrorMessage(error)
            );
        }
    }

    async function requestMicrophone() {
        console.log(
            "Requesting microphone..."
        );

        if (state.stream) {
            if (
                state.audioContext &&
                state.audioContext.state ===
                    "suspended"
            ) {
                await state.audioContext.resume();
            }

            return state.stream;
        }

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            throw new Error(
                "getUserMedia is not available. " +
                "Use localhost or HTTPS."
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

        console.log(
            "Microphone stream acquired."
        );

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

        state.analyser.fftSize = 2048;
        state.analyser.smoothingTimeConstant = 0.15;

        state.microphoneSource.connect(
            state.analyser
        );

        if (
            state.audioContext.state ===
            "suspended"
        ) {
            state.audioContext
                .resume()
                .catch(error => {
                    console.warn(
                        "Unable to resume AudioContext:",
                        error
                    );
                });
        }

        startAudioLevelMonitoring();

        console.log(
            "Audio analysis initialized."
        );
    }

    async function runCountdown() {
        const configured =
            Number(
                getConfigValue(
                    "recording.countdownSeconds",
                    DEFAULTS.countdownSeconds
                )
            );

        const seconds =
            Number.isFinite(configured)
                ? Math.max(
                    0,
                    Math.floor(configured)
                )
                : DEFAULTS.countdownSeconds;

        const element =
            document.getElementById(
                "countdown"
            );

        if (seconds <= 0) {
            if (element) {
                element.textContent = "GO";
            }

            state.countdownActive = false;

            updateRecordingButtons();

            return;
        }

        state.countdownActive = true;

        updateRecordingButtons();

        setRecordingState(
            "Get ready..."
        );

        return new Promise(resolve => {
            let remaining = seconds;

            const update = () => {
                if (!state.countdownActive) {
                    clearInterval(
                        state.countdownTimer
                    );

                    state.countdownTimer = null;

                    resolve();

                    return;
                }

                if (remaining > 0) {
                    if (element) {
                        element.textContent =
                            String(remaining);
                    }

                    remaining--;

                    return;
                }

                if (element) {
                    element.textContent = "GO";
                }

                state.countdownActive = false;

                clearInterval(
                    state.countdownTimer
                );

                state.countdownTimer = null;

                updateRecordingButtons();

                resolve();
            };

            update();

            state.countdownTimer =
                setInterval(
                    update,
                    1000
                );
        });
    }

    async function beginRecording() {
        if (!state.stream) {
            throw new Error(
                "Microphone is not available."
            );
        }

        if (!window.MediaRecorder) {
            throw new Error(
                "MediaRecorder is not supported."
            );
        }

        state.chunks = [];
        state.lastBlob = null;
        state.lastSentenceId = null;
        state.hasSpoken = false;
        state.recordingDuration = 0;

        state.recordingStartTime =
            performance.now();

        state.currentMimeType =
            selectMimeType();

        let recorderOptions;

        if (state.currentMimeType) {
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

        state.recording = true;

        updateRecordingButtons();

        setRecordingState(
            "Listening..."
        );

        state.mediaRecorder.start(100);

        console.log(
            "MediaRecorder started:",
            state.mediaRecorder.mimeType
        );

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

        for (const type of types) {
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

    function handleData(event) {
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
        console.log(
            "Stop requested."
        );

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
            }
        } catch (error) {
            console.error(
                "Stop failed:",
                error
            );

            cleanupRecording();
        }
    }

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
            Number.isFinite(configured)
                ? Math.max(
                    0,
                    configured
                )
                : DEFAULTS.maximumDuration;

        console.log(
            "Maximum recording duration:",
            maximum,
            "seconds"
        );

        if (maximum <= 0) {
            stop();

            return;
        }

        state.maximumDurationTimer =
            setTimeout(
                () => {
                    if (!state.recording) {
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

            state.maximumDurationTimer = null;
        }
    }

    function handleRecorderStopped() {
        console.log(
            "MediaRecorder stopped."
        );

        state.recording = false;

        clearMaximumDurationTimer();
        stopDurationMonitor();
        clearSilenceTimer();

        state.recordingDuration =
            (
                performance.now() -
                state.recordingStartTime
            ) / 1000;

        const blob =
            new Blob(
                state.chunks,
                {
                    type:
                        state.currentMimeType ||
                        "audio/webm"
                }
            );

        state.lastBlob = blob;

        state.lastSentenceId =
            state.currentSentenceId;

        if (state.lastObjectUrl) {
            try {
                URL.revokeObjectURL(
                    state.lastObjectUrl
                );
            } catch (_) {}
        }

        state.lastObjectUrl =
            URL.createObjectURL(blob);

        const sentenceId =
            state.lastSentenceId;

        console.log(
            "Recording ready:",
            {
                sentenceId,
                duration:
                    state.recordingDuration,
                size:
                    blob.size,
                type:
                    blob.type
            }
        );

        stopAudioLevelMonitoring();

        updateRecordingDisplay();

        showRecordingResult();

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

        state.currentSentenceId = null;

        state.mediaRecorder = null;

        updateRecordingButtons();
    }

    function handleRecorderError(event) {
        console.error(
            "MediaRecorder error:",
            event.error
        );

        state.recording = false;

        clearMaximumDurationTimer();
        stopDurationMonitor();
        clearSilenceTimer();
        stopAudioLevelMonitoring();

        state.mediaRecorder = null;

        updateRecordingButtons();

        setRecordingState(
            "Recording error."
        );
    }

    function startDurationMonitor() {
        stopDurationMonitor();

        const tick = () => {
            if (!state.recording) {
                return;
            }

            state.recordingDuration =
                (
                    performance.now() -
                    state.recordingStartTime
                ) / 1000;

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

            state.durationAnimationFrame = null;
        }
    }

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
            if (!state.analyser) {
                return;
            }

            state.analyser.getFloatTimeDomainData(
                data
            );

            const rms =
                calculateRMS(data);

            state.audioLevel = rms;

            updateAudioMeter(rms);

            if (state.recording) {
                monitorSilence(rms);
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

            state.audioAnimationFrame = null;
        }
    }

    function calculateRMS(samples) {
        let sum = 0;

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
            sum / samples.length
        );
    }

    function monitorSilence(level) {
        const threshold =
            Number(
                getConfigValue(
                    "recording.silenceThreshold",
                    DEFAULTS.silenceThreshold
                )
            );

        if (level >= threshold) {
            state.hasSpoken = true;

            clearSilenceTimer();

            return;
        }

        if (!state.hasSpoken) {
            return;
        }

        if (
            state.silenceTimer !== null
        ) {
            return;
        }

        const minimum =
            Number(
                getConfigValue(
                    "recording.minimumDuration",
                    DEFAULTS.minimumDuration
                )
            );

        if (
            state.recordingDuration <
            minimum
        ) {
            return;
        }

        const delay =
            Number(
                getConfigValue(
                    "recording.silenceBeforeStop",
                    DEFAULTS.silenceBeforeStop
                )
            );

        state.silenceTimer =
            setTimeout(
                () => {
                    state.silenceTimer =
                        null;

                    if (!state.recording) {
                        return;
                    }

                    setRecordingState(
                        "Silence detected."
                    );

                    stop();
                },
                Math.max(
                    0,
                    delay
                ) * 1000
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

            state.silenceTimer = null;
        }
    }

    function updateAudioMeter(rms) {
        const meter =
            document.getElementById(
                "audio-meter-level"
            );

        if (!meter) {
            return;
        }

        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    rms * 500
                )
            );

        meter.style.width =
            `${percentage}%`;
    }

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

    function formatDuration(seconds) {
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
            ).padStart(2, "0")}.` +
            `${tenths}`
        );
    }

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

    function redo() {
        console.log(
            "Redo requested."
        );

        if (
            state.recording ||
            state.countdownActive
        ) {
            return;
        }

        hideRecordingResult();

        clearSilenceTimer();

        state.chunks = [];
        state.lastBlob = null;
        state.lastSentenceId = null;
        state.hasSpoken = false;
        state.recordingDuration = 0;

        const sentence =
            getCurrentSentence();

        state.currentSentenceId =
            sentence
                ? sentence.id
                : null;

        if (state.lastObjectUrl) {
            try {
                URL.revokeObjectURL(
                    state.lastObjectUrl
                );
            } catch (_) {}

            state.lastObjectUrl = null;
        }

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

    function saveCurrentRecording() {
        if (!state.lastBlob) {
            setRecordingState(
                "There is no recording to save."
            );

            return;
        }

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
                            state.lastSentenceId,

                        createdAt:
                            new Date().toISOString()
                    }
                }
            )
        );

        setRecordingState(
            "Recording ready to save."
        );

        hideRecordingResult();

        updateRecordingButtons();
    }

    function skip() {
        console.log(
            "Skip button clicked."
        );

        if (
            state.recording ||
            state.countdownActive
        ) {
            console.log(
                "Skip ignored because recorder is busy."
            );

            return;
        }

        const sentence =
            getCurrentSentence();

        if (!sentence) {
            console.warn(
                "Skip: no current sentence."
            );

            setRecordingState(
                "No sentence selected."
            );

            return;
        }

        console.log(
            "Skipping sentence:",
            sentence.id
        );

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

        state.currentSentenceId = null;
        state.lastSentenceId = null;
        state.chunks = [];
        state.lastBlob = null;
        state.hasSpoken = false;
        state.recordingDuration = 0;

        hideRecordingResult();

        if (state.lastObjectUrl) {
            try {
                URL.revokeObjectURL(
                    state.lastObjectUrl
                );
            } catch (_) {}

            state.lastObjectUrl = null;
        }

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

        const busy =
            state.recording ||
            state.countdownActive;

        if (record) {
            record.disabled = busy;
        }

        if (stopButton) {
            stopButton.disabled =
                !state.recording;
        }

        if (redoButton) {
            redoButton.disabled =
                busy ||
                !state.lastBlob;
        }

        if (skipButton) {
            skipButton.disabled =
                busy;
        }
    }

    function getCurrentSentence() {
        if (
            window.Dataset &&
            typeof window.Dataset
                .getCurrentSentence ===
                "function"
        ) {
            const sentence =
                window.Dataset
                    .getCurrentSentence();

            if (sentence) {
                return sentence;
            }
        }

        if (
            window.App &&
            window.App.state &&
            window.App.state.currentSentence
        ) {
            return window.App.state
                .currentSentence;
        }

        return null;
    }

    function findSentenceById(id) {
        if (
            !window.Dataset ||
            typeof window.Dataset
                .getEntries !==
                "function"
        ) {
            return null;
        }

        const entries =
            window.Dataset.getEntries();

        if (!Array.isArray(entries)) {
            return null;
        }

        return (
            entries.find(
                entry =>
                    entry.id === id
            ) || null
        );
    }

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
                path.split(".");

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

    function setRecordingState(message) {
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

    function getMicrophoneErrorMessage(error) {
        if (!error) {
            return (
                "Unable to access microphone."
            );
        }

        switch (error.name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
                return (
                    "Microphone permission was denied. " +
                    "Allow microphone access for localhost."
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

    function formatBytes(bytes) {
        if (
            !Number.isFinite(bytes) ||
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
                    Math.log(bytes) /
                    Math.log(1024)
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

    function hideRecordingResult() {
        const result =
            document.getElementById(
                "recording-result"
            );

        if (result) {
            result.classList.add(
                "hidden"
            );
        }
    }

    function cleanupRecording() {
        state.recording = false;

        clearMaximumDurationTimer();
        stopDurationMonitor();
        clearSilenceTimer();
        stopAudioLevelMonitoring();

        state.mediaRecorder = null;

        updateRecordingButtons();
    }

    function cleanup() {
        console.log(
            "Recorder cleanup."
        );

        clearMaximumDurationTimer();
        stopDurationMonitor();
        clearSilenceTimer();
        stopAudioLevelMonitoring();

        if (state.countdownTimer) {
            clearInterval(
                state.countdownTimer
            );

            state.countdownTimer = null;
        }

        if (state.mediaRecorder) {
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
                    track =>
                        track.stop()
                );

            state.stream = null;
        }

        if (state.audioContext) {
            try {
                state.audioContext.close();
            } catch (_) {}
        }

        if (state.lastObjectUrl) {
            try {
                URL.revokeObjectURL(
                    state.lastObjectUrl
                );
            } catch (_) {}

            state.lastObjectUrl = null;
        }

        state.audioContext = null;
        state.analyser = null;
        state.microphoneSource = null;
        state.mediaRecorder = null;

        state.recording = false;
        state.countdownActive = false;
        state.currentSentenceId = null;

        updateRecordingButtons();
    }

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
                    state.currentMimeType,

                sentenceId:
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