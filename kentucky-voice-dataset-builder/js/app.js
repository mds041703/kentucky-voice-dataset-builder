/*
 * Kentucky Voice Dataset Builder
 * js/app.js
 *
 * Main application controller.
 *
 * Storage architecture:
 *
 *   IndexedDB
 *       ↓
 *   Storage
 *       ↓
 *   App.state
 *       ↓
 *   Dataset / UI
 *
 * IndexedDB is the persistent source of truth for application
 * configuration and dataset entries. App.state is only the
 * in-memory working state.
 */

"use strict";

window.App = (() => {

    const VERSION = "0.5.1";


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

        initialized: false,

        storageInitialized: false,

        _eventsInitialized: false
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


        /*
         * IndexedDB MUST be initialized before anything
         * attempts to read or write persistent application
         * data.
         */

        await initializeStorage();


        /*
         * Load configuration from IndexedDB before any
         * module uses App.state.config.
         */

        await loadSavedConfig();


        /*
         * The previous version called setVersion() here,
         * but no such function existed. The application
         * version is already stored in state.version and
         * displayed by the startup log.
         *
         * If a version element exists in the UI, update it.
         */

        setVersion();


        setupNavigation();

        setupRangeInputs();

        setupSettingsForm();

        setupApplicationEvents();
function setupCustomSentence() {
    const button = document.getElementById(
        "add-custom-sentence-button"
    );

    if (!button) {
        return;
    }

    if (button.dataset.kvdbCustomSentenceBound === "true") {
        return;
    }

    button.dataset.kvdbCustomSentenceBound = "true";

    button.addEventListener(
        "click",
        () => {
            if (
                window.Dataset &&
                typeof window.Dataset.addCustomSentence ===
                    "function"
            ) {
                window.Dataset.addCustomSentence();
            }
        }
    );
}

        /*
         * Load the dataset from IndexedDB through Dataset.
         *
         * Dataset.init() is responsible for loading the
         * persistent entries into its in-memory state.
         */

        await initializeDataset();


        loadConfigIntoUI();

        updateGeneratorUI();

        syncDatasetFromModule();

        syncCurrentSentence();

        updateDatasetStatistics();

        showPage(
            state.currentPage || "record"
        );


        /*
         * Recorder initialization happens only after
         * Storage, configuration, and Dataset have been
         * initialized.
         */

        if (
            window.Recorder &&
            typeof window.Recorder.init ===
                "function"
        ) {

            try {

                await Promise.resolve(
                    window.Recorder.init()
                );

                console.log(
                    "Recorder initialized by App."
                );

            } catch (error) {

                console.error(
                    "Recorder initialization failed:",
                    error
                );

                setRecordingState(
                    "Recorder unavailable"
                );
            }

        } else {

            console.warn(
                "Recorder is not available during App initialization."
            );
        }


        state.initialized = true;


        setStorageStatus(
            "Local • Saved"
        );


        console.log(
            "Application initialized."
        );
    }


    /* =====================================================
       VERSION
       ===================================================== */

    function setVersion() {

        /*
         * Update any version elements that exist in the UI.
         *
         * Multiple selectors are supported so the HTML can
         * use whichever version element is appropriate.
         */

        const selectors = [

            "#app-version",
            "#version",
            ".app-version",
            "[data-app-version]"
        ];


        const updated = new Set();


        selectors.forEach(
            selector => {

                const elements =
                    document.querySelectorAll(
                        selector
                    );


                elements.forEach(
                    element => {

                        if (
                            updated.has(
                                element
                            )
                        ) {

                            return;
                        }


                        updated.add(
                            element
                        );


                        element.textContent =
                            `v${VERSION}`;
                    }
                );
            }
        );


        /*
         * Also expose the current version on the root
         * application element when one exists.
         */

        const appElement =
            document.querySelector(
                "[data-app-version]"
            );


        if (appElement) {

            appElement.dataset.appVersion =
                VERSION;
        }
    }


    /* =====================================================
       STORAGE INITIALIZATION
       ===================================================== */

    async function initializeStorage() {

        if (state.storageInitialized) {
            return;
        }


        if (
            !window.Storage ||
            typeof window.Storage.init !==
                "function"
        ) {

            setStorageStatus(
                "Storage unavailable"
            );


            throw new Error(
                "Storage module is unavailable. IndexedDB cannot be initialized."
            );
        }


        try {

            setStorageStatus(
                "Opening local storage..."
            );


            await window.Storage.init();


            state.storageInitialized =
                true;


            setStorageStatus(
                "Local • Ready"
            );


            console.log(
                "IndexedDB initialized."
            );

        } catch (error) {

            setStorageStatus(
                "Storage error"
            );


            console.error(
                "IndexedDB initialization failed:",
                error
            );


            throw new Error(
                "Unable to initialize IndexedDB.",
                {
                    cause: error
                }
            );
        }
    }


    /* =====================================================
       DATASET INITIALIZATION
       ===================================================== */

    async function initializeDataset() {

        if (
            !window.Dataset ||
            typeof window.Dataset.init !==
                "function"
        ) {

            console.warn(
                "Dataset module is unavailable."
            );

            state.dataset = [];

            return;
        }


        try {

            /*
             * Dataset.init() must load entries from
             * IndexedDB and populate its internal state.
             */

            await Promise.resolve(
                window.Dataset.init()
            );


            syncDatasetFromModule();

            syncCurrentSentence();


            console.log(
                `Dataset initialized with ${state.dataset.length} entries.`
            );

        } catch (error) {

            console.error(
                "Dataset initialization failed:",
                error
            );


            state.dataset = [];


            throw new Error(
                "Unable to initialize the dataset.",
                {
                    cause: error
                }
            );
        }
    }


    /* =====================================================
       APPLICATION EVENTS
       ===================================================== */

    function setupApplicationEvents() {

        if (state._eventsInitialized) {
            return;
        }


        state._eventsInitialized =
            true;


        window.addEventListener(
            "kvdb:sentence-skipped",
            () => {

                syncDatasetFromModule();

                updateDatasetStatistics();

                syncCurrentSentence();
            }
        );


        window.addEventListener(
            "kvdb:recording-ready",
            () => {

                syncDatasetFromModule();

                updateDatasetStatistics();

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


        window.addEventListener(
            "kvdb:config-changed",
            event => {

                if (
                    event &&
                    event.detail &&
                    event.detail.config
                ) {

                    state.config =
                        mergeConfig(
                            DEFAULT_CONFIG,
                            event.detail.config
                        );
                }


                loadConfigIntoUI();

                updateGeneratorUI();
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

                    /*
                     * Keep App's state as a reference to
                     * Dataset's current in-memory state.
                     *
                     * Persistence is handled by Dataset /
                     * Storage, not by this function.
                     */

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


        state.currentSentence =
            sentence || null;
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
            async event => {

                event.preventDefault();


                try {

                    readConfigFromUI();

                    await saveConfig();


                    showOperationStatus(
                        "Settings saved.",
                        "success"
                    );

                } catch (error) {

                    console.error(
                        "Could not save settings:",
                        error
                    );


                    showOperationStatus(
                        "Settings could not be saved.",
                        "error"
                    );
                }
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
                    async event => {

                        event.preventDefault();


                        state.config =
                            structuredClone(
                                DEFAULT_CONFIG
                            );


                        loadConfigIntoUI();


                        try {

                            await saveConfig();


                            showOperationStatus(
                                "Settings reset to defaults.",
                                "success"
                            );

                        } catch (error) {

                            console.error(
                                "Could not save reset settings:",
                                error
                            );


                            showOperationStatus(
                                "Settings were reset in memory but could not be saved.",
                                "error"
                            );
                        }
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

        const datasetName =
            getValue(
                "setting-dataset-name"
            ).trim();


        const speakerId =
            getValue(
                "setting-speaker-id"
            ).trim();


        const countdownSeconds =
            getNumber(
                "setting-countdown"
            );


        const silenceBeforeStop =
            getNumber(
                "setting-silence"
            );


        const minimumDuration =
            getNumber(
                "setting-min-duration"
            );


        const maximumDuration =
            getNumber(
                "setting-max-duration"
            );


        const preRollMs =
            getNumber(
                "setting-preroll"
            );


        const silenceThresholdElement =
            document.getElementById(
                "setting-silence-threshold"
            );


        let silenceThreshold =
            state.config.recording.silenceThreshold;


        if (silenceThresholdElement) {

            silenceThreshold =
                getNumber(
                    "setting-silence-threshold"
                );
        }


        /*
         * Reject obviously invalid recording
         * configuration instead of silently converting
         * bad values into zero.
         */

        if (
            !Number.isFinite(countdownSeconds) ||
            !Number.isFinite(silenceBeforeStop) ||
            !Number.isFinite(minimumDuration) ||
            !Number.isFinite(maximumDuration) ||
            !Number.isFinite(preRollMs) ||
            !Number.isFinite(silenceThreshold) ||
            countdownSeconds < 0 ||
            silenceBeforeStop <= 0 ||
            minimumDuration <= 0 ||
            maximumDuration <= 0 ||
            minimumDuration > maximumDuration ||
            preRollMs < 0 ||
            silenceThreshold < 0
        ) {

            throw new Error(
                "Recording settings contain invalid values."
            );
        }


        if (!datasetName) {

            throw new Error(
                "Dataset name cannot be empty."
            );
        }


        if (!speakerId) {

            throw new Error(
                "Speaker ID cannot be empty."
            );
        }


        state.config.dataset.name =
            datasetName;


        state.config.dataset.speakerId =
            speakerId;


        state.config.recording.countdownSeconds =
            countdownSeconds;


        state.config.recording.silenceBeforeStop =
            silenceBeforeStop;


        state.config.recording.minimumDuration =
            minimumDuration;


        state.config.recording.maximumDuration =
            maximumDuration;


        state.config.recording.preRollMs =
            preRollMs;


        state.config.recording.silenceThreshold =
            silenceThreshold;


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


        updateGeneratorConfigFromUI();

        updateGeneratorUI();
    }


    function updateGeneratorConfigFromUI() {

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

            const count =
                getNumber(
                    "generator-count"
                );


            if (
                Number.isFinite(count) &&
                count >= 1 &&
                count <= 1000
            ) {

                state.config.generator.count =
                    Math.floor(
                        count
                    );
            }
        }


        const generatorSouthern =
            document.getElementById(
                "generator-southern"
            );


        if (generatorSouthern) {

            state.config.generator.southernInfluence =
                clamp(
                    getNumber(
                        "generator-southern"
                    ),
                    0,
                    100
                );
        }


        const generatorAppalachian =
            document.getElementById(
                "generator-appalachian"
            );


        if (generatorAppalachian) {

            state.config.generator.appalachianInfluence =
                clamp(
                    getNumber(
                        "generator-appalachian"
                    ),
                    0,
                    100
                );
        }


        const generatorInformality =
            document.getElementById(
                "generator-informality"
            );


        if (generatorInformality) {

            state.config.generator.informality =
                clamp(
                    getNumber(
                        "generator-informality"
                    ),
                    0,
                    100
                );
        }
    }


    /* =====================================================
       SAVE CONFIGURATION
       ===================================================== */

    async function saveConfig() {

        if (!state.storageInitialized) {

            await initializeStorage();
        }


        if (
            !window.Storage ||
            typeof window.Storage.saveConfig !==
                "function"
        ) {

            throw new Error(
                "Storage.saveConfig() is unavailable."
            );
        }


        const config =
            structuredClone(
                state.config
            );


        /*
         * Storage.saveConfig() already knows the
         * configuration storage key. Do not pass an
         * additional "app" key.
         */

        await window.Storage.saveConfig(
            config
        );


        window.dispatchEvent(
            new CustomEvent(
                "kvdb:config-changed",
                {
                    detail: {
                        config
                    }
                }
            )
        );


        return true;
    }


    /* =====================================================
       LOAD CONFIGURATION
       ===================================================== */

    async function loadSavedConfig() {

        if (!state.storageInitialized) {

            await initializeStorage();
        }


        try {

            if (
                window.Storage &&
                typeof window.Storage.loadConfig ===
                    "function"
            ) {

                const saved =
                    await window.Storage.loadConfig(
                        null
                    );


                if (
                    saved &&
                    typeof saved === "object" &&
                    !Array.isArray(saved)
                ) {

                    state.config =
                        mergeConfig(
                            DEFAULT_CONFIG,
                            saved
                        );


                    return true;
                }
            }


            /*
             * No saved configuration exists.
             * Start with defaults and save them to IndexedDB.
             */

            state.config =
                structuredClone(
                    DEFAULT_CONFIG
                );


            if (
                window.Storage &&
                typeof window.Storage.saveConfig ===
                    "function"
            ) {

                await window.Storage.saveConfig(
                    structuredClone(
                        state.config
                    )
                );
            }


            return true;

        } catch (error) {

            console.error(
                "Could not load saved configuration from IndexedDB:",
                error
            );


            state.config =
                structuredClone(
                    DEFAULT_CONFIG
                );


            throw error;
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

        const element =
            document.getElementById(
                id
            );


        if (!element) {
            return 0;
        }


        const value =
            Number(
                element.value
            );


        return Number.isFinite(value)
            ? value
            : NaN;
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
       GENERAL HELPERS
       ===================================================== */

    function clamp(
        value,
        minimum,
        maximum
    ) {

        const number =
            Number(value);


        if (!Number.isFinite(number)) {
            return minimum;
        }


        return Math.min(
            maximum,
            Math.max(
                minimum,
                number
            )
        );
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        state,

        DEFAULT_CONFIG,

        VERSION,

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

async function startApplication() {

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


    try {

        /*
         * App.init() owns the complete startup sequence:
         *
         *   IndexedDB
         *       ↓
         *   configuration
         *       ↓
         *   Dataset
         *       ↓
         *   UI
         *       ↓
         *   Recorder
         *
         * Do NOT load configuration separately here.
         */

        await App.init();

    } catch (error) {

        console.error(
            "Application initialization failed:",
            error
        );


        if (
            window.App &&
            typeof window.App.setStorageStatus ===
                "function"
        ) {

            App.setStorageStatus(
                "Storage error"
            );
        }
    }
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

    startApplication();
}
