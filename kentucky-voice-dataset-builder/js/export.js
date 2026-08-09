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

    let config =
        structuredCloneSafe(
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


        const importInput =
            document.getElementById(
                "import-dataset-file"
            );

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

        config =
            deepMerge(
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
                    "There are no dataset entries to export."
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
                        entry.recording &&
                        entry.recording.duration !==
                            undefined
                            ? Number(
                                entry.recording.duration
                            ) || 0
                            : Number(
                                entry.duration
                            ) || 0,

                    mimeType:
                        finalBlob.type ||
                        entry.recording?.mimeType ||
                        audioBlob.type ||
                        getMimeTypeFromFilename(
                            filename
                        ),

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
                            ? [
                                ...entry.regionalInfluence
                            ]
                            : [],

                    pronunciationTargets:
                        Array.isArray(
                            entry.pronunciationTargets
                        )
                            ? [
                                ...entry.pronunciationTargets
                            ]
                            : [],

                    generated:
                        entry.generated ||
                        false,

                    imported:
                        entry.imported ||
                        false
                });


                console.log(
                    `Added recording ${entry.id || index}: ${filename}`
                );


                index++;
            }


            if (
                !manifestEntries.length
            ) {

                showStatus(
                    "No valid recordings were found."
                );

                console.error(
                    "No valid recordings were found."
                );

                return;
            }


            const metadata =
                buildMetadataCSV(
                    metadataRows
                );


            zip.file(
                "metadata.csv",
                metadata
            );


            zip.file(
                "config.json",
                JSON.stringify(
                    config,
                    null,
                    2
                )
            );


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
                `Export failed: ${
                    error && error.message
                        ? error.message
                        : String(error)
                }`
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
                typeof Blob !== "undefined" &&
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

            const entries =
                Dataset.getEntries();

            return Array.isArray(
                entries
            )
                ? entries
                : [];
        }


        if (
            typeof Dataset.getAll ===
            "function"
        ) {

            const entries =
                Dataset.getAll();

            return Array.isArray(
                entries
            )
                ? entries
                : [];
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
                `Import failed: ${
                    error && error.message
                        ? error.message
                        : String(error)
                }`
            );

        } finally {

            input.value = "";
        }
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


        /*
         * Supports all of these structures:
         *
         * metadata.csv
         * audio/000001.wav
         *
         * dataset/
         *   metadata.csv
         *   audio/000001.wav
         *
         * dataset/audio/...
         *
         * The root is discovered from metadata.csv
         * and the audio folder rather than assuming a
         * particular ZIP layout.
         */

        const datasetRoot =
            findDatasetRoot(
                zip
            );


        /* =================================================
           CONFIG
           ================================================= */

        const configFile =
            findZipFile(
                zip,
                datasetRoot,
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
            findZipFile(
                zip,
                datasetRoot,
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
            findZipFile(
                zip,
                datasetRoot,
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


        /*
         * If the ZIP has no metadata.csv, a manifest can
         * still contain enough information to import the
         * recordings.
         *
         * If neither is available, try the simple
         * audio-folder fallback.
         */

        if (
            metadataRows.length === 0 &&
            !(
                manifest &&
                Array.isArray(
                    manifest.entries
                ) &&
                manifest.entries.length
            )
        ) {

            return await fallbackImportDataset(
                zip,
                datasetRoot
            );
        }


        /* =================================================
           AUDIO FILES
           ================================================= */

        const audioFiles =
            findAudioFiles(
                zip,
                datasetRoot
            );


        /*
         * Normal import requires audio. If there is no
         * usable audio folder, use the fallback importer,
         * which searches more broadly.
         */

        if (
            audioFiles.length === 0
        ) {

            return await fallbackImportDataset(
                zip,
                datasetRoot
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
                    audioFile.name,
                    datasetRoot
                );


            const manifestEntry =
                findManifestEntryForAudio(
                    manifest,
                    audioFile.name,
                    datasetRoot
                );


            const text =
                matchingMetadata
                    ? getMetadataText(
                        matchingMetadata
                    )
                    : manifestEntry
                        ? manifestEntry.text
                        : "";


            if (
                !text ||
                !String(text).trim()
            ) {

                console.warn(
                    "Skipping imported audio without transcript:",
                    audioFile.name
                );

                continue;
            }


            const now =
                new Date().toISOString();


            const duration =
                manifestEntry &&
                Number.isFinite(
                    Number(
                        manifestEntry.duration
                    )
                )
                    ? Number(
                        manifestEntry.duration
                    )
                    : 0;


            const mimeType =
                manifestEntry &&
                manifestEntry.mimeType
                    ? manifestEntry.mimeType
                    : blob.type ||
                        getMimeTypeFromFilename(
                            audioFile.name
                        );


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
                        ? [
                            ...manifestEntry.regionalInfluence
                        ]
                        : [],

                pronunciationTargets:
                    manifestEntry &&
                    Array.isArray(
                        manifestEntry.pronunciationTargets
                    )
                        ? [
                            ...manifestEntry.pronunciationTargets
                        ]
                        : [],

                duration,

                mimeType,

                createdAt:
                    manifestEntry &&
                    manifestEntry.createdAt
                        ? manifestEntry.createdAt
                        : now,

                imported:
                    true,

                recording: {

                    blob,

                    duration,

                    mimeType,

                    createdAt:
                        manifestEntry &&
                        manifestEntry.createdAt
                            ? manifestEntry.createdAt
                            : now
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


        /*
         * If the normal importer found audio but could
         * not import anything, try the simpler importer.
         */

        if (
            importedCount === 0
        ) {

            console.warn(
                "Normal dataset import imported no recordings. Attempting fallback import."
            );


            return await fallbackImportDataset(
                zip,
                datasetRoot
            );
        }


        showStatus(
            `Imported ${importedCount} recordings. Configuration restored.`
        );


        dispatchImportEvent(
            importedCount,
            getConfig(),
            false
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
       FIND DATASET ROOT
       ===================================================== */

    function findDatasetRoot(
        zip
    ) {

        const files =
            Object.values(
                zip.files
            );


        const metadataFiles =
            files.filter(
                entry => {

                    if (entry.dir) {
                        return false;
                    }


                    return (
                        normalizePath(
                            entry.name
                        ) ===
                        "metadata.csv"
                        ||
                        normalizePath(
                            entry.name
                        ).endsWith(
                            "/metadata.csv"
                        )
                    );
                }
            );


        /*
         * Prefer a metadata.csv that has a matching
         * audio folder beside it.
         */

        for (
            const metadataFile of metadataFiles
        ) {

            const normalized =
                normalizePath(
                    metadataFile.name
                );


            if (
                normalized ===
                "metadata.csv"
            ) {

                const hasAudio =
                    files.some(
                        entry => {

                            if (entry.dir) {
                                return false;
                            }


                            return normalizePath(
                                entry.name
                            ).startsWith(
                                "audio/"
                            );
                        }
                    );


                if (hasAudio) {
                    return "";
                }
            }


            const lastSlash =
                normalized.lastIndexOf(
                    "/"
                );


            const possibleRoot =
                normalized.substring(
                    0,
                    lastSlash + 1
                );


            const audioPrefix =
                `${possibleRoot}audio/`;


            const hasAudio =
                files.some(
                    entry => {

                        if (entry.dir) {
                            return false;
                        }


                        return normalizePath(
                            entry.name
                        ).startsWith(
                            audioPrefix
                        );
                    }
                );


            if (hasAudio) {

                return possibleRoot;
            }
        }


        /*
         * No metadata/audio pair found. Detect a single
         * common directory containing an audio folder.
         */

        const audioDirectories =
            files.filter(
                entry =>
                    entry.dir &&
                    normalizePath(
                        entry.name
                    ).endsWith(
                        "/audio/"
                    )
            );


        if (
            audioDirectories.length === 1
        ) {

            return normalizePath(
                audioDirectories[0].name
            ).replace(
                /audio\/$/,
                ""
            );
        }


        /*
         * Standard root.
         */

        return "";
    }


    /* =====================================================
       FIND ZIP FILE
       ===================================================== */

    function findZipFile(
        zip,
        datasetRoot,
        filename
    ) {

        const normalizedRoot =
            normalizePath(
                datasetRoot
            );


        const normalizedFilename =
            normalizePath(
                filename
            );


        const exactPath =
            `${normalizedRoot}${normalizedFilename}`;


        const exact =
            zip.file(
                exactPath
            );


        if (exact) {
            return exact;
        }


        const files =
            Object.values(
                zip.files
            );


        return (
            files.find(
                entry =>
                    !entry.dir &&
                    normalizePath(
                        entry.name
                    ) ===
                    exactPath
            ) ||
            files.find(
                entry =>
                    !entry.dir &&
                    normalizePath(
                        entry.name
                    ).endsWith(
                        `/${normalizedFilename}`
                    )
            ) ||
            null
        );
    }


    /* =====================================================
       FIND AUDIO FILES
       ===================================================== */

    function findAudioFiles(
        zip,
        datasetRoot = ""
    ) {

        const normalizedRoot =
            normalizePath(
                datasetRoot
            );


        const audioPrefix =
            `${normalizedRoot}audio/`;


        const supportedExtensions = [
            ".wav",
            ".webm",
            ".ogg",
            ".mp3",
            ".m4a",
            ".mp4",
            ".flac",
            ".aac",
            ".opus"
        ];


        const files =
            Object.values(
                zip.files
            );


        return files.filter(
            entry => {

                if (entry.dir) {
                    return false;
                }


                const normalized =
                    normalizePath(
                        entry.name
                    );


                if (
                    !normalized.startsWith(
                        audioPrefix
                    )
                ) {

                    return false;
                }


                return supportedExtensions.some(
                    extension =>
                        normalized.endsWith(
                            extension
                        )
                );
            }
        );
    }


    /* =====================================================
       FALLBACK IMPORT DATASET
       ===================================================== */

    async function fallbackImportDataset(
        zip,
        datasetRoot = ""
    ) {

        console.warn(
            "Attempting fallback dataset import."
        );


        showStatus(
            "Normal import failed. Checking audio and metadata..."
        );


        /*
         * First attempt the requested standard structure:
         *
         * audio/
         * metadata.csv
         *
         * The root may be empty or a folder.
         */

        let metadataFile =
            findZipFile(
                zip,
                datasetRoot,
                "metadata.csv"
            );


        /*
         * If metadata.csv was not found at the detected
         * root, search the entire ZIP for one.
         */

        if (!metadataFile) {

            const files =
                Object.values(
                    zip.files
                );


            metadataFile =
                files.find(
                    entry =>
                        !entry.dir &&
                        normalizePath(
                            entry.name
                        ).endsWith(
                            "/metadata.csv"
                        )
                ) ||
                files.find(
                    entry =>
                        !entry.dir &&
                        normalizePath(
                            entry.name
                        ) ===
                        "metadata.csv"
                ) ||
                null;
        }


        if (!metadataFile) {

            throw new Error(
                "Import failed. No metadata.csv was found."
            );
        }


        const metadataText =
            await metadataFile.async(
                "text"
            );


        const metadataRows =
            parseCSV(
                metadataText,
                config.metadata.delimiter ||
                ","
            );


        if (!metadataRows.length) {

            throw new Error(
                "Import failed. metadata.csv contains no dataset entries."
            );
        }


        /*
         * Determine the audio folder relative to the
         * metadata file when possible.
         */

        const metadataPath =
            normalizePath(
                metadataFile.name
            );


        const metadataSlash =
            metadataPath.lastIndexOf(
                "/"
            );


        const metadataRoot =
            metadataSlash >= 0
                ? metadataPath.substring(
                    0,
                    metadataSlash + 1
                )
                : "";


        let audioFiles =
            findAudioFiles(
                zip,
                datasetRoot
            );


        /*
         * If the detected root did not contain audio,
         * search relative to metadata.csv.
         */

        if (
            audioFiles.length === 0
        ) {

            audioFiles =
                findAudioFiles(
                    zip,
                    metadataRoot
                );
        }


        /*
         * Final fallback: locate any audio files whose
         * path contains an audio/ directory.
         */

        if (
            audioFiles.length === 0
        ) {

            const files =
                Object.values(
                    zip.files
                );


            const supportedExtensions = [
                ".wav",
                ".webm",
                ".ogg",
                ".mp3",
                ".m4a",
                ".mp4",
                ".flac",
                ".aac",
                ".opus"
            ];


            audioFiles =
                files.filter(
                    entry => {

                        if (entry.dir) {
                            return false;
                        }


                        const normalized =
                            normalizePath(
                                entry.name
                            );


                        if (
                            !normalized.includes(
                                "/audio/"
                            ) &&
                            !normalized.startsWith(
                                "audio/"
                            )
                        ) {

                            return false;
                        }


                        return supportedExtensions.some(
                            extension =>
                                normalized.endsWith(
                                    extension
                                )
                        );
                    }
                );
        }


        if (
            audioFiles.length === 0
        ) {

            throw new Error(
                "Import failed. No audio files were found in an audio/ folder."
            );
        }


        let importedCount =
            0;


        for (
            const audioFile of audioFiles
        ) {

            const matchingMetadata =
                findMetadataForAudio(
                    metadataRows,
                    audioFile.name,
                    datasetRoot
                );


            if (
                !matchingMetadata ||
                !getMetadataText(
                    matchingMetadata
                ).trim()
            ) {

                /*
                 * Try again using the metadata file's
                 * directory as the dataset root.
                 */

                const alternateMatch =
                    findMetadataForAudio(
                        metadataRows,
                        audioFile.name,
                        metadataRoot
                    );


                if (
                    !alternateMatch ||
                    !getMetadataText(
                        alternateMatch
                    ).trim()
                ) {

                    console.warn(
                        "Fallback skipped audio without matching transcript:",
                        audioFile.name
                    );

                    continue;
                }


                await importFallbackAudio(
                    audioFile,
                    alternateMatch
                );

                importedCount++;

                continue;
            }


            await importFallbackAudio(
                audioFile,
                matchingMetadata
            );


            importedCount++;
        }


        if (
            importedCount === 0
        ) {

            throw new Error(
                "Fallback import failed. No recordings could be imported using audio/ and metadata.csv."
            );
        }


        showStatus(
            `Fallback import complete: ${importedCount} recordings imported.`
        );


        dispatchImportEvent(
            importedCount,
            getConfig(),
            true
        );


        return {

            count:
                importedCount,

            config:
                getConfig(),

            manifest:
                null,

            fallback:
                true
        };
    }


    async function importFallbackAudio(
        audioFile,
        metadata
    ) {

        const blob =
            await audioFile.async(
                "blob"
            );


        const now =
            new Date().toISOString();


        const mimeType =
            blob.type ||
            getMimeTypeFromFilename(
                audioFile.name
            );


        /*
         * A fallback import intentionally does not
         * invent metadata that was not supplied.
         * The Dataset manager supplies its normal
         * defaults for category, style, etc.
         */

        const entry = {

            id:
                null,

            text:
                cleanText(
                    getMetadataText(
                        metadata
                    )
                ),

            category:
                "general",

            intent:
                null,

            style:
                "neutral",

            template:
                null,

            regionalInfluence:
                [],

            pronunciationTargets:
                [],

            duration:
                0,

            mimeType,

            createdAt:
                now,

            imported:
                true,

            recording: {

                blob,

                duration:
                    0,

                mimeType,

                createdAt:
                    now
            }
        };


        const imported =
            Dataset.importEntry(
                entry
            );


        if (!imported) {

            throw new Error(
                `Dataset rejected imported recording: ${audioFile.name}`
            );
        }


        console.log(
            `Imported recording: ${audioFile.name}`
        );


        return imported;
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


        const source =
            String(
                text ||
                ""
            );


        for (
            let i = 0;
            i < source.length;
            i++
        ) {

            const char =
                source[i];


            const next =
                source[i + 1];


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
                            String(
                                value
                            ).trim().length
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


            if (
                row.some(
                    value =>
                        String(
                            value
                        ).trim().length
                )
            ) {

                rows.push(
                    row
                );
            }
        }


        if (!rows.length) {
            return [];
        }


        const headers =
            rows
                .shift()
                .map(
                    header =>
                        String(
                            header
                        )
                            .replace(
                                /^\uFEFF/,
                                ""
                            )
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
                            values[index] !==
                                undefined
                                ? values[index]
                                : "";
                    }
                );


                return object;
            }
        );
    }


    /* =====================================================
       GET METADATA TEXT
       ===================================================== */

    function getMetadataText(
        row
    ) {

        if (
            !row ||
            typeof row !==
                "object"
        ) {

            return "";
        }


        const candidates = [

            row[
                String(
                    config.metadata.textColumn ||
                    "text"
                ).toLowerCase()
            ],

            row.text,

            row.transcript,

            row.sentence,

            row.utterance,

            row.phrase
        ];


        for (
            const value of candidates
        ) {

            if (
                value !== undefined &&
                value !== null &&
                String(
                    value
                ).trim()
            ) {

                return String(
                    value
                );
            }
        }


        return "";
    }


    /* =====================================================
       MATCH METADATA
       ===================================================== */

    function findMetadataForAudio(
        rows,
        filename,
        datasetRoot = ""
    ) {

        if (
            !Array.isArray(rows) ||
            !rows.length
        ) {

            return null;
        }


        const normalized =
            normalizePath(
                filename
            );


        const root =
            normalizePath(
                datasetRoot
            );


        let relativeFilename =
            normalized;


        if (
            root &&
            relativeFilename.startsWith(
                root
            )
        ) {

            relativeFilename =
                relativeFilename.substring(
                    root.length
                );
        }


        const shortName =
            relativeFilename.replace(
                /^audio\//,
                ""
            );


        const shortBasename =
            shortName.substring(
                shortName.lastIndexOf(
                    "/"
                ) + 1
            );


        return rows.find(
            row => {

                const audio =
                    getMetadataAudioPath(
                        row
                    );


                if (!audio) {
                    return false;
                }


                const normalizedAudio =
                    normalizePath(
                        audio
                    );


                const audioWithoutRoot =
                    root &&
                    normalizedAudio.startsWith(
                        root
                    )
                        ? normalizedAudio.substring(
                            root.length
                        )
                        : normalizedAudio;


                const audioWithoutAudioFolder =
                    audioWithoutRoot.replace(
                        /^audio\//,
                        ""
                    );


                const audioBasename =
                    audioWithoutAudioFolder.substring(
                        audioWithoutAudioFolder.lastIndexOf(
                            "/"
                        ) + 1
                    );


                return (
                    normalizedAudio ===
                        normalized
                    ||

                    audioWithoutRoot ===
                        relativeFilename
                    ||

                    audioWithoutRoot ===
                        shortName
                    ||

                    audioWithoutAudioFolder ===
                        shortName
                    ||

                    audioBasename ===
                        shortBasename
                    ||

                    normalizedAudio ===
                        `audio/${shortName}`
                    ||

                    normalizedAudio.endsWith(
                        `/${shortName}`
                    )
                );
            }
        ) || null;
    }


    function getMetadataAudioPath(
        row
    ) {

        if (
            !row ||
            typeof row !==
                "object"
        ) {

            return "";
        }


        const configuredColumn =
            String(
                config.metadata.audioColumn ||
                "audio"
            ).toLowerCase();


        const candidates = [

            row[
                configuredColumn
            ],

            row.audio,

            row.filename,

            row.file,

            row.path,

            row.wav,

            row.audiofile
        ];


        for (
            const value of candidates
        ) {

            if (
                value !== undefined &&
                value !== null &&
                String(
                    value
                ).trim()
            ) {

                return String(
                    value
                ).trim();
            }
        }


        return "";
    }


    /* =====================================================
       FIND MANIFEST ENTRY
       ===================================================== */

    function findManifestEntryForAudio(
        manifest,
        filename,
        datasetRoot = ""
    ) {

        if (
            !manifest ||
            !Array.isArray(
                manifest.entries
            )
        ) {

            return null;
        }


        const target =
            normalizeDatasetAudioPath(
                filename,
                datasetRoot
            );


        return manifest.entries.find(
            item => {

                if (
                    !item ||
                    !item.audio
                ) {

                    return false;
                }


                const itemPath =
                    normalizeDatasetAudioPath(
                        item.audio,
                        datasetRoot
                    );


                return (
                    itemPath ===
                    target
                );
            }
        ) || null;
    }


    /* =====================================================
       NORMALIZE DATASET AUDIO PATH
       ===================================================== */

    function normalizeDatasetAudioPath(
        path,
        datasetRoot = ""
    ) {

        const normalized =
            normalizePath(
                path
            );


        const root =
            normalizePath(
                datasetRoot
            );


        if (
            root &&
            normalized.startsWith(
                root
            )
        ) {

            return normalized.substring(
                root.length
            );
        }


        return normalized;
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

            "Whisper training audio specification:",
            "Recommended format: WAV",
            "Sample rate: 16000 Hz",
            "Channels: 1 (mono)",
            "Bit depth: 16-bit PCM",
            "",

            "Metadata:",
            `Format: ${config.metadata.format}`,
            `Audio column: ${config.metadata.audioColumn}`,
            `Text column: ${config.metadata.textColumn}`,
            "",

            "Standard import structure:",
            "audio/",
            "  000001.wav",
            "  000002.wav",
            "metadata.csv",
            "",
            "metadata.csv must contain:",
            "audio,text",
            "audio/000001.wav,The sentence spoken in the recording.",
            "audio/000002.wav,Another sentence.",
            "",
            "The audio paths in metadata.csv should point to files",
            "inside the audio/ directory.",
            "",
            "Fallback imports can use a simple audio/ folder and",
            "metadata.csv without config.json or manifest.json.",
            "",

            "Files:",
            "audio/        Audio recordings",
            "metadata.csv  Whisper-compatible transcript metadata",
            "config.json   Dataset configuration",
            "manifest.json Dataset manifest",
            "README.txt    This file",
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
            ) ||
            "dataset";
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
       AUDIO MIME HELPERS
       ===================================================== */

    function getMimeTypeFromFilename(
        filename
    ) {

        const extension =
            String(
                filename ||
                ""
            )
                .toLowerCase()
                .split(
                    "."
                )
                .pop();


        const types = {

            wav:
                "audio/wav",

            webm:
                "audio/webm",

            ogg:
                "audio/ogg",

            opus:
                "audio/opus",

            mp3:
                "audio/mpeg",

            m4a:
                "audio/mp4",

            mp4:
                "audio/mp4",

            flac:
                "audio/flac",

            aac:
                "audio/aac"
        };


        return (
            types[extension] ||
            "application/octet-stream"
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
            .replace(
                /\/+/g,
                "/"
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

            try {

                return structuredClone(
                    value
                );

            } catch (_) {
                /*
                 * Fall through to JSON cloning.
                 * Configuration contains plain data only.
                 */
            }
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
                            "object" ||
                        Array.isArray(
                            target[key]
                        )
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

                try {

                    URL.revokeObjectURL(
                        url
                    );

                } catch (_) {
                    /* Ignore cleanup failures. */
                }

            },
            1000
        );
    }


    function showStatus(
        message
    ) {

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


    function dispatchImportEvent(
        count,
        importedConfig,
        fallback
    ) {

        document.dispatchEvent(
            new CustomEvent(
                "dataset-imported",
                {
                    detail: {

                        count,

                        config:
                            importedConfig,

                        fallback:
                            Boolean(
                                fallback
                            )
                    }
                }
            )
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
