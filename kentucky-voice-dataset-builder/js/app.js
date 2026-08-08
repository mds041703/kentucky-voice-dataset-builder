/*
 * Kentucky Voice Dataset Builder
 * js/app.js
 *
 * Main application controller.
 */

"use strict";

window.App = (() => {

    const VERSION = "0.1.0";


    /* =====================================================
       DEFAULT CONFIGURATION
       ===================================================== */

    const DEFAULT_CONFIG = {

        dataset: {
            name: "Kentucky Voice Dataset",
            speakerId: "speaker_01"
        },

        recording: {
            countdownSeconds: 2,
            silenceBeforeStop: 1.2,
            minimumDuration: 0.5,
            maximumDuration: 15,
            preRollMs: 200,
            silenceThreshold: 0.015
        },

        audio: {
            format: "wav",
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16
        },

        whisper: {
            enabled: true,
            profile: "huggingface",
            delimiter: ","
        },

        generator: {
            category: "general",
            count: 25,
            southernInfluence: 50,
            appalachianInfluence: 50,
            informality: 70
        }
    };


    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        version: VERSION,

        currentPage: "record",

        config: structuredClone(
            DEFAULT_CONFIG
        ),

        currentSentence: null,

        generatedSentences: [],

        dataset: [],

        initialized: false
    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        console.log(
            `Kentucky Voice Dataset Builder v${VERSION}`
        );

        setVersion();

        setupNavigation();

        setupRangeInputs();

        setupSettingsForm();

        setupApplicationEvents();

        loadConfigIntoUI();

        updateGeneratorUI();

        updateDatasetStatistics();

        showPage("record");

        /*
         * Explicitly initialize the recorder here.
         *
         * recorder.js also contains its own DOMContentLoaded
         * startup handler, but Recorder.init() is protected
         * against duplicate initialization.
         *
         * Keeping initialization here guarantees that the
         * Record / Stop / Redo / Skip buttons are connected
         * as part of the main application startup.
         */

        if (
            window.Recorder &&
            typeof window.Recorder.init === "function"
        ) {

            try {

                window.Recorder.init();

                console.log(
                    "Recorder initialized by App."
                );

            } catch (error) {

                console.error(
                    "Recorder initialization failed:",
                    error
                );
            }

        } else {

            console.warn(
                "Recorder is not available during App initialization."
            );
        }


        state.initialized = true;

        setStorageStatus("Local");

        console.log(
            "Application initialized."
        );
    }


    /* =====================================================
       VERSION
       ===================================================== */

    function setVersion() {

        const element =
            document.getElementById(
                "app-version"
            );

        if (element) {

            element.textContent =
                `v${VERSION}`;
        }
    }


    /* =====================================================
       APPLICATION EVENTS
       ===================================================== */

    function setupApplicationEvents() {

        window.addEventListener(
            "kvdb:sentence-skipped",
            () => {

                updateDatasetStatistics();
            }
        );


        window.addEventListener(
            "kvdb:recording-ready",
            () => {

                updateDatasetStatistics();
            }
        );
    }


    /* =====================================================
       NAVIGATION
       ===================================================== */

    function setupNavigation() {

        const buttons =
            document.querySelectorAll(
                ".nav-button[data-page]"
            );

        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showPage(
                            button.dataset.page
                        );
                    }
                );
            }
        );
    }


    function showPage(pageName) {

        const pages =
            document.querySelectorAll(
                ".page[data-page-content]"
            );

        const buttons =
            document.querySelectorAll(
                ".nav-button[data-page]"
            );


        pages.forEach(
            page => {

                page.classList.toggle(
                    "active",
                    page.dataset.pageContent ===
                    pageName
                );
            }
        );


        buttons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                    pageName
                );
            }
        );


        state.currentPage =
            pageName;
    }


    /* =====================================================
       RANGE INPUTS
       ===================================================== */

    function setupRangeInputs() {

        const ranges = [

            {
                input: "generator-southern",
                output: "generator-southern-value"
            },

            {
                input: "generator-appalachian",
                output: "generator-appalachian-value"
            },

            {
                input: "generator-informality",
                output: "generator-informality-value"
            }
        ];


        ranges.forEach(
            item => {

                const input =
                    document.getElementById(
                        item.input
                    );

                const output =
                    document.getElementById(
                        item.output
                    );


                if (!input || !output) {
                    return;
                }


                const update = () => {

                    output.textContent =
                        `${input.value}%`;
                };


                input.addEventListener(
                    "input",
                    update
                );


                update();
            }
        );
    }


    /* =====================================================
       SETTINGS
       ===================================================== */

    function setupSettingsForm() {

        const form =
            document.getElementById(
                "settings-form"
            );


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                readConfigFromUI();

                saveConfig();

                showOperationStatus(
                    "Settings saved.",
                    "success"
                );
            }
        );


        const resetButton =
            document.getElementById(
                "reset-settings-button"
            );


        if (resetButton) {

            resetButton.addEventListener(
                "click",
                () => {

                    state.config =
                        structuredClone(
                            DEFAULT_CONFIG
                        );

                    loadConfigIntoUI();

                    saveConfig();

                    showOperationStatus(
                        "Settings reset to defaults.",
                        "success"
                    );
                }
            );
        }
    }


    function loadConfigIntoUI() {

        const config =
            state.config;


        setValue(
            "setting-dataset-name",
            config.dataset.name
        );

        setValue(
            "setting-speaker-id",
            config.dataset.speakerId
        );

        setValue(
            "setting-countdown",
            config.recording.countdownSeconds
        );

        setValue(
            "setting-silence",
            config.recording.silenceBeforeStop
        );

        setValue(
            "setting-min-duration",
            config.recording.minimumDuration
        );

        setValue(
            "setting-max-duration",
            config.recording.maximumDuration
        );

        setValue(
            "setting-preroll",
            config.recording.preRollMs
        );

        setValue(
            "setting-format",
            config.audio.format
        );

        setValue(
            "setting-sample-rate",
            config.audio.sampleRate
        );

        setValue(
            "setting-channels",
            config.audio.channels
        );

        setValue(
            "setting-bit-depth",
            config.audio.bitDepth
        );

        setChecked(
            "setting-whisper-export",
            config.whisper.enabled
        );

        setValue(
            "setting-whisper-profile",
            config.whisper.profile
        );

        setValue(
            "setting-whisper-delimiter",
            config.whisper.delimiter
        );

        updateGeneratorUI();
    }


    function readConfigFromUI() {

        state.config.dataset.name =
            getValue(
                "setting-dataset-name"
            );


        state.config.dataset.speakerId =
            getValue(
                "setting-speaker-id"
            );


        state.config.recording.countdownSeconds =
            getNumber(
                "setting-countdown"
            );


        state.config.recording.silenceBeforeStop =
            getNumber(
                "setting-silence"
            );


        state.config.recording.minimumDuration =
            getNumber(
                "setting-min-duration"
            );


        state.config.recording.maximumDuration =
            getNumber(
                "setting-max-duration"
            );


        state.config.recording.preRollMs =
            getNumber(
                "setting-preroll"
            );


        state.config.audio.format =
            getValue(
                "setting-format"
            );


        state.config.audio.sampleRate =
            getNumber(
                "setting-sample-rate"
            );


        state.config.audio.channels =
            getNumber(
                "setting-channels"
            );


        state.config.audio.bitDepth =
            getNumber(
                "setting-bit-depth"
            );


        state.config.whisper.enabled =
            getChecked(
                "setting-whisper-export"
            );


        state.config.whisper.profile =
            getValue(
                "setting-whisper-profile"
            );


        state.config.whisper.delimiter =
            getValue(
                "setting-whisper-delimiter"
            );


        updateGeneratorUI();
    }


    function saveConfig() {

        try {

            localStorage.setItem(
                "kvdb-config",
                JSON.stringify(
                    state.config
                )
            );

        } catch (error) {

            console.warn(
                "Could not save configuration:",
                error
            );
        }
    }


    function loadSavedConfig() {

        try {

            const saved =
                localStorage.getItem(
                    "kvdb-config"
                );


            if (!saved) {
                return;
            }


            const parsed =
                JSON.parse(saved);


            state.config =
                mergeConfig(
                    DEFAULT_CONFIG,
                    parsed
                );

        } catch (error) {

            console.warn(
                "Could not load saved configuration:",
                error
            );

            state.config =
                structuredClone(
                    DEFAULT_CONFIG
                );
        }
    }


    function mergeConfig(
        defaults,
        saved
    ) {

        return {

            dataset: {
                ...defaults.dataset,
                ...(saved.dataset || {})
            },

            recording: {
                ...defaults.recording,
                ...(saved.recording || {})
            },

            audio: {
                ...defaults.audio,
                ...(saved.audio || {})
            },

            whisper: {
                ...defaults.whisper,
                ...(saved.whisper || {})
            },

            generator: {
                ...defaults.generator,
                ...(saved.generator || {})
            }
        };
    }


    /* =====================================================
       GENERATOR UI
       ===================================================== */

    function updateGeneratorUI() {

        const config =
            state.config.generator;


        setValue(
            "generator-category",
            config.category
        );

        setValue(
            "generator-count",
            config.count
        );

        setValue(
            "generator-southern",
            config.southernInfluence
        );

        setValue(
            "generator-appalachian",
            config.appalachianInfluence
        );

        setValue(
            "generator-informality",
            config.informality
        );


        updateRangeOutput(
            "generator-southern",
            "generator-southern-value"
        );

        updateRangeOutput(
            "generator-appalachian",
            "generator-appalachian-value"
        );

        updateRangeOutput(
            "generator-informality",
            "generator-informality-value"
        );
    }


    function updateRangeOutput(
        inputId,
        outputId
    ) {

        const input =
            document.getElementById(
                inputId
            );

        const output =
            document.getElementById(
                outputId
            );


        if (!input || !output) {
            return;
        }


        output.textContent =
            `${input.value}%`;
    }


    /* =====================================================
       UI HELPERS
       ===================================================== */

    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.value = value;
        }
    }


    function getValue(id) {

        const element =
            document.getElementById(id);


        return element
            ? element.value
            : "";
    }


    function getNumber(id) {

        const value =
            Number(
                getValue(id)
            );


        return Number.isFinite(value)
            ? value
            : 0;
    }


    function setChecked(
        id,
        checked
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.checked =
                Boolean(checked);
        }
    }


    function getChecked(id) {

        const element =
            document.getElementById(id);


        return element
            ? element.checked
            : false;
    }


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
    }


    function setStorageStatus(
        message
    ) {

        const element =
            document.getElementById(
                "storage-status"
            );


        if (element) {
            element.textContent =
                message;
        }
    }


    function showOperationStatus(
        message,
        type = ""
    ) {

        const element =
            document.getElementById(
                "import-export-status"
            );


        if (!element) {
            return;
        }


        element.textContent =
            message;


        element.className =
            "operation-status";


        if (type) {
            element.classList.add(type);
        }
    }


    /* =====================================================
       DATASET STATISTICS
       ===================================================== */

    function updateDatasetStatistics() {

        const dataset =
            state.dataset;


        const total =
            dataset.length;


        const recorded =
            dataset.filter(
                item =>
                    item.status ===
                    "recorded"
            ).length;


        const pending =
            dataset.filter(
                item =>
                    item.status ===
                    "pending"
            ).length;


        const skipped =
            dataset.filter(
                item =>
                    item.status ===
                    "skipped"
            ).length;


        setText(
            "stat-total",
            total
        );

        setText(
            "stat-recorded",
            recorded
        );

        setText(
            "stat-pending",
            pending
        );

        setText(
            "stat-skipped",
            skipped
        );


        const duration =
            dataset.reduce(
                (
                    totalDuration,
                    item
                ) =>
                    totalDuration +
                    (
                        item.recording &&
                        Number(
                            item.recording.duration
                        ) || 0
                    ),
                0
            );


        setText(
            "stat-duration",
            formatDuration(duration)
        );
    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.textContent =
                value;
        }
    }


    function formatDuration(
        seconds
    ) {

        if (
            !Number.isFinite(seconds) ||
            seconds <= 0
        ) {
            return "0:00";
        }


        const totalSeconds =
            Math.floor(seconds);


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const remaining =
            totalSeconds % 60;


        return (
            `${minutes}:` +
            `${String(
                remaining
            ).padStart(2, "0")}`
        );
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        state,

        DEFAULT_CONFIG,

        showPage,

        loadSavedConfig,

        saveConfig,

        updateDatasetStatistics,

        setRecordingState,

        setStorageStatus,

        showOperationStatus
    };

})();


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
         * Configuration MUST be loaded before
         * Recorder or Generator uses it.
         */

        App.loadSavedConfig();

        await App.init();
    }
);