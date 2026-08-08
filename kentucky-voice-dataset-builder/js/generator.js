/*
 * Kentucky Voice Dataset Builder
 * js/generator.js
 *
 * Generates varied smart-home utterances using:
 *
 *  - templates
 *  - vocabulary
 *  - regional/Appalachian language
 *  - smart-home intents
 *  - weighted random selection
 */

"use strict";

window.Generator = (() => {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        initialized: false,

        templates: null,

        vocabulary: null,

        pronunciation: null,

        smartHome: null,

        loaded: false,

        lastGenerated: [],

        generationCount: 0
    };


    /* =====================================================
       DEFAULT DATA
       ===================================================== */

    const DEFAULT_DATA = {

        templates: {
            patterns: []
        },

        vocabulary: {
            openings: [],
            actions: [],
            devices: [],
            locations: [],
            connectors: [],
            pronouns: [],
            modifiers: [],
            questions: [],
            regional: []
        },

        pronunciation: {
            substitutions: [],
            targets: []
        },

        smartHome: {
            intents: [],
            devices: [],
            locations: []
        }
    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }


        await loadData();


        setupControls();


        state.initialized = true;


        console.log(
            "Generator initialized."
        );
    }


    /* =====================================================
       LOAD JSON DATA
       ===================================================== */

    async function loadData() {

        state.templates =
            await loadJson(
                "data/templates.json",
                DEFAULT_DATA.templates
            );


        state.vocabulary =
            await loadJson(
                "data/vocabulary.json",
                DEFAULT_DATA.vocabulary
            );


        state.pronunciation =
            await loadJson(
                "data/pronunciation.json",
                DEFAULT_DATA.pronunciation
            );


        state.smartHome =
            await loadJson(
                "data/smart-home.json",
                DEFAULT_DATA.smartHome
            );


        state.loaded = true;
    }


    async function loadJson(
        path,
        fallback
    ) {

        try {

            const response =
                await fetch(path);


            if (!response.ok) {

                throw new Error(
                    `${response.status} ${response.statusText}`
                );
            }


            const data =
                await response.json();


            return data;


        } catch (error) {

            console.warn(
                `Could not load ${path}:`,
                error
            );


            return fallback;
        }
    }


    /* =====================================================
       UI
       ===================================================== */

    function setupControls() {

        const generateButton =
            document.getElementById(
                "generate-button"
            );


        if (generateButton) {

            generateButton.addEventListener(
                "click",
                generateFromUI
            );
        }


        const addButton =
            document.getElementById(
                "add-generated-button"
            );


        if (addButton) {

            addButton.addEventListener(
                "click",
                addSelectedGeneratedToDataset
            );
        }


        const addAllButton =
            document.getElementById(
                "add-all-generated-button"
            );


        if (addAllButton) {

            addAllButton.addEventListener(
                "click",
                addAllGeneratedToDataset
            );
        }
    }


    /* =====================================================
       GENERATE FROM UI
       ===================================================== */

    function generateFromUI() {

        const options =
            readGeneratorOptions();


        const count =
            Math.max(
                1,
                Math.min(
                    1000,
                    options.count
                )
            );


        const sentences =
            generate(
                count,
                options
            );


        state.lastGenerated =
            sentences;


        renderGenerated(
            sentences
        );


        setStatus(
            `Generated ${sentences.length} sentences.`
        );
    }


    function readGeneratorOptions() {

        return {

            category:
                getValue(
                    "generator-category"
                ) ||
                "general",

            count:
                getNumber(
                    "generator-count",
                    25
                ),

            southernInfluence:
                getNumber(
                    "generator-southern",
                    50
                ),

            appalachianInfluence:
                getNumber(
                    "generator-appalachian",
                    50
                ),

            informality:
                getNumber(
                    "generator-informality",
                    70
                )
        };
    }


    /* =====================================================
       MAIN GENERATOR
       ===================================================== */

    function generate(
        count,
        options = {}
    ) {

        const safeCount =
            Math.max(
                1,
                Number(count) || 1
            );


        const results = [];

        const usedTexts =
            new Set();


        let attempts = 0;


        const maximumAttempts =
            safeCount * 20;


        while (
            results.length <
                safeCount &&
            attempts <
                maximumAttempts
        ) {

            attempts++;


            const result =
                generateOne(
                    options
                );


            if (!result) {
                continue;
            }


            const normalized =
                normalizeForComparison(
                    result.text
                );


            if (
                usedTexts.has(
                    normalized
                )
            ) {
                continue;
            }


            usedTexts.add(
                normalized
            );


            results.push(
                result
            );
        }


        state.generationCount +=
            results.length;


        return results;
    }


    /* =====================================================
       GENERATE ONE
       ===================================================== */

    function generateOne(
        options
    ) {

        const intent =
            selectIntent(
                options.category
            );


        if (!intent) {

            return generateFallback(
                options
            );
        }


        const context =
            buildContext(
                intent,
                options
            );


        const template =
            selectTemplate(
                context,
                options
            );


        if (!template) {

            return generateFallback(
                options
            );
        }


        let text;


        if (
            typeof template ===
            "string"
        ) {

            text =
                renderTemplate(
                    template,
                    context
                );

        } else {

            text =
                renderTemplate(
                    template.pattern ||
                    template.text ||
                    "",
                    context
                );
        }


        text =
            cleanSentence(
                text
            );


        if (!text) {
            return null;
        }


        /*
         * Apply optional regional phrasing after the main
         * sentence has been constructed.
         */

        text =
            applyRegionalStyle(
                text,
                options
            );


        text =
            cleanSentence(
                text
            );


        return {

            text,

            category:
                options.category ||
                intent.category ||
                "general",

            intent:
                intent.id ||
                intent.intent ||
                null,

            style:
                context.style ||
                "neutral",

            regionalInfluence:
                context.regionalInfluence,

            pronunciationTargets:
                findPronunciationTargets(
                    text
                ),

            template:
                template.id ||
                template.name ||
                null,

            generatedAt:
                new Date().toISOString()
        };
    }


    /* =====================================================
       CONTEXT
       ===================================================== */

    function buildContext(
        intent,
        options
    ) {

        const device =
            selectDevice(
                intent
            );


        const location =
            selectLocation(
                intent
            );


        const action =
            selectAction(
                intent
            );


        const opening =
            selectOpening(
                options
            );


        const connector =
            selectVocabulary(
                "connectors",
                options
            );


        const modifier =
            selectVocabulary(
                "modifiers",
                options
            );


        const pronoun =
            selectVocabulary(
                "pronouns",
                options
            );


        const question =
            selectVocabulary(
                "questions",
                options
            );


        const regionalWords =
            selectRegionalWords(
                options
            );


        const style =
            selectStyle(
                options
            );


        return {

            opening,

            action,

            device,

            location,

            connector,

            modifier,

            pronoun,

            question,

            regional:
                regionalWords,

            style,

            intent:
                intent.id ||
                intent.intent ||
                null,

            regionalInfluence:
                regionalWords.map(
                    item =>
                        item.id ||
                        item.word ||
                        item
                )
        };
    }


    /* =====================================================
       INTENTS
       ===================================================== */

    function selectIntent(
        category
    ) {

        const intents =
            getIntents();


        if (!intents.length) {
            return null;
        }


        let candidates =
            intents;


        if (
            category &&
            category !== "general"
        ) {

            const categoryMatches =
                intents.filter(
                    intent =>
                        intent.category ===
                        category ||
                        intent.id ===
                        category
                );


            if (
                categoryMatches.length
            ) {

                candidates =
                    categoryMatches;
            }
        }


        return weightedChoice(
            candidates
        );
    }


    function getIntents() {

        const data =
            state.smartHome;


        if (
            !data ||
            !Array.isArray(
                data.intents
            )
        ) {

            return [];
        }


        return data.intents;
    }


    /* =====================================================
       ACTION
       ===================================================== */

    function selectAction(
        intent
    ) {

        if (
            intent &&
            Array.isArray(
                intent.actions
            ) &&
            intent.actions.length
        ) {

            return weightedChoice(
                intent.actions
            );
        }


        return selectVocabulary(
            "actions"
        );
    }


    /* =====================================================
       DEVICE
       ===================================================== */

    function selectDevice(
        intent
    ) {

        if (
            intent &&
            Array.isArray(
                intent.devices
            ) &&
            intent.devices.length
        ) {

            return weightedChoice(
                intent.devices
            );
        }


        const devices =
            state.smartHome &&
            Array.isArray(
                state.smartHome.devices
            )
                ? state.smartHome.devices
                : [];


        if (devices.length) {

            return weightedChoice(
                devices
            );
        }


        return selectVocabulary(
            "devices"
        );
    }


    /* =====================================================
       LOCATION
       ===================================================== */

    function selectLocation(
        intent
    ) {

        if (
            intent &&
            Array.isArray(
                intent.locations
            ) &&
            intent.locations.length
        ) {

            return weightedChoice(
                intent.locations
            );
        }


        const locations =
            state.smartHome &&
            Array.isArray(
                state.smartHome.locations
            )
                ? state.smartHome.locations
                : [];


        if (locations.length) {

            return weightedChoice(
                locations
            );
        }


        return selectVocabulary(
            "locations"
        );
    }


    /* =====================================================
       OPENINGS
       ===================================================== */

    function selectOpening(
        options
    ) {

        const openings =
            getVocabulary(
                "openings"
            );


        if (!openings.length) {
            return "";
        }


        /*
         * Informal speech gets more conversational
         * openings.
         */

        const filtered =
            openings.filter(
                item => {

                    const informality =
                        getWeight(
                            item,
                            "informality",
                            50
                        );


                    return (
                        Math.random() * 100
                    ) <=
                    (
                        options.informality >=
                        informality
                            ? 100
                            : 50
                    );
                }
            );


        return weightedChoice(
            filtered.length
                ? filtered
                : openings
        );
    }


    /* =====================================================
       VOCABULARY
       ===================================================== */

    function selectVocabulary(
        category,
        options = {}
    ) {

        const values =
            getVocabulary(
                category
            );


        if (!values.length) {
            return "";
        }


        return weightedChoice(
            values
        );
    }


    function getVocabulary(
        category
    ) {

        const data =
            state.vocabulary;


        if (
            !data ||
            !Array.isArray(
                data[category]
            )
        ) {

            return [];
        }


        return data[category];
    }


    /* =====================================================
       REGIONAL LANGUAGE
       ===================================================== */

    function selectRegionalWords(
        options
    ) {

        const regional =
            getVocabulary(
                "regional"
            );


        if (!regional.length) {
            return [];
        }


        const influence =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        options.southernInfluence ||
                        0
                    )
                )
            );


        const appalachian =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        options.appalachianInfluence ||
                        0
                    )
                )
            );


        const selected = [];


        regional.forEach(
            item => {

                const southern =
                    getWeight(
                        item,
                        "southern",
                        0
                    );


                const app =
                    getWeight(
                        item,
                        "appalachian",
                        0
                    );


                const score =
                    (
                        southern *
                        influence
                    ) +
                    (
                        app *
                        appalachian
                    );


                const normalized =
                    score / 200;


                if (
                    Math.random() <
                    normalized
                ) {

                    selected.push(
                        item
                    );
                }
            }
        );


        return selected;
    }


    /* =====================================================
       STYLE
       ===================================================== */

    function selectStyle(
        options
    ) {

        const informality =
            Number(
                options.informality ||
                0
            );


        if (
            informality >= 80
        ) {

            return weightedChoice(
                [
                    "casual",
                    "conversational",
                    "rural",
                    "direct",
                    "folksy"
                ]
            );
        }


        if (
            informality >= 50
        ) {

            return weightedChoice(
                [
                    "neutral",
                    "conversational",
                    "casual"
                ]
            );
        }


        return weightedChoice(
            [
                "neutral",
                "direct",
                "polite"
            ]
        );
    }


    /* =====================================================
       TEMPLATE SELECTION
       ===================================================== */

    function selectTemplate(
        context,
        options
    ) {

        const templates =
            getTemplates();


        if (!templates.length) {
            return null;
        }


        const compatible =
            templates.filter(
                template =>
                    templateMatches(
                        template,
                        context,
                        options
                    )
            );


        if (!compatible.length) {

            return weightedChoice(
                templates
            );
        }


        return weightedChoice(
            compatible
        );
    }


    function getTemplates() {

        if (
            !state.templates
        ) {
            return [];
        }


        if (
            Array.isArray(
                state.templates
            )
        ) {

            return state.templates;
        }


        if (
            Array.isArray(
                state.templates.patterns
            )
        ) {

            return state.templates.patterns;
        }


        if (
            Array.isArray(
                state.templates.templates
            )
        ) {

            return state.templates.templates;
        }


        return [];
    }


    function templateMatches(
        template,
        context,
        options
    ) {

        if (!template) {
            return false;
        }


        if (
            template.category &&
            template.category !==
                options.category &&
            template.category !==
                "general"
        ) {

            return false;
        }


        if (
            Array.isArray(
                template.styles
            ) &&
            template.styles.length
        ) {

            if (
                !template.styles.includes(
                    context.style
                )
            ) {

                return false;
            }
        }


        return true;
    }


    /* =====================================================
       TEMPLATE RENDERING
       ===================================================== */

    function renderTemplate(
        template,
        context
    ) {

        if (!template) {
            return "";
        }


        let text =
            String(
                template
            );


        const replacements = {

            opening:
                getText(
                    context.opening
                ),

            action:
                getText(
                    context.action
                ),

            device:
                getText(
                    context.device
                ),

            location:
                getText(
                    context.location
                ),

            connector:
                getText(
                    context.connector
                ),

            modifier:
                getText(
                    context.modifier
                ),

            pronoun:
                getText(
                    context.pronoun
                ),

            question:
                getText(
                    context.question
                ),

            regional:
                selectRegionalText(
                    context.regional
                ),

            intent:
                getText(
                    context.intent
                )
        };


        Object.entries(
            replacements
        ).forEach(
            (
                [key, value]
            ) => {

                const pattern =
                    new RegExp(
                        `\\{${key}\\}`,
                        "gi"
                    );


                text =
                    text.replace(
                        pattern,
                        value || ""
                    );
            }
        );


        /*
         * Remove extra whitespace.
         */

        text =
            text.replace(
                /\s+/g,
                " "
            );


        return text.trim();
    }


    function selectRegionalText(
        words
    ) {

        if (
            !Array.isArray(words) ||
            !words.length
        ) {

            return "";
        }


        return weightedChoice(
            words
        );
    }


    function getText(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        if (
            typeof value ===
            "string"
        ) {

            return value;
        }


        if (
            typeof value ===
            "object"
        ) {

            return (
                value.text ||
                value.word ||
                value.value ||
                ""
            );
        }


        return String(
            value
        );
    }


    /* =====================================================
       REGIONAL STYLE
       ===================================================== */

    function applyRegionalStyle(
        text,
        options
    ) {

        if (!text) {
            return "";
        }


        const regional =
            selectRegionalWords(
                options
            );


        if (!regional.length) {
            return text;
        }


        /*
         * Do not blindly inject regional vocabulary into
         * every sentence. That would create an artificial
         * caricature instead of useful speech data.
         */

        const shouldAdd =
            Math.random() <
            (
                (
                    Number(
                        options.southernInfluence ||
                        0
                    ) +
                    Number(
                        options.appalachianInfluence ||
                        0
                    )
                ) / 400
            );


        if (!shouldAdd) {
            return text;
        }


        const regionalText =
            selectRegionalText(
                regional
            );


        if (!regionalText) {
            return text;
        }


        const placement =
            Math.random();


        if (
            placement < 0.33
        ) {

            return (
                `${getText(
                    regionalText
                )} ${text}`
            );
        }


        if (
            placement < 0.66
        ) {

            return (
                `${text}, ${getText(
                    regionalText
                )}`
            );
        }


        return (
            `${text} ${getText(
                regionalText
            )}`
        );
    }


    /* =====================================================
       PRONUNCIATION TARGETS
       ===================================================== */

    function findPronunciationTargets(
        text
    ) {

        const targets =
            [];


        const data =
            state.pronunciation;


        if (!data) {
            return targets;
        }


        const entries =
            Array.isArray(
                data.targets
            )
                ? data.targets
                : Array.isArray(
                    data.substitutions
                )
                    ? data.substitutions
                    : [];


        entries.forEach(
            item => {

                const target =
                    getText(
                        item
                    );


                if (!target) {
                    return;
                }


                const regex =
                    new RegExp(
                        escapeRegex(
                            target
                        ),
                        "i"
                    );


                if (
                    regex.test(
                        text
                    )
                ) {

                    targets.push(
                        item.id ||
                        item.target ||
                        target
                    );
                }
            }
        );


        return targets;
    }


    function escapeRegex(
        value
    ) {

        return String(
            value
        ).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
    }


    /* =====================================================
       FALLBACK
       ===================================================== */

    function generateFallback(
        options
    ) {

        const actions =
            getVocabulary(
                "actions"
            );


        const devices =
            getVocabulary(
                "devices"
            );


        const locations =
            getVocabulary(
                "locations"
            );


        if (
            !actions.length ||
            !devices.length
        ) {

            return {

                text:
                    "Turn on the light.",

                category:
                    options.category ||
                    "general",

                intent:
                    null,

                style:
                    "neutral",

                regionalInfluence:
                    [],

                pronunciationTargets:
                    [],

                template:
                    "fallback",

                generatedAt:
                    new Date().toISOString()
            };
        }


        const action =
            getText(
                weightedChoice(
                    actions
                )
            );


        const device =
            getText(
                weightedChoice(
                    devices
                )
            );


        const location =
            locations.length
                ? getText(
                    weightedChoice(
                        locations
                    )
                )
                : "";


        const text =
            cleanSentence(
                [
                    action,
                    device,
                    location
                ]
                    .filter(Boolean)
                    .join(" ")
            );


        return {

            text,

            category:
                options.category ||
                "general",

            intent:
                null,

            style:
                "neutral",

            regionalInfluence:
                [],

            pronunciationTargets:
                findPronunciationTargets(
                    text
                ),

            template:
                "fallback",

            generatedAt:
                new Date().toISOString()
        };
    }


    /* =====================================================
       ADD SELECTED TO DATASET
       ===================================================== */

    function addSelectedGeneratedToDataset() {

        if (
            !state.lastGenerated.length
        ) {

            setStatus(
                "Nothing has been generated yet."
            );

            return;
        }


        if (
            !window.Dataset
        ) {

            setStatus(
                "Dataset manager is not available."
            );

            return;
        }


        const checkboxes =
            document.querySelectorAll(
                ".generated-entry-select:checked"
            );


        if (!checkboxes.length) {

            setStatus(
                "Select at least one sentence."
            );

            return;
        }


        const selectedIndexes =
            Array.from(
                checkboxes
            )
                .map(
                    checkbox =>
                        Number(
                            checkbox.dataset.index
                        )
                )
                .filter(
                    index =>
                        Number.isInteger(index) &&
                        index >= 0 &&
                        index <
                            state.lastGenerated.length
                );


        if (!selectedIndexes.length) {

            setStatus(
                "No valid sentences selected."
            );

            return;
        }


        const selected =
            selectedIndexes.map(
                index =>
                    state.lastGenerated[
                        index
                    ]
            );


        const added =
            window.Dataset.addSentences(
                selected
            );


        const selectedSet =
            new Set(
                selectedIndexes
            );


        state.lastGenerated =
            state.lastGenerated.filter(
                (
                    sentence,
                    index
                ) =>
                    !selectedSet.has(
                        index
                    )
            );


        renderGenerated(
            state.lastGenerated
        );


        setStatus(
            `Added ${added.length} selected sentence${added.length === 1 ? "" : "s"} to the dataset.`
        );
    }


    /* =====================================================
       ADD ALL TO DATASET
       ===================================================== */

    function addAllGeneratedToDataset() {

        if (
            !state.lastGenerated.length
        ) {

            setStatus(
                "Nothing has been generated yet."
            );

            return;
        }


        if (
            !window.Dataset
        ) {

            setStatus(
                "Dataset manager is not available."
            );

            return;
        }


        const generated =
            [...state.lastGenerated];


        const added =
            window.Dataset.addSentences(
                generated
            );


        state.lastGenerated = [];


        renderGenerated(
            state.lastGenerated
        );


        setStatus(
            `Added ${added.length} sentences to the dataset.`
        );
    }


    /* =====================================================
       GENERATED LIST
       ===================================================== */

    function renderGenerated(
        sentences
    ) {

        const container =
            document.getElementById(
                "generated-list"
            );


        if (!container) {
            return;
        }


        container.innerHTML = "";


        if (
            !sentences.length
        ) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.className =
                "empty-state";


            empty.textContent =
                "No generated sentences.";


            container.appendChild(
                empty
            );


            return;
        }


        sentences.forEach(
            (
                sentence,
                index
            ) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "generated-entry";


                /* -----------------------------------------
                   Selection checkbox
                   ----------------------------------------- */

                const select =
                    document.createElement(
                        "input"
                    );


                select.type =
                    "checkbox";


                select.className =
                    "generated-entry-select";


                select.dataset.index =
                    index;


                select.setAttribute(
                    "aria-label",
                    `Select sentence ${index + 1}`
                );


                /* -----------------------------------------
                   Sentence number
                   ----------------------------------------- */

                const number =
                    document.createElement(
                        "span"
                    );


                number.className =
                    "generated-entry-number";


                number.textContent =
                    index + 1;


                /* -----------------------------------------
                   Sentence text
                   ----------------------------------------- */

                const text =
                    document.createElement(
                        "span"
                    );


                text.className =
                    "generated-entry-text";


                text.textContent =
                    sentence.text;


                /* -----------------------------------------
                   Metadata
                   ----------------------------------------- */

                const metadata =
                    document.createElement(
                        "span"
                    );


                metadata.className =
                    "generated-entry-metadata";


                metadata.textContent =
                    [
                        sentence.category,
                        sentence.intent,
                        sentence.style
                    ]
                        .filter(Boolean)
                        .join(
                            " • "
                        );


                /* -----------------------------------------
                   Build row
                   ----------------------------------------- */

                row.appendChild(
                    select
                );


                row.appendChild(
                    number
                );


                row.appendChild(
                    text
                );


                row.appendChild(
                    metadata
                );


                container.appendChild(
                    row
                );
            }
        );
    }


    /* =====================================================
       RANDOM CHOICE
       ===================================================== */

    function weightedChoice(
        values
    ) {

        if (
            !Array.isArray(values) ||
            !values.length
        ) {

            return "";
        }


        const weighted =
            values.map(
                value => ({

                    value,

                    weight:
                        Math.max(
                            0,
                            Number(
                                getWeight(
                                    value,
                                    "weight",
                                    1
                                )
                            )
                        )
                })
            );


        const total =
            weighted.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item.weight,
                0
            );


        if (
            total <= 0
        ) {

            return values[
                Math.floor(
                    Math.random() *
                    values.length
                )
            ];
        }


        let random =
            Math.random() *
            total;


        for (
            const item of weighted
        ) {

            random -=
                item.weight;


            if (
                random <= 0
            ) {

                return item.value;
            }
        }


        return values[
            values.length - 1
        ];
    }


    function getWeight(
        value,
        property,
        fallback
    ) {

        if (
            value &&
            typeof value ===
            "object" &&
            value[property] !==
                undefined
        ) {

            return Number(
                value[property]
            );
        }


        return fallback;
    }


    /* =====================================================
       TEXT CLEANUP
       ===================================================== */

    function cleanSentence(
        text
    ) {

        return String(
            text || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /\s+([,.!?])/g,
                "$1"
            )
            .trim()
            .replace(
                /^[a-z]/,
                character =>
                    character.toUpperCase()
            );
    }


    function normalizeForComparison(
        text
    ) {

        return cleanSentence(
            text
        )
            .toLowerCase()
            .replace(
                /[^\w\s]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            );
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


    function getNumber(
        id,
        fallback
    ) {

        const value =
            Number(
                getValue(id)
            );


        return Number.isFinite(
            value
        )
            ? value
            : fallback;
    }


    function setStatus(
        message
    ) {

        const element =
            document.getElementById(
                "generator-status"
            );


        if (element) {

            element.textContent =
                message;
        }
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        loadData,

        generate,

        generateOne,

        getState: () => ({
            ...state
        }),

        getLastGenerated: () =>
            state.lastGenerated

    };

})();


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await Generator.init();

    }
);