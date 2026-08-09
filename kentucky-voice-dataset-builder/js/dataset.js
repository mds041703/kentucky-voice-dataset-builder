"use strict";

window.Dataset = (() => {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        initialized: false,

        entries: [],

        currentIndex: -1,

        nextId: 1,

        objectUrls: new Map()

    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        await loadFromStorage();

        setupEvents();

        setupDatasetControls();

        render();

        updateStatistics();

        updateCurrentSentence();

        state.initialized = true;

        console.log(
            "Dataset manager initialized.",
            state.entries.length,
            "entries"
        );
    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function setupEvents() {

        window.addEventListener(
            "kvdb:recording-ready",
            event => {

                if (!event.detail) {
                    return;
                }

                receiveRecording(
                    event.detail
                );
            }
        );


        window.addEventListener(
            "kvdb:sentence-skipped",
            event => {

                if (!event.detail) {
                    return;
                }

                markSkipped(
                    event.detail
                );
            }
        );


        window.addEventListener(
            "kvdb:advance-sentence",
            () => {

                updateCurrentSentence();

            }
        );


        window.addEventListener(
            "kvdb:sentences-added",
            event => {

                if (
                    !event.detail ||
                    !Array.isArray(event.detail)
                ) {
                    return;
                }

                addSentences(
                    event.detail
                );
            }
        );
    }


    /* =====================================================
       DATASET CONTROLS
       ===================================================== */

    function setupDatasetControls() {

        const search =
            document.getElementById(
                "dataset-search"
            );

        const filter =
            document.getElementById(
                "dataset-filter"
            );


        if (search) {

            search.addEventListener(
                "input",
                render
            );
        }


        if (filter) {

            filter.addEventListener(
                "change",
                render
            );
        }
    }


    /* =====================================================
       LOAD DATASET FROM STORAGE
       ===================================================== */

    async function loadFromStorage() {

        if (
            !window.Storage ||
            typeof window.Storage.getAllEntries !==
                "function"
        ) {

            loadFromAppState();

            return;
        }


        try {

            await window.Storage.init();


            const storedEntries =
                await window.Storage.getAllEntries();


            if (
                Array.isArray(storedEntries) &&
                storedEntries.length > 0
            ) {

                state.entries =
                    storedEntries;

            } else {

                loadFromAppState();
            }


            state.entries.forEach(
                normalizeEntry
            );


            state.nextId =
                calculateNextId(
                    state.entries
                );


            if (
                window.App &&
                window.App.state &&
                window.App.state.currentSentence
            ) {

                const current =
                    window.App.state.currentSentence;


                const index =
                    state.entries.findIndex(
                        entry =>
                            entry.id === current.id
                    );


                if (index !== -1) {

                    state.currentIndex =
                        index;
                }
            }

        } catch (error) {

            console.error(
                "Unable to load dataset from IndexedDB:",
                error
            );


            loadFromAppState();
        }
    }


    /* =====================================================
       LOAD APP STATE FALLBACK
       ===================================================== */

    function loadFromAppState() {

        if (
            window.App &&
            window.App.state &&
            Array.isArray(
                window.App.state.dataset
            )
        ) {

            state.entries =
                window.App.state.dataset;

        } else {

            state.entries = [];
        }


        state.entries.forEach(
            normalizeEntry
        );


        state.nextId =
            calculateNextId(
                state.entries
            );


        if (
            window.App &&
            window.App.state &&
            window.App.state.currentSentence
        ) {

            const current =
                window.App.state.currentSentence;


            const index =
                state.entries.findIndex(
                    entry =>
                        entry.id === current.id
                );


            if (index !== -1) {

                state.currentIndex =
                    index;
            }
        }
    }


    /* =====================================================
       NORMALIZE ENTRY
       ===================================================== */

    function normalizeEntry(
        entry
    ) {

        if (
            !entry ||
            typeof entry !== "object"
        ) {

            return entry;
        }


        /*
         * Support older dataset entries where audio was
         * stored directly as audioBlob.
         */

        if (
            !entry.recording &&
            entry.audioBlob
        ) {

            entry.recording = {

                blob:
                    entry.audioBlob,

                duration:
                    Number(
                        entry.duration
                    ) || 0,

                mimeType:
                    entry.audioBlob.type ||
                    "",

                createdAt:
                    entry.createdAt ||
                    new Date().toISOString()
            };
        }


        if (
            entry.recording &&
            typeof entry.recording === "object"
        ) {

            if (
                entry.recording.duration ===
                undefined
            ) {

                entry.recording.duration =
                    Number(
                        entry.duration
                    ) || 0;
            }


            if (
                !entry.recording.mimeType
            ) {

                entry.recording.mimeType =
                    (
                        entry.recording.blob &&
                        entry.recording.blob.type
                    ) ||
                    entry.mimeType ||
                    "";
            }


            if (
                !entry.recording.createdAt
            ) {

                entry.recording.createdAt =
                    entry.createdAt ||
                    new Date().toISOString();
            }
        }


        if (
            entry.recording &&
            entry.recording.blob
        ) {

            if (
                !entry.status ||
                entry.status === "pending"
            ) {

                entry.status =
                    "recorded";
            }
        }


        entry.text =
            String(
                entry.text || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        entry.category =
            entry.category ||
            "general";


        entry.intent =
            entry.intent ||
            null;


        entry.style =
            entry.style ||
            "neutral";


        entry.regionalInfluence =
            Array.isArray(
                entry.regionalInfluence
            )
                ? entry.regionalInfluence
                : [];


        entry.pronunciationTargets =
            Array.isArray(
                entry.pronunciationTargets
            )
                ? entry.pronunciationTargets
                : [];


        entry.template =
            entry.template ||
            null;


        entry.status =
            entry.status ||
            "pending";


        entry.createdAt =
            entry.createdAt ||
            new Date().toISOString();


        entry.updatedAt =
            entry.updatedAt ||
            entry.createdAt;


        return entry;
    }


    /* =====================================================
       CALCULATE NEXT ID
       ===================================================== */

    function calculateNextId(
        entries
    ) {

        let highest = 0;


        entries.forEach(
            entry => {

                const number =
                    parseInt(
                        String(
                            entry.id || ""
                        ),
                        10
                    );


                if (
                    Number.isFinite(number) &&
                    number > highest
                ) {

                    highest = number;
                }
            }
        );


        return highest + 1;
    }


    /* =====================================================
       SENTENCE CREATION
       ===================================================== */

    function createSentence(
        text,
        options = {}
    ) {

        const cleanText =
            String(text || "")
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        if (!cleanText) {
            return null;
        }


        const now =
            new Date().toISOString();


        return {

            id:
                generateId(),

            text:
                cleanText,

            category:
                options.category ||
                "general",

            intent:
                options.intent ||
                null,

            style:
                options.style ||
                "neutral",

            regionalInfluence:
                Array.isArray(
                    options.regionalInfluence
                )
                    ? [
                        ...options.regionalInfluence
                    ]
                    : [],

            pronunciationTargets:
                Array.isArray(
                    options.pronunciationTargets
                )
                    ? [
                        ...options.pronunciationTargets
                    ]
                    : [],

            template:
                options.template ||
                null,

            status:
                "pending",

            recording:
                null,

            createdAt:
                now,

            updatedAt:
                now
        };
    }


    /* =====================================================
       ID GENERATION
       ===================================================== */

    function generateId() {

        const id =
            String(
                state.nextId
            ).padStart(
                6,
                "0"
            );


        state.nextId += 1;


        return id;
    }


    /* =====================================================
       DATASET CHANGE NOTIFICATION
       ===================================================== */

    function notifyDatasetChanged(
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "kvdb:dataset-changed",
                    {
                        detail: {
                            entries:
                                state.entries,

                            currentIndex:
                                state.currentIndex,

                            currentSentence:
                                getCurrentSentence(),

                            ...detail
                        }
                    }
                )
            );

        } catch (error) {

            console.warn(
                "Unable to dispatch dataset change event:",
                error
            );
        }
    }


    /* =====================================================
       ADD SENTENCE
       ===================================================== */

    function addSentence(
        text,
        options = {}
    ) {

        const sentence =
            createSentence(
                text,
                options
            );


        if (!sentence) {
            return null;
        }


        state.entries.push(
            sentence
        );


        if (
            state.currentIndex === -1
        ) {

            state.currentIndex =
                state.entries.length - 1;


            setCurrentSentence(
                sentence
            );
        }


        syncAppState();

        render();

        updateStatistics();

        notifyDatasetChanged({
            action: "add",
            entry: sentence
        });


        return sentence;
    }


    /* =====================================================
       ADD SENTENCES
       ===================================================== */

    function addSentences(
        sentences
    ) {

        if (
            !Array.isArray(sentences)
        ) {

            return [];
        }


        const added = [];


        sentences.forEach(
            item => {

                let sentence = null;


                if (
                    typeof item ===
                    "string"
                ) {

                    sentence =
                        createSentence(
                            item
                        );

                } else if (
                    item &&
                    typeof item ===
                    "object"
                ) {

                    sentence =
                        createSentence(
                            item.text,
                            item
                        );
                }


                if (sentence) {

                    state.entries.push(
                        sentence
                    );


                    added.push(
                        sentence
                    );
                }
            }
        );


        if (
            added.length === 0
        ) {

            return added;
        }


        if (
            state.currentIndex === -1
        ) {

            const index =
                findNextPendingIndexFrom(
                    -1
                );


            if (index !== -1) {

                state.currentIndex =
                    index;


                setCurrentSentence(
                    state.entries[index]
                );
            }
        }


        if (
            window.App &&
            window.App.state &&
            !window.App.state.currentSentence
        ) {

            const current =
                getCurrentSentence();


            if (current) {

                setCurrentSentence(
                    current
                );
            }
        }


        syncAppState();

        render();

        updateStatistics();

        notifyDatasetChanged({
            action: "add-multiple",
            entries: added
        });


        return added;
    }


    /* =====================================================
       CUSTOM SENTENCE
       ===================================================== */

    function addCustomSentence() {

        const textInput =
            document.getElementById(
                "custom-sentence-text"
            );


        const categoryInput =
            document.getElementById(
                "custom-sentence-category"
            );


        if (!textInput) {
            return;
        }


        const text =
            textInput.value.trim();


        if (!text) {
            return;
        }


        const category =
            categoryInput
                ? categoryInput.value
                : "general";


        const sentence =
            addSentence(
                text,
                {
                    category
                }
            );


        if (!sentence) {
            return;
        }


        textInput.value = "";


        setRecordingState(
            "Custom sentence added."
        );
    }


    /* =====================================================
       CURRENT SENTENCE
       ===================================================== */

    function updateCurrentSentence() {

        const index =
            findNextPendingIndex();


        if (index === -1) {

            state.currentIndex = -1;


            setCurrentSentence(
                null
            );


            setRecordingState(
                "No pending sentences."
            );


            syncAppState();

            render();

            updateStatistics();

            notifyDatasetChanged({
                action: "advance",
                entry: null
            });


            return null;
        }


        state.currentIndex =
            index;


        const sentence =
            state.entries[index];


        setCurrentSentence(
            sentence
        );


        syncAppState();

        render();

        updateStatistics();

        notifyDatasetChanged({
            action: "advance",
            entry: sentence
        });


        return sentence;
    }


    function findNextPendingIndex() {

        return findNextPendingIndexFrom(
            state.currentIndex
        );
    }


    function findNextPendingIndexFrom(
        currentIndex
    ) {

        if (
            state.entries.length === 0
        ) {

            return -1;
        }


        const start =
            currentIndex >= 0
                ? currentIndex + 1
                : 0;


        for (
            let i = start;
            i < state.entries.length;
            i++
        ) {

            if (
                state.entries[i].status ===
                "pending"
            ) {

                return i;
            }
        }


        for (
            let i = 0;
            i < Math.min(
                start,
                state.entries.length
            );
            i++
        ) {

            if (
                state.entries[i].status ===
                "pending"
            ) {

                return i;
            }
        }


        return -1;
    }


    function getCurrentSentence() {

        if (
            state.currentIndex < 0 ||
            state.currentIndex >=
                state.entries.length
        ) {

            return null;
        }


        return state.entries[
            state.currentIndex
        ];
    }


    function setCurrentSentence(
        sentence
    ) {

        if (
            window.App &&
            window.App.state
        ) {

            window.App.state.currentSentence =
                sentence || null;
        }


        const sentenceElement =
            document.getElementById(
                "current-sentence"
            );


        const metadataElement =
            document.getElementById(
                "sentence-metadata"
            );


        const numberElement =
            document.getElementById(
                "recording-number"
            );


        const totalElement =
            document.getElementById(
                "recording-total"
            );


        const categoryElement =
            document.getElementById(
                "recording-category"
            );


        if (!sentence) {

            if (sentenceElement) {

                sentenceElement.textContent =
                    "No sentence selected.";
            }


            if (metadataElement) {

                metadataElement.textContent =
                    "";
            }


            if (numberElement) {

                numberElement.textContent =
                    "0";
            }


            if (totalElement) {

                totalElement.textContent =
                    state.entries.length;
            }


            if (categoryElement) {

                categoryElement.textContent =
                    "No category";
            }


            return;
        }


        if (sentenceElement) {

            sentenceElement.textContent =
                sentence.text;
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
                sentence.regionalInfluence &&
                sentence.regionalInfluence.length
            ) {

                metadata.push(
                    `Regional: ${
                        sentence.regionalInfluence.join(", ")
                    }`
                );
            }


            metadataElement.textContent =
                metadata.join(" • ");
        }


        if (numberElement) {

            numberElement.textContent =
                state.currentIndex + 1;
        }


        if (totalElement) {

            totalElement.textContent =
                state.entries.length;
        }


        if (categoryElement) {

            categoryElement.textContent =
                sentence.category;
        }


        setRecordingState(
            "Ready"
        );
    }


    /* =====================================================
       SELECT DATASET ENTRY
       ===================================================== */

    function selectEntry(
        id
    ) {

        const index =
            state.entries.findIndex(
                entry =>
                    entry.id === id
            );


        if (index === -1) {
            return false;
        }


        state.currentIndex =
            index;


        const entry =
            state.entries[index];


        setCurrentSentence(
            entry
        );


        syncAppState();

        render();


        notifyDatasetChanged({
            action: "select",
            entry
        });


        return true;
    }


    /* =====================================================
       RECORDING
       ===================================================== */

    async function receiveRecording(
        recording
    ) {

        if (!recording) {
            return;
        }


        let index = -1;


        if (recording.sentenceId) {

            index =
                state.entries.findIndex(
                    item =>
                        item.id ===
                        recording.sentenceId
                );
        }


        if (
            index === -1 &&
            recording.sentence &&
            recording.sentence.id
        ) {

            index =
                state.entries.findIndex(
                    item =>
                        item.id ===
                        recording.sentence.id
                );
        }


        if (
            index === -1 &&
            state.currentIndex >= 0
        ) {

            index =
                state.currentIndex;
        }


        if (
            index < 0 ||
            index >= state.entries.length
        ) {

            console.warn(
                "Recording received without a valid dataset entry.",
                recording
            );

            return;
        }


        const entry =
            state.entries[index];


        if (
            !recording.blob
        ) {

            console.warn(
                "Recording received without an audio Blob.",
                recording
            );

            return;
        }


        if (
            typeof Blob !== "undefined" &&
            !(recording.blob instanceof Blob)
        ) {

            console.warn(
                "Recording received with invalid audio data.",
                recording.blob
            );

            return;
        }


        revokeObjectUrl(
            entry.id
        );


        entry.recording = {

            blob:
                recording.blob,

            duration:
                Number(
                    recording.duration
                ) || 0,

            mimeType:
                recording.mimeType ||
                (
                    recording.blob &&
                    recording.blob.type
                ) ||
                "",

            createdAt:
                recording.createdAt ||
                new Date().toISOString()
        };


        entry.status =
            "recorded";


        entry.updatedAt =
            new Date().toISOString();


        /*
         * Persist the completed entry in IndexedDB before
         * advancing the Dataset state.
         */

        try {

            if (
                window.Storage &&
                typeof window.Storage.saveEntry ===
                    "function"
            ) {

                await window.Storage.saveEntry(
                    entry
                );

            } else {

                throw new Error(
                    "Storage.saveEntry() is unavailable."
                );
            }

        } catch (error) {

            console.error(
                "Unable to persist recording:",
                error
            );

            return;
        }


        syncAppState();

        render();

        updateStatistics();


        notifyDatasetChanged({
            action: "record",
            entry
        });


        /*
         * The completed recording remains available to
         * the recorder UI for playback and Record Again.
         *
         * Dataset advances to the next pending sentence.
         */

        if (
            state.currentIndex === index
        ) {

            const nextIndex =
                findNextPendingIndexFrom(
                    index
                );


            if (nextIndex !== -1) {

                state.currentIndex =
                    nextIndex;


                setCurrentSentence(
                    state.entries[
                        nextIndex
                    ]
                );


                syncAppState();

                render();

                updateStatistics();


                notifyDatasetChanged({
                    action: "advance-after-record",
                    entry:
                        state.entries[
                            nextIndex
                        ]
                });

            } else {

                /*
                 * No pending sentence remains.
                 * Keep the completed entry selected so
                 * its recording remains associated with
                 * the current Dataset entry.
                 */

                state.currentIndex =
                    index;


                setCurrentSentence(
                    entry
                );


                syncAppState();

                render();

                updateStatistics();


                notifyDatasetChanged({
                    action: "complete",
                    entry
                });
            }
        }
    }


    /* =====================================================
       IMPORT ENTRY
       ===================================================== */

    async function importEntry(
        importedEntry
    ) {

        if (
            !importedEntry ||
            typeof importedEntry !== "object"
        ) {

            console.warn(
                "Dataset.importEntry(): invalid entry.",
                importedEntry
            );

            return null;
        }


        if (!state.initialized) {

            loadFromAppState();
        }


        /*
         * Primary supported format:
         *
         * recording: {
         *     blob: Blob,
         *     duration: Number,
         *     mimeType: String,
         *     createdAt: ISO date
         * }
         *
         * Legacy/fallback format:
         *
         * audioBlob: Blob
         *
         * The import/export layer is responsible for
         * converting external file formats into a Blob.
         */

        const blob =
            importedEntry.recording &&
            importedEntry.recording.blob
                ? importedEntry.recording.blob
                : importedEntry.audioBlob;


        if (!blob) {

            console.warn(
                "Dataset.importEntry(): entry has no audio Blob.",
                importedEntry
            );

            return null;
        }


        if (
            typeof Blob !== "undefined" &&
            !(blob instanceof Blob)
        ) {

            console.warn(
                "Dataset.importEntry(): audio is not a Blob.",
                blob
            );

            return null;
        }


        const now =
            new Date().toISOString();


        let id =
            importedEntry.id ||
            null;


        if (!id) {

            id =
                generateId();

        } else {

            const numericId =
                parseInt(
                    String(id),
                    10
                );


            if (
                Number.isFinite(numericId) &&
                numericId >= state.nextId
            ) {

                state.nextId =
                    numericId + 1;
            }
        }


        const existingIndex =
            state.entries.findIndex(
                entry =>
                    entry.id === id
            );


        const recordingSource =
            importedEntry.recording &&
            typeof importedEntry.recording === "object"
                ? importedEntry.recording
                : {};


        const entry = {

            id,

            text:
                String(
                    importedEntry.text ||
                    ""
                )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim(),

            category:
                importedEntry.category ||
                "general",

            intent:
                importedEntry.intent ||
                null,

            style:
                importedEntry.style ||
                "neutral",

            regionalInfluence:
                Array.isArray(
                    importedEntry.regionalInfluence
                )
                    ? [
                        ...importedEntry.regionalInfluence
                    ]
                    : [],

            pronunciationTargets:
                Array.isArray(
                    importedEntry.pronunciationTargets
                )
                    ? [
                        ...importedEntry.pronunciationTargets
                    ]
                    : [],

            template:
                importedEntry.template ||
                null,

            status:
                "recorded",

            recording: {

                blob,

                duration:
                    Number(
                        importedEntry.duration ??
                        recordingSource.duration
                    ) || 0,

                mimeType:
                    importedEntry.mimeType ||
                    recordingSource.mimeType ||
                    blob.type ||
                    "",

                createdAt:
                    importedEntry.createdAt ||
                    recordingSource.createdAt ||
                    now
            },

            createdAt:
                importedEntry.createdAt ||
                recordingSource.createdAt ||
                now,

            updatedAt:
                now,

            imported:
                true
        };


        if (!entry.text) {

            console.warn(
                "Dataset.importEntry(): entry has no text.",
                importedEntry
            );

            return null;
        }


        if (
            existingIndex !== -1
        ) {

            revokeObjectUrl(
                id
            );


            state.entries[
                existingIndex
            ] = entry;

        } else {

            state.entries.push(
                entry
            );
        }


        /*
         * If the imported entry replaced the currently
         * selected entry, keep that entry selected.
         */

        if (
            state.currentIndex === existingIndex
        ) {

            state.currentIndex =
                existingIndex;
        }


        if (
            state.currentIndex >=
            state.entries.length
        ) {

            state.currentIndex =
                state.entries.length - 1;
        }


        if (
            state.currentIndex === -1
        ) {

            const pendingIndex =
                findNextPendingIndexFrom(
                    -1
                );


            if (pendingIndex !== -1) {

                state.currentIndex =
                    pendingIndex;


                setCurrentSentence(
                    state.entries[
                        pendingIndex
                    ]
                );

            } else {

                /*
                 * If the imported dataset contains only
                 * recorded entries, select the imported
                 * entry rather than leaving the UI empty.
                 */

                const importedIndex =
                    state.entries.findIndex(
                        item =>
                            item.id === id
                    );


                if (importedIndex !== -1) {

                    state.currentIndex =
                        importedIndex;


                    setCurrentSentence(
                        state.entries[
                            importedIndex
                        ]
                    );

                } else {

                    setCurrentSentence(
                        null
                    );
                }
            }

        } else {

            setCurrentSentence(
                state.entries[
                    state.currentIndex
                ]
            );
        }


        /*
         * Persist the imported entry in IndexedDB.
         */

        try {

            if (
                window.Storage &&
                typeof window.Storage.saveEntry ===
                    "function"
            ) {

                await window.Storage.saveEntry(
                    entry
                );

            } else {

                throw new Error(
                    "Storage.saveEntry() is unavailable."
                );
            }

        } catch (error) {

            console.error(
                "Unable to persist imported dataset entry:",
                error
            );

            return null;
        }


        state.initialized = true;


        syncAppState();

        render();

        updateStatistics();


        notifyDatasetChanged({
            action:
                existingIndex !== -1
                    ? "import-replace"
                    : "import",
            entry
        });


        console.log(
            "Dataset entry imported:",
            entry.id,
            entry.text
        );


        return entry;
    }


    /* =====================================================
       SAVE / ADVANCE
       ===================================================== */

    function advanceToNext() {

        const current =
            getCurrentSentence();


        if (
            current &&
            current.status !== "recorded"
        ) {

            return;
        }


        updateCurrentSentence();

        syncAppState();

        render();

        updateStatistics();
    }


    /* =====================================================
       SKIP
       ===================================================== */

    function markSkipped(
        sentence
    ) {

        if (!sentence) {
            return;
        }


        const index =
            state.entries.findIndex(
                item =>
                    item.id ===
                    sentence.id
            );


        if (index === -1) {
            return;
        }


        state.entries[index].status =
            "skipped";


        state.entries[index].updatedAt =
            new Date().toISOString();


        syncAppState();

        render();

        updateStatistics();


        if (
            state.currentIndex === index
        ) {

            updateCurrentSentence();

        } else {

            notifyDatasetChanged({
                action: "skip",
                entry:
                    state.entries[index]
            });
        }
    }


    /* =====================================================
       OBJECT URL MANAGEMENT
       ===================================================== */

    function getObjectUrl(
        entry
    ) {

        if (
            !entry ||
            !entry.recording ||
            !entry.recording.blob
        ) {

            return null;
        }


        const existing =
            state.objectUrls.get(
                entry.id
            );


        if (existing) {

            return existing;
        }


        try {

            const url =
                URL.createObjectURL(
                    entry.recording.blob
                );


            state.objectUrls.set(
                entry.id,
                url
            );


            return url;

        } catch (error) {

            console.warn(
                "Unable to create audio object URL:",
                error
            );


            return null;
        }
    }


    function revokeObjectUrl(
        id
    ) {

        const url =
            state.objectUrls.get(
                id
            );


        if (!url) {
            return;
        }


        try {

            URL.revokeObjectURL(
                url
            );

        } catch (_) {
            /* Ignore invalid object URLs. */
        }


        state.objectUrls.delete(
            id
        );
    }


    function revokeAllObjectUrls() {

        state.objectUrls.forEach(
            url => {

                try {

                    URL.revokeObjectURL(
                        url
                    );

                } catch (_) {
                    /* Ignore invalid object URLs. */
                }
            }
        );


        state.objectUrls.clear();
    }


    /* =====================================================
       DELETE / RESET
       ===================================================== */

    function deleteEntry(
        id
    ) {

        const index =
            state.entries.findIndex(
                item =>
                    item.id === id
            );


        if (index === -1) {
            return false;
        }


        revokeObjectUrl(
            id
        );


        const wasCurrent =
            state.currentIndex === index;


        state.entries.splice(
            index,
            1
        );


        if (
            state.entries.length === 0
        ) {

            state.currentIndex = -1;

        } else if (
            state.currentIndex > index
        ) {

            state.currentIndex -= 1;

        } else if (
            state.currentIndex === index
        ) {

            state.currentIndex = -1;
        }


        if (
            wasCurrent
        ) {

            const nextIndex =
                findNextPendingIndexFrom(
                    state.currentIndex
                );


            if (nextIndex !== -1) {

                state.currentIndex =
                    nextIndex;


                setCurrentSentence(
                    state.entries[
                        nextIndex
                    ]
                );

            } else {

                setCurrentSentence(
                    null
                );
            }
        }


        syncAppState();

        render();

        updateStatistics();


        notifyDatasetChanged({
            action: "delete",
            id
        });


        return true;
    }


    function resetEntry(
        id
    ) {

        const index =
            state.entries.findIndex(
                item =>
                    item.id === id
            );


        if (index === -1) {
            return false;
        }


        const entry =
            state.entries[index];


        revokeObjectUrl(
            id
        );


        entry.status =
            "pending";


        entry.recording =
            null;


        entry.updatedAt =
            new Date().toISOString();


        /*
         * Keep this exact sentence selected.
         * Record Again / Dataset Re-record must not
         * send the user to another pending sentence.
         */

        state.currentIndex =
            index;


        syncAppState();

        setCurrentSentence(
            entry
        );

        render();

        updateStatistics();


        notifyDatasetChanged({
            action: "reset",
            entry
        });


        return true;
    }


    /* =====================================================
       RE-RECORD DATASET ENTRY
       ===================================================== */

    function rerecordEntry(
        id
    ) {

        const index =
            state.entries.findIndex(
                item =>
                    item.id === id
            );


        if (index === -1) {
            return false;
        }


        const entry =
            state.entries[index];


        /*
         * Reset the exact entry first. This is important:
         * the recorder must receive the same sentence ID
         * and App.currentSentence must point to that entry.
         */

        if (
            !resetEntry(
                id
            )
        ) {

            return false;
        }


        /*
         * Explicitly restore the entry after reset.
         * This protects against other Dataset state
         * changes during reset.
         */

        state.currentIndex =
            index;


        setCurrentSentence(
            entry
        );


        syncAppState();


        /*
         * Tell Recorder this is an intentional re-record
         * from the Dataset tab.
         *
         * Do not create a new sentence. The existing
         * sentence ID is preserved.
         */

        window.dispatchEvent(
            new CustomEvent(
                "kvdb:rerecord-sentence",
                {
                    detail: {
                        sentence: entry,
                        sentenceId: entry.id
                    }
                }
            )
        );


        /*
         * Move to Record without depending on a private
         * App navigation implementation.
         */

        const recordNav =
            document.querySelector(
                '.nav-button[data-page="record"]'
            );


        if (recordNav) {

            recordNav.click();

        } else {

            const recordPage =
                document.getElementById(
                    "page-record"
                );


            if (recordPage) {

                document
                    .querySelectorAll(
                        ".page[data-page-content]"
                    )
                    .forEach(
                        page =>
                            page.classList.remove(
                                "active"
                            )
                    );


                document
                    .querySelectorAll(
                        ".nav-button[data-page]"
                    )
                    .forEach(
                        button =>
                            button.classList.remove(
                                "active"
                            )
                    );


                recordPage.classList.add(
                    "active"
                );


                const recordButton =
                    document.querySelector(
                        '.nav-button[data-page="record"]'
                    );


                if (recordButton) {

                    recordButton.classList.add(
                        "active"
                    );
                }


                if (
                    window.App &&
                    window.App.state
                ) {

                    window.App.state.currentPage =
                        "record";
                }
            }
        }


        setCurrentSentence(
            entry
        );


        setRecordingState(
            "Ready to re-record."
        );


        return true;
    }


    /* =====================================================
       RENDER DATASET
       ===================================================== */

    function render() {

        const container =
            document.getElementById(
                "dataset-list"
            );


        if (!container) {
            return;
        }


        /*
         * Existing audio elements may still be using
         * object URLs. The URL cache intentionally
         * survives normal renders so filtering/searching
         * does not invalidate active playback.
         */

        const search =
            getValue(
                "dataset-search"
            )
                .toLowerCase()
                .trim();


        const filter =
            getValue(
                "dataset-filter"
            );


        const filtered =
            state.entries.filter(
                entry => {

                    if (
                        filter &&
                        filter !== "all" &&
                        entry.status !== filter
                    ) {

                        return false;
                    }


                    if (!search) {
                        return true;
                    }


                    return String(
                        entry.text || ""
                    )
                        .toLowerCase()
                        .includes(search);
                }
            );


        container.innerHTML = "";


        if (
            filtered.length === 0
        ) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.className =
                "empty-state";


            empty.textContent =
                state.entries.length === 0
                    ? "No dataset entries yet."
                    : "No entries match the current filter.";


            container.appendChild(
                empty
            );


            return;
        }


        filtered.forEach(
            entry => {

                container.appendChild(
                    createEntryElement(
                        entry
                    )
                );
            }
        );
    }


    function createEntryElement(
        entry
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.className =
            "dataset-entry";


        element.dataset.id =
            entry.id;


        if (
            state.currentIndex >= 0 &&
            state.entries[
                state.currentIndex
            ] &&
            state.entries[
                state.currentIndex
            ].id === entry.id
        ) {

            element.classList.add(
                "active"
            );
        }


        /*
         * Make the entire dataset row selectable.
         * Action buttons below stop propagation so selecting
         * a row does not accidentally trigger Play, Re-record,
         * or Delete.
         */

        element.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        "button"
                    )
                ) {

                    return;
                }


                selectEntry(
                    entry.id
                );
            }
        );


        /*
         * ID
         */

        const id =
            document.createElement(
                "div"
            );


        id.className =
            "dataset-entry-id";


        id.textContent =
            entry.id;


        /*
         * Status
         */

        const status =
            document.createElement(
                "div"
            );


        status.className =
            `dataset-entry-status ${entry.status}`;


        status.textContent =
            entry.status;


        /*
         * Sentence text
         */

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "dataset-entry-text";


        text.title =
            entry.text;


        text.textContent =
            entry.text;


        /*
         * Recording duration
         */

        const duration =
            document.createElement(
                "div"
            );


        duration.className =
            "dataset-entry-duration";


        duration.textContent =
            entry.recording
                ? formatDuration(
                    entry.recording.duration
                )
                : "—";


        /*
         * Playback controls
         */

        const playback =
            document.createElement(
                "div"
            );


        playback.className =
            "dataset-entry-playback";


        if (
            entry.recording &&
            entry.recording.blob
        ) {

            const playButton =
                document.createElement(
                    "button"
                );


            playButton.type =
                "button";


            playButton.className =
                "secondary-button dataset-entry-play";


            playButton.textContent =
                "Play";


            playButton.title =
                `Play recording for ${entry.id}`;


            const objectUrl =
                getObjectUrl(
                    entry
                );


            let audio = null;


            if (objectUrl) {

                audio =
                    new Audio(
                        objectUrl
                    );


                audio.preload =
                    "metadata";


                audio.addEventListener(
                    "ended",
                    () => {

                        playButton.textContent =
                            "Play";


                        playButton.title =
                            `Play recording for ${entry.id}`;
                    }
                );


                audio.addEventListener(
                    "error",
                    () => {

                        playButton.textContent =
                            "Play";


                        console.warn(
                            "Unable to play dataset recording:",
                            entry.id
                        );
                    }
                );
            }


            playButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (!audio) {
                        return;
                    }


                    /*
                     * Stop all other dataset recordings.
                     */

                    document
                        .querySelectorAll(
                            ".dataset-entry-play"
                        )
                        .forEach(
                            button => {

                                if (
                                    button !==
                                    playButton
                                ) {

                                    button.textContent =
                                        "Play";
                                }
                            }
                        );


                    if (
                        !audio.paused
                    ) {

                        audio.pause();


                        playButton.textContent =
                            "Play";


                        return;
                    }


                    audio.currentTime =
                        0;


                    const playPromise =
                        audio.play();


                    if (
                        playPromise &&
                        typeof playPromise.catch ===
                        "function"
                    ) {

                        playPromise.catch(
                            error => {

                                console.warn(
                                    "Unable to play dataset recording:",
                                    error
                                );


                                playButton.textContent =
                                    "Play";
                            }
                        );
                    }


                    playButton.textContent =
                        "Stop";
                }
            );


            playback.appendChild(
                playButton
            );

        } else {

            const unavailable =
                document.createElement(
                    "span"
                );


            unavailable.className =
                "dataset-entry-no-audio";


            unavailable.textContent =
                "No recording";


            playback.appendChild(
                unavailable
            );
        }


        /*
         * Actions
         */

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "dataset-entry-actions";


        /*
         * Re-record
         */

        const rerecordButton =
            document.createElement(
                "button"
            );


        rerecordButton.type =
            "button";


        rerecordButton.className =
            "secondary-button dataset-entry-rerecord";


        rerecordButton.textContent =
            "Re-record";


        rerecordButton.title =
            `Re-record "${entry.text}"`;


        rerecordButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                rerecordEntry(
                    entry.id
                );
            }
        );


        /*
         * Delete
         */

        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.type =
            "button";


        deleteButton.className =
            "dataset-entry-delete";


        deleteButton.textContent =
            "×";


        deleteButton.title =
            `Delete dataset entry ${entry.id}`;


        deleteButton.setAttribute(
            "aria-label",
            `Delete dataset entry ${entry.id}`
        );


        deleteButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                const confirmed =
                    window.confirm(
                        `Delete this dataset entry?\n\n${entry.text}`
                    );


                if (!confirmed) {
                    return;
                }


                deleteEntry(
                    entry.id
                );
            }
        );


        actions.appendChild(
            rerecordButton
        );


        actions.appendChild(
            deleteButton
        );


        element.appendChild(
            id
        );


        element.appendChild(
            status
        );


        element.appendChild(
            text
        );


        element.appendChild(
            duration
        );


        element.appendChild(
            playback
        );


        element.appendChild(
            actions
        );


        return element;
    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    function updateStatistics() {

        if (
            window.App &&
            typeof
            window.App.updateDatasetStatistics ===
            "function"
        ) {

            window.App.updateDatasetStatistics();
        }
    }


    /* =====================================================
       APP STATE SYNC
       ===================================================== */

    function syncAppState() {

        if (
            window.App &&
            window.App.state
        ) {

            window.App.state.dataset =
                state.entries;


            window.App.state.currentSentence =
                getCurrentSentence();
        }
    }


    /* =====================================================
       UI HELPERS
       ===================================================== */

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


    function setRecordingState(
        message
    ) {

        if (
            window.App &&
            typeof
            window.App.setRecordingState ===
            "function"
        ) {

            window.App.setRecordingState(
                message
            );
        }
    }


    function formatDuration(
        seconds
    ) {

        const safe =
            Math.max(
                0,
                Number(seconds) || 0
            );


        const minutes =
            Math.floor(
                safe / 60
            );


        const remaining =
            Math.floor(
                safe % 60
            );


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

        addSentence,

        addSentences,

        addCustomSentence,

        createSentence,

        getEntries:
            () =>
                state.entries,

        getCurrentSentence:
            () =>
                getCurrentSentence(),

        getCurrentIndex:
            () =>
                state.currentIndex,

        selectEntry,

        deleteEntry,

        resetEntry,

        rerecordEntry,

        render,

        updateCurrentSentence,

        markSkipped,

        receiveRecording,

        advanceToNext,

        importEntry,

        revokeObjectUrl,

        revokeAllObjectUrls

    };

})();


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        Dataset.init();

    }
);


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            window.Dataset &&
            typeof
            window.Dataset.revokeAllObjectUrls ===
            "function"
        ) {

            window.Dataset.revokeAllObjectUrls();
        }
    }
);
