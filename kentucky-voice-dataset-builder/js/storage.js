"use strict";

/*
 * Kentucky Voice Dataset Builder
 * js/storage.js
 *
 * Local persistent storage.
 *
 * Stores:
 * - Application settings
 * - Dataset configuration
 * - Dataset entries
 * - Generated sentence history / metadata
 *
 * Audio blobs are stored directly in IndexedDB.
 *
 * The storage layer intentionally keeps compatibility with both:
 *
 *   entry.audioBlob
 *
 * and:
 *
 *   entry.recording.blob
 *
 * so imported recordings, newly recorded recordings, generated
 * entries, and exported datasets all use the same underlying data.
 */

const Storage = (() => {

    const DB_NAME =
        "kentucky_voice_dataset_builder";

    /*
     * Version 2 adds compatibility indexes and normalizes the
     * recording structure without destroying existing data.
     */
    const DB_VERSION = 2;

    const STORE_ENTRIES =
        "entries";

    const STORE_SETTINGS =
        "settings";

    const STORE_META =
        "meta";

    const SETTINGS_KEY =
        "app_settings";

    const CONFIG_KEY =
        "dataset_config";

    let db = null;
    let initialized = false;


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        if (
            initialized &&
            db
        ) {

            return db;
        }

        db =
            await openDatabase();

        initialized =
            true;

        /*
         * If another tab upgrades the database, this connection
         * must be discarded so the next operation can reopen it.
         */
        db.onversionchange =
            () => {

                try {
                    db.close();
                } catch (error) {
                    console.warn(
                        "Unable to close IndexedDB connection:",
                        error
                    );
                }

                db = null;
                initialized = false;
            };

        return db;
    }


    /* =====================================================
       OPEN DATABASE
       ===================================================== */

    function openDatabase() {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                if (
                    !("indexedDB" in window)
                ) {

                    reject(
                        new Error(
                            "IndexedDB is not supported by this browser."
                        )
                    );

                    return;
                }

                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );


                request.onupgradeneeded =
                    event => {

                        const database =
                            event.target.result;

                        const oldVersion =
                            event.oldVersion || 0;


                        /* ---------------------------------
                           DATASET ENTRIES
                           --------------------------------- */

                        let entries;

                        if (
                            database.objectStoreNames.contains(
                                STORE_ENTRIES
                            )
                        ) {

                            entries =
                                event.target.transaction.objectStore(
                                    STORE_ENTRIES
                                );

                        } else {

                            entries =
                                database.createObjectStore(
                                    STORE_ENTRIES,
                                    {
                                        keyPath: "id"
                                    }
                                );
                        }


                        /*
                         * Create indexes only when they do not
                         * already exist. This keeps upgrades safe.
                         */

                        createIndexIfMissing(
                            entries,
                            "createdAt",
                            "createdAt"
                        );

                        createIndexIfMissing(
                            entries,
                            "text",
                            "text"
                        );

                        createIndexIfMissing(
                            entries,
                            "category",
                            "category"
                        );

                        createIndexIfMissing(
                            entries,
                            "intent",
                            "intent"
                        );

                        createIndexIfMissing(
                            entries,
                            "generated",
                            "generated"
                        );

                        createIndexIfMissing(
                            entries,
                            "imported",
                            "imported"
                        );


                        /* ---------------------------------
                           SETTINGS
                           --------------------------------- */

                        if (
                            !database.objectStoreNames.contains(
                                STORE_SETTINGS
                            )
                        ) {

                            database.createObjectStore(
                                STORE_SETTINGS,
                                {
                                    keyPath: "key"
                                }
                            );
                        }


                        /* ---------------------------------
                           META
                           --------------------------------- */

                        if (
                            !database.objectStoreNames.contains(
                                STORE_META
                            )
                        ) {

                            database.createObjectStore(
                                STORE_META,
                                {
                                    keyPath: "key"
                                }
                            );
                        }


                        /*
                         * Existing version 1 records are left intact.
                         * normalizeEntry() handles compatibility when
                         * they are read or saved.
                         */

                        if (
                            oldVersion < 2
                        ) {

                            console.log(
                                "Upgraded dataset storage from version 1 to version 2."
                            );
                        }
                    };


                request.onsuccess =
                    event => {

                        const database =
                            event.target.result;

                        resolve(
                            database
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to open IndexedDB."
                            )
                        );
                    };


                request.onblocked =
                    () => {

                        reject(
                            new Error(
                                "Opening the database was blocked by another tab. Close other copies of the application and try again."
                            )
                        );
                    };
            }
        );
    }


    function createIndexIfMissing(
        store,
        name,
        keyPath
    ) {

        if (
            !store.indexNames.contains(
                name
            )
        ) {

            store.createIndex(
                name,
                keyPath,
                {
                    unique: false
                }
            );
        }
    }


    /* =====================================================
       DATABASE TRANSACTION
       ===================================================== */

    async function ensureReady() {

        if (!db) {
            await init();
        }

        if (!db) {

            throw new Error(
                "IndexedDB is unavailable."
            );
        }

        return db;
    }


    function transaction(
        storeName,
        mode
    ) {

        if (!db) {

            throw new Error(
                "Storage has not been initialized."
            );
        }

        return db.transaction(
            storeName,
            mode
        ).objectStore(
            storeName
        );
    }


    /* =====================================================
       ENTRY ID
       ===================================================== */

    function createId() {

        if (
            typeof crypto !==
                "undefined" &&
            typeof crypto.randomUUID ===
                "function"
        ) {

            return crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .substring(
                    2,
                    12
                )
        );
    }


    /* =====================================================
       SAVE ENTRY
       ===================================================== */

    async function saveEntry(
        entry
    ) {

        await ensureReady();

        const normalized =
            normalizeEntry(
                entry
            );

        return new Promise(
            (
                resolve,
                reject
            ) => {

                let store;

                try {

                    store =
                        transaction(
                            STORE_ENTRIES,
                            "readwrite"
                        );

                } catch (error) {

                    reject(
                        error
                    );

                    return;
                }


                const request =
                    store.put(
                        normalized
                    );


                request.onsuccess =
                    () => {

                        resolve(
                            normalized
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to save dataset entry."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       GET ENTRY
       ===================================================== */

    async function getEntry(
        id
    ) {

        await ensureReady();

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readonly"
                    );

                const request =
                    store.get(
                        id
                    );

                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                                ? normalizeLoadedEntry(
                                    request.result
                                )
                                : null
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to load dataset entry."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       GET ALL ENTRIES
       ===================================================== */

    async function getAllEntries() {

        await ensureReady();

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readonly"
                    );

                const request =
                    store.getAll();

                request.onsuccess =
                    () => {

                        const entries =
                            request.result ||
                            [];

                        const normalized =
                            entries.map(
                                normalizeLoadedEntry
                            );

                        normalized.sort(
                            (
                                a,
                                b
                            ) => {

                                const aDate =
                                    new Date(
                                        a.createdAt ||
                                        a.recordedAt ||
                                        0
                                    ).getTime();

                                const bDate =
                                    new Date(
                                        b.createdAt ||
                                        b.recordedAt ||
                                        0
                                    ).getTime();

                                return (
                                    aDate -
                                    bDate
                                );
                            }
                        );

                        resolve(
                            normalized
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to load dataset entries."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       DELETE ENTRY
       ===================================================== */

    async function deleteEntry(
        id
    ) {

        await ensureReady();

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readwrite"
                    );

                const request =
                    store.delete(
                        id
                    );

                request.onsuccess =
                    () => {

                        resolve(
                            true
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to delete dataset entry."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       CLEAR ENTRIES
       ===================================================== */

    async function clearEntries() {

        await ensureReady();

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readwrite"
                    );

                const request =
                    store.clear();

                request.onsuccess =
                    () => {

                        resolve(
                            true
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to clear dataset entries."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       ENTRY COUNT
       ===================================================== */

    async function countEntries() {

        await ensureReady();

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readonly"
                    );

                const request =
                    store.count();

                request.onsuccess =
                    () => {

                        resolve(
                            Number(
                                request.result ||
                                0
                            )
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to count dataset entries."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       SAVE SETTINGS
       ===================================================== */

    async function saveSettings(
        settings
    ) {

        await ensureReady();

        return saveKeyValue(
            STORE_SETTINGS,
            SETTINGS_KEY,
            settings
        );
    }


    /* =====================================================
       LOAD SETTINGS
       ===================================================== */

    async function loadSettings(
        defaultValue = {}
    ) {

        await ensureReady();

        const value =
            await loadKeyValue(
                STORE_SETTINGS,
                SETTINGS_KEY
            );

        if (
            value === null ||
            typeof value ===
                "undefined"
        ) {

            return structuredCloneSafe(
                defaultValue
            );
        }

        return value;
    }


    /* =====================================================
       SAVE DATASET CONFIG
       ===================================================== */

    async function saveConfig(
        config
    ) {

        await ensureReady();

        return saveKeyValue(
            STORE_SETTINGS,
            CONFIG_KEY,
            config
        );
    }


    /* =====================================================
       LOAD DATASET CONFIG
       ===================================================== */

    async function loadConfig(
        defaultValue = {}
    ) {

        await ensureReady();

        const value =
            await loadKeyValue(
                STORE_SETTINGS,
                CONFIG_KEY
            );

        if (
            value === null ||
            typeof value ===
                "undefined"
        ) {

            return structuredCloneSafe(
                defaultValue
            );
        }

        return value;
    }


    /* =====================================================
       GENERIC KEY/VALUE
       ===================================================== */

    async function saveKeyValue(
        storeName,
        key,
        value
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                let store;

                try {

                    store =
                        transaction(
                            storeName,
                            "readwrite"
                        );

                } catch (error) {

                    reject(
                        error
                    );

                    return;
                }

                const request =
                    store.put({

                        key,

                        value,

                        updatedAt:
                            new Date()
                                .toISOString()
                    });

                request.onsuccess =
                    () => {

                        resolve(
                            value
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                `Unable to save ${key}.`
                            )
                        );
                    };
            }
        );
    }


    async function loadKeyValue(
        storeName,
        key
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                let store;

                try {

                    store =
                        transaction(
                            storeName,
                            "readonly"
                        );

                } catch (error) {

                    reject(
                        error
                    );

                    return;
                }

                const request =
                    store.get(
                        key
                    );

                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                                ? request.result.value
                                : null
                        );
                    };

                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                `Unable to load ${key}.`
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       META
       ===================================================== */

    async function saveMeta(
        key,
        value
    ) {

        await ensureReady();

        return saveKeyValue(
            STORE_META,
            key,
            value
        );
    }


    async function loadMeta(
        key,
        defaultValue = null
    ) {

        await ensureReady();

        const value =
            await loadKeyValue(
                STORE_META,
                key
            );

        return value === null
            ? defaultValue
            : value;
    }


    /* =====================================================
       NORMALIZE ENTRY
       ===================================================== */

    function normalizeEntry(
        entry
    ) {

        if (
            !entry ||
            typeof entry !==
                "object"
        ) {

            throw new Error(
                "Cannot save an invalid dataset entry."
            );
        }

        const now =
            new Date()
                .toISOString();


        /*
         * Accept audio from all structures used by the
         * application:
         *
         * entry.recording.blob
         * entry.audioBlob
         * entry.blob
         * entry.audio
         */
        const audioBlob =
            getAudioBlob(
                entry
            );


        const mimeType =
            entry.mimeType ||
            entry.recording?.mimeType ||
            (
                audioBlob &&
                audioBlob.type
            ) ||
            "audio/webm";


        const duration =
            getDuration(
                entry
            );


        const createdAt =
            entry.createdAt ||
            entry.recordedAt ||
            entry.recording?.createdAt ||
            now;


        const recordedAt =
            entry.recordedAt ||
            entry.recording?.createdAt ||
            createdAt;


        const normalized = {

            id:
                entry.id ||
                createId(),

            text:
                String(
                    entry.text ||
                    ""
                ).trim(),

            /*
             * Keep the legacy top-level field.
             */
            audioBlob:
                audioBlob,

            mimeType:
                mimeType,

            duration:
                duration,

            category:
                entry.category ||
                "general",

            intent:
                entry.intent ||
                "",

            style:
                entry.style ||
                "neutral",

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
                Boolean(
                    entry.generated
                ),

            recordedAt:
                recordedAt,

            createdAt:
                createdAt,

            updatedAt:
                now,

            source:
                entry.source ||
                (
                    entry.imported
                        ? "import"
                        : "recorder"
                ),

            imported:
                Boolean(
                    entry.imported
                ),

            /*
             * Keep a normalized recording object as well.
             * This matches the structure used by exporter.js
             * and imported dataset entries.
             */
            recording: {

                blob:
                    audioBlob,

                duration:
                    duration,

                mimeType:
                    mimeType,

                createdAt:
                    createdAt
            }
        };


        /*
         * Preserve generator variables and other optional
         * metadata without storing undefined values.
         */

        if (
            entry.variables !==
            undefined
        ) {

            normalized.variables =
                structuredCloneSafe(
                    entry.variables
                );
        }


        if (
            entry.pronunciation !==
            undefined
        ) {

            normalized.pronunciation =
                structuredCloneSafe(
                    entry.pronunciation
                );
        }


        if (
            entry.tags !==
            undefined
        ) {

            normalized.tags =
                structuredCloneSafe(
                    entry.tags
                );
        }


        if (
            entry.generatedAt
        ) {

            normalized.generatedAt =
                entry.generatedAt;
        }


        return normalized;
    }


    /* =====================================================
       LOADED ENTRY NORMALIZATION
       ===================================================== */

    function normalizeLoadedEntry(
        entry
    ) {

        if (
            !entry ||
            typeof entry !==
                "object"
        ) {

            return entry;
        }


        /*
         * Old database records may only contain audioBlob.
         * New records contain both audioBlob and recording.blob.
         */
        const audioBlob =
            getAudioBlob(
                entry
            );


        const duration =
            getDuration(
                entry
            );


        const mimeType =
            entry.mimeType ||
            entry.recording?.mimeType ||
            (
                audioBlob &&
                audioBlob.type
            ) ||
            "audio/webm";


        const createdAt =
            entry.createdAt ||
            entry.recordedAt ||
            entry.recording?.createdAt ||
            new Date()
                .toISOString();


        /*
         * Do not mutate the object returned by IndexedDB.
         */
        const normalized = {

            ...entry,

            audioBlob,

            mimeType,

            duration,

            createdAt,

            recordedAt:
                entry.recordedAt ||
                createdAt,

            category:
                entry.category ||
                "general",

            intent:
                entry.intent ||
                "",

            style:
                entry.style ||
                "neutral",

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

            recording: {

                ...(entry.recording || {}),

                blob:
                    audioBlob,

                duration,

                mimeType,

                createdAt:
                    entry.recording?.createdAt ||
                    createdAt
            }
        };


        return normalized;
    }


    /* =====================================================
       AUDIO HELPERS
       ===================================================== */

    function getAudioBlob(
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


        /*
         * IndexedDB may return Blob-like objects in some
         * browser implementations. Only accept them when
         * they provide the required Blob interface.
         */
        for (
            const candidate of candidates
        ) {

            if (
                candidate &&
                typeof candidate ===
                    "object" &&
                typeof candidate.slice ===
                    "function" &&
                typeof candidate.size ===
                    "number"
            ) {

                return candidate;
            }
        }


        return null;
    }


    function getDuration(
        entry
    ) {

        const candidates = [

            entry &&
                entry.duration,

            entry &&
                entry.recording &&
                entry.recording.duration
        ];


        for (
            const value of candidates
        ) {

            const number =
                Number(
                    value
                );


            if (
                Number.isFinite(
                    number
                ) &&
                number >= 0
            ) {

                return number;
            }
        }


        return 0;
    }


    /* =====================================================
       BACKUP ALL DATA
       ===================================================== */

    async function exportStorageData() {

        await ensureReady();

        const entries =
            await getAllEntries();

        const settings =
            await loadSettings(
                {}
            );

        const datasetConfig =
            await loadConfig(
                {}
            );


        return {

            version:
                DB_VERSION,

            exportedAt:
                new Date()
                    .toISOString(),

            entries,

            settings,

            datasetConfig
        };
    }


    /* =====================================================
       RESTORE DATA
       ===================================================== */

    async function importStorageData(
        backup
    ) {

        if (
            !backup ||
            !Array.isArray(
                backup.entries
            )
        ) {

            throw new Error(
                "Invalid storage backup."
            );
        }


        await ensureReady();


        if (
            backup.settings
        ) {

            await saveSettings(
                backup.settings
            );
        }


        if (
            backup.datasetConfig
        ) {

            await saveConfig(
                backup.datasetConfig
            );
        }


        let importedCount =
            0;


        for (
            const entry of backup.entries
        ) {

            await saveEntry(
                entry
            );

            importedCount++;
        }


        return {

            success:
                true,

            count:
                importedCount
        };
    }


    /* =====================================================
       DATABASE INFORMATION
       ===================================================== */

    async function getDatabaseInfo() {

        await ensureReady();

        return {

            name:
                DB_NAME,

            version:
                DB_VERSION,

            entries:
                await countEntries()
        };
    }


    /* =====================================================
       DELETE DATABASE
       ===================================================== */

    async function deleteDatabase() {

        if (db) {

            try {
                db.close();
            } catch (error) {
                console.warn(
                    "Unable to close database before deletion:",
                    error
                );
            }

            db = null;

            initialized =
                false;
        }


        return new Promise(
            (
                resolve,
                reject
            ) => {

                if (
                    !("indexedDB" in window)
                ) {

                    reject(
                        new Error(
                            "IndexedDB is not supported by this browser."
                        )
                    );

                    return;
                }


                const request =
                    indexedDB.deleteDatabase(
                        DB_NAME
                    );


                request.onsuccess =
                    () => {

                        resolve(
                            true
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to delete database."
                            )
                        );
                    };


                request.onblocked =
                    () => {

                        reject(
                            new Error(
                                "Database deletion was blocked. Close other tabs using the application."
                            )
                        );
                    };
            }
        );
    }


    /* =====================================================
       HELPERS
       ===================================================== */

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


        /*
         * JSON fallback cannot preserve Blob objects.
         * This is only used for metadata/configuration,
         * not for the actual recording blob.
         */
        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        saveEntry,

        getEntry,

        getAllEntries,

        deleteEntry,

        clearEntries,

        countEntries,

        saveSettings,

        loadSettings,

        saveConfig,

        loadConfig,

        saveMeta,

        loadMeta,

        exportStorageData,

        importStorageData,

        getDatabaseInfo,

        deleteDatabase

    };

})();


window.Storage =
    Storage;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await Storage.init();

            console.log(
                "Storage initialized."
            );

        } catch (error) {

            console.error(
                "Storage initialization failed:",
                error
            );
        }
    }
);
