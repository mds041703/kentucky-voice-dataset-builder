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

        if (state.initialized) {
            return;
        }


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

        syncDatasetFromModule();

        updateDatasetStatistics();

        showPage(
            state.currentPage || "record"
        );


        /*
         * Recorder may already have initialized itself
         * through its own DOMContentLoaded handler.
         *
         * Recorder.init() is intentionally safe to call
         * more than once.
         */

        if (
            window.Recorder &&
            typeof window.Recorder.init ===
                "function"
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

        setStorageStatus(
            "Local"
        );


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

        /*
         * Prevent duplicate listeners if init() is ever
         * called manually before the normal application
         * startup sequence.
         */

        if (state._eventsInitialized) {
            return;
        }


        state._eventsInitialized =
            true;


        window.addEventListener(
            "kvdb:sentence-skipped",
            event => {

                syncDatasetFromModule();

                updateDatasetStatistics();

                /*
                 * Dataset normally advances the current
                 * sentence after a skip. Keep App's
                 * reference synchronized with it.
                 */

                syncCurrentSentence();
            }
        );


        window.addEventListener(
            "kvdb:recording-ready",
            event => {

                syncDatasetFromModule();

                updateDatasetStatistics();

                /*
                 * Dataset is responsible for committing
                 * the recording. App only refreshes its
                 * local view here.
                 */

                syncCurrentSentence();
            }
        );


        window.addEventListener(
            "kvdb:save-recording",
            () => {

                syncDatasetFromModule();

                updateDatasetStatistics();
            }
        );


        window.addEventListener(
            "kvdb:dataset-changed",
            () => {

                syncDatasetFromModule();

                updateDatasetStatistics();

                syncCurrentSentence();
            }
        );
    }


    /* =====================================================
       DATASET SYNCHRONIZATION
       ===================================================== */

    function syncDatasetFromModule() {

        if (
            window.Dataset &&
            typeof window.Dataset.getEntries ===
                "function"
        ) {

            try {

                const entries =
                    window.Dataset.getEntries();


                if (Array.isArray(entries)) {

                    state.dataset =
                        entries;
                }

            } catch (error) {

                console.warn(
                    "Unable to synchronize dataset:",
                    error
                );
            }
        }
    }


    function syncCurrentSentence() {

        let sentence =
            null;


        if (
            window.Dataset &&
            typeof window.Dataset.getCurrentSentence ===
                "function"
        ) {

            try {

                sentence =
                    window.Dataset
                        .getCurrentSentence();

            } catch (error) {

                console.warn(
                    "Unable to get current dataset sentence:",
                    error
                );
            }
        }


        if (
            !sentence &&
            window.Dataset &&
            typeof window.Dataset.getCurrentEntry ===
                "function"
        ) {

            try {

                sentence =
                    window.Dataset
                        .getCurrentEntry();

            } catch (error) {

                console.warn(
                    "Unable to get current dataset entry:",
                    error
                );
            }
        }


        if (sentence) {

            state.currentSentence =
                sentence;
        }
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

                /*
                 * Avoid attaching the same handler more
                 * than once if setupNavigation() is called.
                 */

                if (
                    button.dataset.kvdbNavigationBound ===
                    "true"
                ) {

                    return;
                }


                button.dataset.kvdbNavigationBound =
                    "true";


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


    function showPage(
        pageName
    ) {

        const pages =
            document.querySelectorAll(
                ".page[data-page-content]"
            );

        const buttons =
            document.querySelectorAll(
                ".nav-button[data-page]"
            );


        const targetPage =
            String(
                pageName || "record"
            );


        pages.forEach(
            page => {

                page.classList.toggle(
                    "active",
                    page.dataset.pageContent ===
                        targetPage
                );
            }
        );


        buttons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                        targetPage
                );
            }
        );


        state.currentPage =
            targetPage;
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


                if (
                    input.dataset.kvdbRangeBound ===
                    "true"
                ) {

                    updateRangeOutput(
                        item.input,
                        item.output
                    );

                    return;
                }


                input.dataset.kvdbRangeBound =
                    "true";


                input.addEventListener(
                    "input",
                    () => {

                        output.textContent =
                            `${input.value}%`;
                    }
                );


                updateRangeOutput(
                    item.input,
                    item.output
                );
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


        if (
            form.dataset.kvdbSettingsBound ===
            "true"
        ) {

            return;
        }


        form.dataset.kvdbSettingsBound =
            "true";


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

            if (
                resetButton.dataset.kvdbResetBound !==
                "true"
            ) {

                resetButton.dataset.kvdbResetBound =
                    "true";


                resetButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


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
            "setting-silence-threshold",
            config.recording.silenceThreshold
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


        /*
         * The recorder uses this setting directly.
         * Older HTML versions may not contain the field,
         * in which case the existing value is preserved.
         */

        const silenceThresholdElement =
            document.getElementById(
                "setting-silence-threshold"
            );


        if (silenceThresholdElement) {

            state.config.recording.silenceThreshold =
                getNumber(
                    "setting-silence-threshold"
                );
        }


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


        /*
         * Generator settings are part of the same
         * application configuration and must be read
         * when Settings is saved.
         */

        const generatorCategory =
            document.getElementById(
                "generator-category"
            );


        if (generatorCategory) {

            state.config.generator.category =
                getValue(
                    "generator-category"
                );
        }


        const generatorCount =
            document.getElementById(
                "generator-count"
            );


        if (generatorCount) {

            state.config.generator.count =
                getNumber(
                    "generator-count"
                );
        }


        const generatorSouthern =
            document.getElementById(
                "generator-southern"
            );


        if (generatorSouthern) {

            state.config.generator.southernInfluence =
                getNumber(
                    "generator-southern"
                );
        }


        const generatorAppalachian =
            document.getElementById(
                "generator-appalachian"
            );


        if (generatorAppalachian) {

            state.config.generator.appalachianInfluence =
                getNumber(
                    "generator-appalachian"
                );
        }


        const generatorInformality =
            document.getElementById(
                "generator-informality"
            );


        if (generatorInformality) {

            state.config.generator.informality =
                getNumber(
                    "generator-informality"
                );
        }


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


            /*
             * Let other application modules know that
             * configuration changed.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "kvdb:config-changed",
                    {
                        detail: {
                            config:
                                structuredClone(
                                    state.config
                                )
                        }
                    }
                )
            );


            return true;

        } catch (error) {

            console.warn(
                "Could not save configuration:",
                error
            );

            return false;
        }
    }


    function loadSavedConfig() {

        try {

            const saved =
                localStorage.getItem(
                    "kvdb-config"
                );


            if (!saved) {

                state.config =
                    structuredClone(
                        DEFAULT_CONFIG
                    );

                return;
            }


            const parsed =
                JSON.parse(
                    saved
                );


            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {

                throw new Error(
                    "Saved configuration is invalid."
                );
            }


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

        const safeSaved =
            saved &&
            typeof saved === "object"
                ? saved
                : {};


        return {

            dataset: {
                ...defaults.dataset,
                ...(safeSaved.dataset || {})
            },

            recording: {
                ...defaults.recording,
                ...(safeSaved.recording || {})
            },

            audio: {
                ...defaults.audio,
                ...(safeSaved.audio || {})
            },

            whisper: {
                ...defaults.whisper,
                ...(safeSaved.whisper || {})
            },

            generator: {
                ...defaults.generator,
                ...(safeSaved.generator || {})
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
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value ?? "";
        }
    }


    function getValue(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        return element
            ? element.value
            : "";
    }


    function getNumber(
        id
    ) {

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
            document.getElementById(
                id
            );


        if (element) {

            element.checked =
                Boolean(checked);
        }
    }


    function getChecked(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


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

            element.classList.add(
                type
            );
        }
    }


    /* =====================================================
       DATASET STATISTICS
       ===================================================== */

    function updateDatasetStatistics() {

        syncDatasetFromModule();


        const dataset =
            Array.isArray(
                state.dataset
            )
                ? state.dataset
                : [];


        const total =
            dataset.length;


        const recorded =
            dataset.filter(
                item =>
                    item &&
                    item.status ===
                        "recorded"
            ).length;


        const pending =
            dataset.filter(
                item =>
                    item &&
                    item.status ===
                        "pending"
            ).length;


        const skipped =
            dataset.filter(
                item =>
                    item &&
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
                ) => {

                    if (
                        !item ||
                        !item.recording
                    ) {

                        return totalDuration;
                    }


                    const itemDuration =
                        Number(
                            item.recording.duration
                        );


                    return (
                        totalDuration +
                        (
                            Number.isFinite(
                                itemDuration
                            )
                                ? Math.max(
                                    0,
                                    itemDuration
                                )
                                : 0
                        )
                    );
                },
                0
            );


        setText(
            "stat-duration",
            formatDuration(
                duration
            )
        );
    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value;
        }
    }


    function formatDuration(
        seconds
    ) {

        const value =
            Number(seconds);


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            return "0:00";
        }


        const totalSeconds =
            Math.floor(
                value
            );


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
            ).padStart(
                2,
                "0"
            )}`
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

        showOperationStatus,

        syncDatasetFromModule,

        syncCurrentSentence
    };

})();


/* =========================================================
   START APPLICATION
   ========================================================= */

function startApplication() {

    if (
        !window.App ||
        typeof window.App.init !==
            "function"
    ) {

        console.error(
            "App is not available."
        );

        return;
    }


    /*
     * Configuration MUST be loaded before
     * Recorder, Generator, or other modules
     * use App.state.config.
     */

    App.loadSavedConfig();


    Promise.resolve(
        App.init()
    ).catch(
        error => {

            console.error(
                "Application initialization failed:",
                error
            );
        }
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startApplication,
        {
            once: true
        }
    );

} else {

    /*
     * Handles scripts loaded after DOMContentLoaded.
     * Humans have invented several ways to load JavaScript;
     * apparently one event handler was too simple.
     */

    startApplication();
}
