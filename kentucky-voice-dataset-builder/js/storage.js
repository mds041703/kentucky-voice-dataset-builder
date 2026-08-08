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
 * - Generated sentence history
 *
 * Audio blobs are stored in IndexedDB rather than localStorage.
 * localStorage is fine for a few settings. It is a terrible place
 * to put hundreds of WAV files, because apparently browsers enjoy
 * having arbitrary storage limits.
 */

const Storage = (() => {

    const DB_NAME = "kentucky_voice_dataset_builder";
    const DB_VERSION = 1;

    const STORE_ENTRIES = "entries";
    const STORE_SETTINGS = "settings";
    const STORE_META = "meta";

    const SETTINGS_KEY = "app_settings";
    const CONFIG_KEY = "dataset_config";

    let db = null;
    let initialized = false;


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        if (initialized && db) {
            return db;
        }

        db = await openDatabase();

        initialized = true;

        return db;
    }


    /* =====================================================
       OPEN DATABASE
       ===================================================== */

    function openDatabase() {

        return new Promise((resolve, reject) => {

            if (!("indexedDB" in window)) {

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


                    /*
                     * Dataset recordings.
                     */

                    if (
                        !database.objectStoreNames.contains(
                            STORE_ENTRIES
                        )
                    ) {

                        const entries =
                            database.createObjectStore(
                                STORE_ENTRIES,
                                {
                                    keyPath: "id"
                                }
                            );


                        entries.createIndex(
                            "createdAt",
                            "createdAt",
                            {
                                unique: false
                            }
                        );


                        entries.createIndex(
                            "text",
                            "text",
                            {
                                unique: false
                            }
                        );


                        entries.createIndex(
                            "category",
                            "category",
                            {
                                unique: false
                            }
                        );


                        entries.createIndex(
                            "intent",
                            "intent",
                            {
                                unique: false
                            }
                        );
                    }


                    /*
                     * Application settings and dataset config.
                     */

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


                    /*
                     * Miscellaneous metadata.
                     */

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
                };


            request.onsuccess =
                event => {

                    resolve(
                        event.target.result
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
        });
    }


    /* =====================================================
       DATABASE TRANSACTION
       ===================================================== */

    async function ensureReady() {

        if (!db) {
            await init();
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


        const tx =
            db.transaction(
                storeName,
                mode
            );


        return tx.objectStore(
            storeName
        );
    }


    /* =====================================================
       ENTRY ID
       ===================================================== */

    function createId() {

        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {

            return crypto.randomUUID();
        }


        return (
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 12)
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
            (resolve, reject) => {

                const store =
                    transaction(
                        STORE_ENTRIES,
                        "readwrite"
                    );


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
                            request.error
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
            (resolve, reject) => {

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
                            request.result ||
                            null
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
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
            (resolve, reject) => {

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
                            request.result || [];


                        entries.sort(
                            (
                                a,
                                b
                            ) => {

                                return (
                                    new Date(
                                        a.createdAt || 0
                                    ) -
                                    new Date(
                                        b.createdAt || 0
                                    )
                                );
                            }
                        );


                        resolve(
                            entries
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
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
            (resolve, reject) => {

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
                            request.error
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
            (resolve, reject) => {

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
                            request.error
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
            (resolve, reject) => {

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
                            request.result || 0
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
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
            typeof value === "undefined"
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
            typeof value === "undefined"
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
            (resolve, reject) => {

                const store =
                    transaction(
                        storeName,
                        "readwrite"
                    );


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
                            request.error
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
            (resolve, reject) => {

                const store =
                    transaction(
                        storeName,
                        "readonly"
                    );


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
                            request.error
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

        const now =
            new Date()
                .toISOString();


        const normalized = {

            id:
                entry.id ||
                createId(),

            text:
                String(
                    entry.text ||
                    ""
                ).trim(),

            audioBlob:
                entry.audioBlob ||
                entry.blob ||
                null,

            mimeType:
                entry.mimeType ||
                (
                    entry.audioBlob &&
                    entry.audioBlob.type
                ) ||
                "audio/webm",

            duration:
                Number(
                    entry.duration ||
                    0
                ),

            category:
                entry.category ||
                "",

            intent:
                entry.intent ||
                "",

            generated:
                Boolean(
                    entry.generated
                ),

            recordedAt:
                entry.recordedAt ||
                now,

            createdAt:
                entry.createdAt ||
                now,

            updatedAt:
                now,

            source:
                entry.source ||
                "recorder",

            imported:
                Boolean(
                    entry.imported
                )
        };


        /*
         * Preserve any extra metadata the generator
         * or dataset manager gives us.
         */

        if (
            entry.template
        ) {

            normalized.template =
                entry.template;
        }


        if (
            entry.variables
        ) {

            normalized.variables =
                entry.variables;
        }


        if (
            entry.pronunciation
        ) {

            normalized.pronunciation =
                entry.pronunciation;
        }


        if (
            entry.tags
        ) {

            normalized.tags =
                entry.tags;
        }


        return normalized;
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


        for (
            const entry of backup.entries
        ) {

            await saveEntry(
                entry
            );
        }


        return true;
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

            db.close();

            db = null;

            initialized =
                false;
        }


        return new Promise(
            (resolve, reject) => {

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
                            request.error
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