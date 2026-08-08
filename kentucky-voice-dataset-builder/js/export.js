"use strict";

const DatasetExport = (() => {

    const DEFAULT_CONFIG = {
        audio: {
            format: "wav",
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16,
            normalize: true,
            trimSilence: true,
            silenceThreshold: 0.008,
            silencePadding: 0.05
        },

        metadata: {
            format: "whisper-csv",
            audioColumn: "audio",
            textColumn: "text",
            delimiter: ",",
            includeHeader: true
        },

        dataset: {
            name: "kentucky-voice-dataset",
            version: 1
        }
    };


    let config = structuredCloneSafe(
        DEFAULT_CONFIG
    );

    let initialized = false;


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function init() {

        if (initialized) {
            return;
        }

        setupControls();

        initialized = true;

        console.log(
            "Dataset export initialized."
        );
    }


    /* =====================================================
       CONTROLS
       ===================================================== */

    function setupControls() {

        /*
         * Export button
         */

        const exportButton =
            document.getElementById(
                "export-dataset-button"
            );

        if (exportButton) {

            exportButton.addEventListener(
                "click",
                exportDataset
            );

        } else {

            console.warn(
                "Export button not found: #export-dataset-button"
            );
        }


        /*
         * Import file input
         */

        const importInput =
            document.getElementById(
                "import-dataset-file"
            );


        /*
         * Import button
         */

        const importButton =
            document.getElementById(
                "import-dataset-button"
            );


        if (importButton) {

            importButton.addEventListener(
                "click",
                () => {

                    if (!importInput) {

                        showStatus(
                            "Import file input not found."
                        );

                        console.error(
                            "Import file input not found: #import-dataset-file"
                        );

                        return;
                    }


                    importInput.click();
                }
            );

        } else {

            console.warn(
                "Import button not found: #import-dataset-button"
            );
        }


        /*
         * Import file selected
         */

        if (importInput) {

            importInput.addEventListener(
                "change",
                handleImport
            );

        } else {

            console.warn(
                "Import file input not found: #import-dataset-file"
            );
        }
    }


    /* =====================================================
       CONFIG
       ===================================================== */

    function setConfig(
        newConfig
    ) {

        config = deepMerge(
            structuredCloneSafe(
                DEFAULT_CONFIG
            ),
            newConfig || {}
        );
    }


    function getConfig() {

        return structuredCloneSafe(
            config
        );
    }


    /* =====================================================
       EXPORT DATASET
       ===================================================== */

    async function exportDataset() {

        console.log(
            "Dataset export requested."
        );


        if (
            typeof JSZip ===
            "undefined"
        ) {

            showStatus(
                "JSZip is not loaded."
            );

            console.error(
                "Dataset export failed: JSZip is not loaded."
            );

            return;
        }


        if (!window.Dataset) {

            showStatus(
                "Dataset manager is not available."
            );

            console.error(
                "Dataset export failed: Dataset manager is not available."
            );

            return;
        }


        try {

            showStatus(
                "Building dataset ZIP..."
            );


            const entries =
                getDatasetEntries();


            console.log(
                "Dataset entries found:",
                entries.length
            );


            if (!entries.length) {

                showStatus(
                    "There are no recordings to export."
                );

                return;
            }


            const zip =
                new JSZip();


            const datasetName =
                sanitizeFilename(
                    config.dataset.name ||
                    "kentucky-voice-dataset"
                );


            const audioFolder =
                zip.folder(
                    "audio"
                );


            const metadataRows = [];
            const manifestEntries = [];


            let index = 1;


            for (
                const entry of entries
            ) {

                const audioBlob =
                    getEntryAudio(
                        entry
                    );


                if (!audioBlob) {

                    console.warn(
                        "Skipping entry without usable audio:",
                        entry
                    );

                    continue;
                }


                const text =
                    entry.text ||
                    "";


                if (!text.trim()) {

                    console.warn(
                        "Skipping recording without text:",
                        entry
                    );

                    continue;
                }


                const filename =
                    makeAudioFilename(
                        index,
                        config.audio.format
                    );


                let finalBlob =
                    audioBlob;


                /*
                 * Convert recordings to requested format.
                 */

                if (
                    String(
                        config.audio.format
                    ).toLowerCase() ===
                    "wav"
                ) {

                    if (
                        window.AudioTools &&
                        typeof AudioTools.convert ===
                            "function"
                    ) {

                        try {

                            console.log(
                                `Converting recording ${entry.id || index} to WAV...`
                            );


                            finalBlob =
                                await AudioTools.convert(
                                    audioBlob,
                                    config.audio
                                );


                        } catch (error) {

                            console.warn(
                                "Audio conversion failed. Using original recording.",
                                error
                            );


                            finalBlob =
                                audioBlob;
                        }

                    } else {

                        console.warn(
                            "AudioTools.convert() is not available. Using original recording."
                        );
                    }
                }


                audioFolder.file(
                    filename,
                    finalBlob
                );


                const cleanTranscript =
                    cleanText(
                        text
                    );


                metadataRows.push({

                    audio:
                        `audio/${filename}`,

                    text:
                        cleanTranscript
                });


                manifestEntries.push({

                    id:
                        entry.id ||
                        index,

                    audio:
                        `audio/${filename}`,

                    text:
                        cleanTranscript,

                    duration:
                        entry.duration ||
                        entry.recording?.duration ||
                        null,

                    mimeType:
                        entry.recording?.mimeType ||
                        audioBlob.type ||
                        null,

                    category:
                        entry.category ||
                        null,

                    intent:
                        entry.intent ||
                        null,

                    style:
                        entry.style ||
                        null,

                    template:
                        entry.template ||
                        null,

                    regionalInfluence:
                        Array.isArray(
                            entry.regionalInfluence
                        )
                            ? entry.regionalInfluence
                            : [],

                    pronunciationTargets:
                        Array.isArray(
                            entry.pronunciationTargets
                        )
                            ? entry.pronunciationTargets
                            : [],

                    generated:
                        entry.generated ||
                        false
                });


                console.log(
                    `Added recording ${entry.id || index}: ${filename}`
                );


                index++;
            }


            if (!manifestEntries.length) {

                showStatus(
                    "No valid recordings were found."
                );

                console.error(
                    "No valid recordings were found."
                );

                return;
            }


            /* =================================================
               METADATA
               ================================================= */

            const metadata =
                buildMetadataCSV(
                    metadataRows
                );


            zip.file(
                "metadata.csv",
                metadata
            );


            /* =================================================
               CONFIG
               ================================================= */

            zip.file(
                "config.json",
                JSON.stringify(
                    config,
                    null,
                    2
                )
            );


            /* =================================================
               MANIFEST
               ================================================= */

            const manifest = {

                name:
                    datasetName,

                version:
                    config.dataset.version,

                createdAt:
                    new Date().toISOString(),

                recordingCount:
                    manifestEntries.length,

                entries:
                    manifestEntries,

                config:
                    config
            };


            zip.file(
                "manifest.json",
                JSON.stringify(
                    manifest,
                    null,
                    2
                )
            );


            /* =================================================
               README
               ================================================= */

            zip.file(
                "README.txt",
                buildReadme(
                    manifestEntries.length
                )
            );


            showStatus(
                "Compressing dataset..."
            );


            const blob =
                await zip.generateAsync({

                    type: "blob",

                    compression:
                        "DEFLATE",

                    compressionOptions: {
                        level: 6
                    }

                });


            const filename =
                `${datasetName}-${timestamp()}.zip`;


            downloadBlob(
                blob,
                filename
            );


            showStatus(
                `Exported ${manifestEntries.length} recordings.`
            );


            console.log(
                "Dataset export complete:",
                filename
            );


        } catch (error) {

            console.error(
                "Dataset export failed:",
                error
            );


            showStatus(
                `Export failed: ${error.message}`
            );
        }
    }


    /* =====================================================
       GET ENTRY AUDIO
       ===================================================== */

    function getEntryAudio(
        entry
    ) {

        if (
            !entry ||
            typeof entry !==
                "object"
        ) {

            return null;
        }


        const candidates = [

            entry.recording?.blob,

            entry.audioBlob,

            entry.blob,

            entry.audio

        ];


        for (
            const candidate of candidates
        ) {

            if (
                candidate instanceof Blob
            ) {

                return candidate;
            }
        }


        return null;
    }


    /* =====================================================
       GET DATASET
       ===================================================== */

    function getDatasetEntries() {

        if (!window.Dataset) {
            return [];
        }


        if (
            typeof Dataset.getEntries ===
            "function"
        ) {

            return Dataset.getEntries();
        }


        if (
            typeof Dataset.getAll ===
            "function"
        ) {

            return Dataset.getAll();
        }


        if (
            typeof Dataset.getState ===
            "function"
        ) {

            const state =
                Dataset.getState();


            if (
                state &&
                Array.isArray(
                    state.entries
                )
            ) {

                return state.entries;
            }


            if (
                state &&
                Array.isArray(
                    state.items
                )
            ) {

                return state.items;
            }
        }


        return [];
    }


    /* =====================================================
       METADATA CSV
       ===================================================== */

    function buildMetadataCSV(
        rows
    ) {

        const delimiter =
            config.metadata.delimiter ||
            ",";


        const audioColumn =
            config.metadata.audioColumn ||
            "audio";


        const textColumn =
            config.metadata.textColumn ||
            "text";


        const output = [];


        if (
            config.metadata.includeHeader !==
            false
        ) {

            output.push(
                [
                    csvEscape(
                        audioColumn,
                        delimiter
                    ),

                    csvEscape(
                        textColumn,
                        delimiter
                    )

                ].join(
                    delimiter
                )
            );
        }


        rows.forEach(
            row => {

                output.push(
                    [
                        csvEscape(
                            row.audio,
                            delimiter
                        ),

                        csvEscape(
                            row.text,
                            delimiter
                        )

                    ].join(
                        delimiter
                    )
                );
            }
        );


        return (
            output.join("\n") +
            "\n"
        );
    }


    function csvEscape(
        value,
        delimiter
    ) {

        const text =
            String(
                value ??
                ""
            );


        if (
            text.includes('"') ||
            text.includes("\n") ||
            text.includes("\r") ||
            text.includes(delimiter)
        ) {

            return (
                '"' +
                text.replace(
                    /"/g,
                    '""'
                ) +
                '"'
            );
        }


        return text;
    }


    /* =====================================================
       IMPORT DATASET
       ===================================================== */

    async function handleImport(
        event
    ) {

        const input =
            event.target;


        const file =
            input &&
            input.files &&
            input.files[0];


        if (!file) {
            return;
        }


        try {

            await importDataset(
                file
            );

        } catch (error) {

            console.error(
                "Dataset import failed:",
                error
            );


            showStatus(
                `Import failed: ${error.message}`
            );
        }


        /*
         * Allow selecting the same ZIP again.
         */

        input.value = "";
    }


    async function importDataset(
        file
    ) {

        if (
            typeof JSZip ===
            "undefined"
        ) {

            throw new Error(
                "JSZip is not loaded."
            );
        }


        if (
            !file ||
            !file.name ||
            !file.name
                .toLowerCase()
                .endsWith(".zip")
        ) {

            throw new Error(
                "Please select a dataset ZIP file."
            );
        }


        if (!window.Dataset) {

            throw new Error(
                "Dataset manager is not available."
            );
        }


        showStatus(
            "Reading dataset ZIP..."
        );


        const zip =
            await JSZip.loadAsync(
                file
            );


        /* =================================================
           CONFIG
           ================================================= */

        const configFile =
            zip.file(
                "config.json"
            );


        if (configFile) {

            const configText =
                await configFile.async(
                    "text"
                );


            try {

                const importedConfig =
                    JSON.parse(
                        configText
                    );


                setConfig(
                    importedConfig
                );

            } catch (error) {

                console.warn(
                    "config.json could not be parsed.",
                    error
                );
            }
        }


        /* =================================================
           MANIFEST
           ================================================= */

        let manifest =
            null;


        const manifestFile =
            zip.file(
                "manifest.json"
            );


        if (manifestFile) {

            const manifestText =
                await manifestFile.async(
                    "text"
                );


            try {

                manifest =
                    JSON.parse(
                        manifestText
                    );

            } catch (error) {

                console.warn(
                    "manifest.json could not be parsed.",
                    error
                );
            }
        }


        /* =================================================
           METADATA
           ================================================= */

        const metadataFile =
            zip.file(
                "metadata.csv"
            );


        let metadataRows =
            [];


        if (metadataFile) {

            const metadataText =
                await metadataFile.async(
                    "text"
                );


            metadataRows =
                parseCSV(
                    metadataText,
                    config.metadata.delimiter ||
                    ","
                );
        }


        /* =================================================
           AUDIO FILES
           ================================================= */

        const audioFiles =
            Object.values(
                zip.files
            ).filter(
                entry => {

                    if (entry.dir) {
                        return false;
                    }


                    return entry.name
                        .toLowerCase()
                        .startsWith(
                            "audio/"
                        );
                }
            );


        if (
            audioFiles.length === 0
        ) {

            throw new Error(
                "The ZIP contains no audio files."
            );
        }


        let importedCount =
            0;


        for (
            const audioFile of audioFiles
        ) {

            const blob =
                await audioFile.async(
                    "blob"
                );


            const matchingMetadata =
                findMetadataForAudio(
                    metadataRows,
                    audioFile.name
                );


            const manifestEntry =
                manifest &&
                Array.isArray(
                    manifest.entries
                )

                    ? manifest.entries.find(
                        item =>
                            normalizePath(
                                item.audio
                            ) ===
                            normalizePath(
                                audioFile.name
                            )
                    )

                    : null;


            const text =
                matchingMetadata
                    ? matchingMetadata.text
                    : manifestEntry
                        ? manifestEntry.text
                        : "";


            if (!text || !text.trim()) {

                console.warn(
                    "Skipping imported audio without transcript:",
                    audioFile.name
                );

                continue;
            }


            /*
             * Build the exact structure expected
             * by Dataset.importEntry().
             */

            const entry = {

                id:
                    manifestEntry &&
                    manifestEntry.id
                        ? manifestEntry.id
                        : null,

                text:
                    cleanText(
                        text
                    ),

                category:
                    manifestEntry &&
                    manifestEntry.category
                        ? manifestEntry.category
                        : "general",

                intent:
                    manifestEntry &&
                    manifestEntry.intent
                        ? manifestEntry.intent
                        : null,

                style:
                    manifestEntry &&
                    manifestEntry.style
                        ? manifestEntry.style
                        : "neutral",

                template:
                    manifestEntry &&
                    manifestEntry.template
                        ? manifestEntry.template
                        : null,

                regionalInfluence:
                    manifestEntry &&
                    Array.isArray(
                        manifestEntry.regionalInfluence
                    )
                        ? manifestEntry.regionalInfluence
                        : [],

                pronunciationTargets:
                    manifestEntry &&
                    Array.isArray(
                        manifestEntry.pronunciationTargets
                    )
                        ? manifestEntry.pronunciationTargets
                        : [],

                duration:
                    manifestEntry &&
                    manifestEntry.duration
                        ? Number(
                            manifestEntry.duration
                        )
                        : 0,

                mimeType:
                    manifestEntry &&
                    manifestEntry.mimeType
                        ? manifestEntry.mimeType
                        : blob.type ||
                            "audio/wav",

                createdAt:
                    manifestEntry &&
                    manifestEntry.createdAt
                        ? manifestEntry.createdAt
                        : new Date().toISOString(),

                recording: {

                    blob,

                    duration:
                        manifestEntry &&
                        manifestEntry.duration
                            ? Number(
                                manifestEntry.duration
                            )
                            : 0,

                    mimeType:
                        manifestEntry &&
                        manifestEntry.mimeType
                            ? manifestEntry.mimeType
                            : blob.type ||
                                "audio/wav",

                    createdAt:
                        manifestEntry &&
                        manifestEntry.createdAt
                            ? manifestEntry.createdAt
                            : new Date().toISOString()
                }
            };


            const imported =
                Dataset.importEntry(
                    entry
                );


            if (imported) {

                importedCount++;

            } else {

                console.warn(
                    "Dataset rejected imported entry:",
                    audioFile.name
                );
            }
        }


        if (
            importedCount === 0
        ) {

            throw new Error(
                "No recordings could be imported from the ZIP."
            );
        }


        showStatus(
            `Imported ${importedCount} recordings. Configuration restored.`
        );


        document.dispatchEvent(
            new CustomEvent(
                "dataset-imported",
                {
                    detail: {

                        count:
                            importedCount,

                        config:
                            getConfig()
                    }
                }
            )
        );


        return {

            count:
                importedCount,

            config:
                getConfig(),

            manifest
        };
    }


    /* =====================================================
       CSV PARSER
       ===================================================== */

    function parseCSV(
        text,
        delimiter = ","
    ) {

        const rows = [];

        let row = [];

        let field = "";

        let insideQuotes =
            false;


        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            const char =
                text[i];


            const next =
                text[i + 1];


            if (
                char === '"'
            ) {

                if (
                    insideQuotes &&
                    next === '"'
                ) {

                    field += '"';

                    i++;

                } else {

                    insideQuotes =
                        !insideQuotes;
                }


                continue;
            }


            if (
                char === delimiter &&
                !insideQuotes
            ) {

                row.push(
                    field
                );

                field = "";

                continue;
            }


            if (
                (
                    char === "\n" ||
                    char === "\r"
                ) &&
                !insideQuotes
            ) {

                if (
                    char === "\r" &&
                    next === "\n"
                ) {

                    i++;
                }


                row.push(
                    field
                );


                if (
                    row.some(
                        value =>
                            value.length
                    )
                ) {

                    rows.push(
                        row
                    );
                }


                row = [];

                field = "";

                continue;
            }


            field +=
                char;
        }


        if (
            field.length ||
            row.length
        ) {

            row.push(
                field
            );

            rows.push(
                row
            );
        }


        if (!rows.length) {
            return [];
        }


        const headers =
            rows.shift()
                .map(
                    header =>
                        header
                            .trim()
                            .toLowerCase()
                );


        return rows.map(
            values => {

                const object = {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        object[header] =
                            values[index] ||
                            "";
                    }
                );


                return object;
            }
        );
    }


    /* =====================================================
       MATCH METADATA
       ===================================================== */

    function findMetadataForAudio(
        rows,
        filename
    ) {

        const normalized =
            normalizePath(
                filename
            );


        const shortName =
            normalized.replace(
                /^audio\//,
                ""
            );


        return rows.find(
            row => {

                const audio =
                    normalizePath(
                        row.audio ||
                        ""
                    );


                return (
                    audio ===
                        normalized ||

                    audio ===
                        shortName ||

                    audio.endsWith(
                        `/${shortName}`
                    )
                );
            }
        ) || null;
    }


    /* =====================================================
       README
       ===================================================== */

    function buildReadme(
        count
    ) {

        return [

            "Kentucky Voice Dataset",
            "=======================",
            "",
            `Recordings: ${count}`,
            `Created: ${new Date().toISOString()}`,
            "",

            "Audio configuration:",
            `Format: ${config.audio.format}`,
            `Sample rate: ${config.audio.sampleRate} Hz`,
            `Channels: ${config.audio.channels}`,
            `Bit depth: ${config.audio.bitDepth}`,
            `Normalize: ${config.audio.normalize}`,
            `Trim silence: ${config.audio.trimSilence}`,
            "",

            "Metadata:",
            `Format: ${config.metadata.format}`,
            `Audio column: ${config.metadata.audioColumn}`,
            `Text column: ${config.metadata.textColumn}`,
            "",

            "Files:",
            "audio/       Audio recordings",
            "metadata.csv Whisper-compatible transcript metadata",
            "config.json  Dataset configuration",
            "manifest.json Dataset manifest",
            "README.txt   This file",
            ""

        ].join("\n");
    }


    /* =====================================================
       FILENAMES
       ===================================================== */

    function makeAudioFilename(
        index,
        format
    ) {

        const extension =
            String(
                format ||
                "wav"
            )
                .toLowerCase()
                .replace(
                    "webm-opus",
                    "webm"
                );


        return (
            String(index)
                .padStart(
                    6,
                    "0"
                ) +
            "." +
            extension
        );
    }


    function sanitizeFilename(
        name
    ) {

        return String(
            name ||
            "dataset"
        )
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            )
            .replace(
                /\s+/g,
                "_"
            )
            .replace(
                /_+/g,
                "_"
            )
            .replace(
                /^\.|\.$/g,
                ""
            );
    }


    function timestamp() {

        const now =
            new Date();


        return (

            now.getFullYear() +

            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +

            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            ) +

            "-" +

            String(
                now.getHours()
            ).padStart(
                2,
                "0"
            ) +

            String(
                now.getMinutes()
            ).padStart(
                2,
                "0"
            ) +

            String(
                now.getSeconds()
            ).padStart(
                2,
                "0"
            )
        );
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function cleanText(
        text
    ) {

        return String(
            text ||
            ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }


    function normalizePath(
        path
    ) {

        return String(
            path ||
            ""
        )
            .replace(
                /\\/g,
                "/"
            )
            .replace(
                /^\.?\//,
                ""
            )
            .toLowerCase();
    }


    function structuredCloneSafe(
        value
    ) {

        if (
            typeof structuredClone ===
            "function"
        ) {

            return structuredClone(
                value
            );
        }


        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }


    function deepMerge(
        target,
        source
    ) {

        if (
            !source ||
            typeof source !==
                "object"
        ) {

            return target;
        }


        Object.keys(
            source
        ).forEach(
            key => {

                const value =
                    source[key];


                if (
                    value &&
                    typeof value ===
                        "object" &&
                    !Array.isArray(
                        value
                    )
                ) {

                    if (
                        !target[key] ||
                        typeof target[key] !==
                            "object"
                    ) {

                        target[key] = {};
                    }


                    deepMerge(
                        target[key],
                        value
                    );

                } else {

                    target[key] =
                        value;
                }
            }
        );


        return target;
    }


    function downloadBlob(
        blob,
        filename
    ) {

        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            filename;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );
    }


    function showStatus(
        message
    ) {

        /*
         * Your HTML uses:
         *
         * #import-export-status
         */

        const element =
            document.getElementById(
                "import-export-status"
            );


        if (element) {

            element.textContent =
                message;
        }


        console.log(
            message
        );
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        exportDataset,

        importDataset,

        getConfig,

        setConfig,

        buildMetadataCSV

    };

})();


window.DatasetExport =
    DatasetExport;


document.addEventListener(
    "DOMContentLoaded",
    () => {

        DatasetExport.init();

    }
);