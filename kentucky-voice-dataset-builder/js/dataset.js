"use strict";

window.Dataset = (() => {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        initialized: false,

        entries: [],

        currentIndex: -1,

        nextId: 1

    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function init() {

        if (state.initialized) {
            return;
        }


        /*
         * Load the dataset BEFORE setting up the UI.
         */

        loadFromAppState();

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

        /*
         * Recorder finished a recording.
         */

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


        /*
         * Recorder skipped a sentence.
         */

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


        /*
         * Legacy advance event.
         */

        window.addEventListener(
            "kvdb:advance-sentence",
            () => {

                updateCurrentSentence();

            }
        );


        /*
         * Generator added new sentences.
         */

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
       LOAD APP STATE
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


        /*
         * Normalize older entries so the application
         * always uses:
         *
         * entry.recording.blob
         */

        state.entries.forEach(
            normalizeEntry
        );


        state.nextId =
            calculateNextId(
                state.entries
            );


        /*
         * Restore current sentence if possible.
         */

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


    /*
     * Normalize an entry into the Dataset's
     * standard internal structure.
     */

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
         * Older export/import code may have used
         * audioBlob instead of recording.blob.
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


        /*
         * Make sure recorded entries have the
         * correct status.
         */

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


        return entry;
    }


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
                    ? options.regionalInfluence
                    : [],

            pronunciationTargets:
                Array.isArray(
                    options.pronunciationTargets
                )
                    ? options.pronunciationTargets
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
       ADD SENTENCES
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


        syncAppState();

        render();

        updateStatistics();


        if (
            state.currentIndex === -1
        ) {

            state.currentIndex =
                state.entries.length - 1;

            setCurrentSentence(
                sentence
            );
        }


        return sentence;
    }


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


        if (added.length === 0) {
            return added;
        }


        syncAppState();

        render();

        updateStatistics();


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

            return null;
        }


        state.currentIndex =
            index;


        const sentence =
            state.entries[index];


        setCurrentSentence(
            sentence
        );

        render();

        updateStatistics();


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
       RECORDING
       ===================================================== */

    function receiveRecording(
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


        syncAppState();

        render();

        updateStatistics();


        if (
            state.currentIndex === index
        ) {

            updateCurrentSentence();
        }
    }


    /* =====================================================
       IMPORT ENTRY
       ===================================================== */

    /*
     * Called by DatasetExport when importing a dataset ZIP.
     *
     * Accepts:
     *
     *     importedEntry.recording.blob
     *
     * or the older:
     *
     *     importedEntry.audioBlob
     */

    function importEntry(
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


        /*
         * Make sure Dataset state has been loaded
         * before accepting imported entries.
         */

        if (!state.initialized) {

            loadFromAppState();
        }


        /*
         * Accept both the current nested structure
         * and the older audioBlob structure.
         */

        const blob =
            importedEntry.recording &&
            importedEntry.recording.blob
                ? importedEntry.recording.blob
                : importedEntry.audioBlob;


        /*
         * Verify that we actually received audio.
         */

        if (!blob) {

            console.warn(
                "Dataset.importEntry(): entry has no audio Blob.",
                importedEntry
            );

            return null;
        }


        /*
         * A ZIP extraction should give us a Blob.
         * If something else is supplied, reject it
         * rather than silently creating a broken entry.
         */

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


        /*
         * Prevent duplicate IDs from creating two
         * copies of the same dataset entry.
         */

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


        const entry = {

            id,

            text:
                String(
                    importedEntry.text ||
                    ""
                ).trim(),

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
                    ? importedEntry.regionalInfluence
                    : [],

            pronunciationTargets:
                Array.isArray(
                    importedEntry.pronunciationTargets
                )
                    ? importedEntry.pronunciationTargets
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
                        importedEntry.recording?.duration
                    ) || 0,

                mimeType:
                    importedEntry.mimeType ||
                    importedEntry.recording?.mimeType ||
                    blob.type ||
                    "",

                createdAt:
                    importedEntry.createdAt ||
                    importedEntry.recording?.createdAt ||
                    now
            },

            createdAt:
                importedEntry.createdAt ||
                importedEntry.recording?.createdAt ||
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


        /*
         * Replace an existing entry with the same ID,
         * otherwise add the imported entry.
         */

        if (
            existingIndex !== -1
        ) {

            state.entries[
                existingIndex
            ] = entry;

        } else {

            state.entries.push(
                entry
            );
        }


        /*
         * Keep the application's dataset state
         * synchronized immediately.
         */

        syncAppState();


        /*
         * Refresh the dataset UI immediately.
         */

        render();

        updateStatistics();


        /*
         * Keep the current sentence valid.
         * Imported recordings are already recorded,
         * so they should not become the active
         * pending sentence.
         */

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
            }
        }


        /*
         * Mark initialized after a direct import so
         * subsequent imports use the loaded state.
         */

        state.initialized = true;


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
        }
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


        const entry =
            state.entries[index];


        if (
            entry.recording &&
            entry.recording.objectUrl
        ) {

            try {

                URL.revokeObjectURL(
                    entry.recording.objectUrl
                );

            } catch (_) {}
        }


        state.entries.splice(
            index,
            1
        );


        if (
            state.currentIndex >=
            state.entries.length
        ) {

            state.currentIndex =
                state.entries.length - 1;
        }


        syncAppState();

        updateCurrentSentence();

        render();

        updateStatistics();


        return true;
    }


    function resetEntry(
        id
    ) {

        const entry =
            state.entries.find(
                item =>
                    item.id === id
            );


        if (!entry) {
            return false;
        }


        entry.status =
            "pending";


        entry.recording =
            null;


        entry.updatedAt =
            new Date().toISOString();


        syncAppState();

        render();

        updateStatistics();


        if (
            state.currentIndex === -1
        ) {

            updateCurrentSentence();
        }


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


        const id =
            document.createElement(
                "div"
            );


        id.className =
            "dataset-entry-id";


        id.textContent =
            entry.id;


        const status =
            document.createElement(
                "div"
            );


        status.className =
            `dataset-entry-status ${entry.status}`;


        status.textContent =
            entry.status;


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

        deleteEntry,

        resetEntry,

        render,

        updateCurrentSentence,

        markSkipped,

        receiveRecording,

        advanceToNext,

        importEntry

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