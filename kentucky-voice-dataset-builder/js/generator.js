/*
 * Kentucky Voice Dataset Builder
 * js/generator.js
 *
 * Generates varied smart-home utterances using:
 *
 * - templates
 * - vocabulary
 * - regional/Appalachian language
 * - smart-home intents
 * - weighted random selection
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
        predefined: [],

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
        state.predefined =
            await loadJson(
                "data/predefined.json",
                []
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

            if (
                data === null ||
                data === undefined
            ) {

                throw new Error(
                    "JSON file returned no data."
                );
            }

            return data;

        } catch (error) {

            console.warn(
                `Could not load ${path}. Using fallback data:`,
                error
            );

            return cloneValue(
                fallback
            );
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
            clamp(
                options.count,
                1,
                1000
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
                clamp(
                    getNumber(
                        "generator-southern",
                        50
                    ),
                    0,
                    100
                ),

            appalachianInfluence:
                clamp(
                    getNumber(
                        "generator-appalachian",
                        50
                    ),
                    0,
                    100
                ),

            informality:
                clamp(
                    getNumber(
                        "generator-informality",
                        70
                    ),
                    0,
                    100
                )
        };
    }


    function normalizeOptions(
        options = {}
    ) {

        return {

            category:
                String(
                    options.category ||
                    "general"
                ),

            count:
                clamp(
                    Number(
                        options.count
                    ) || 1,
                    1,
                    1000
                ),

            southernInfluence:
                clamp(
                    Number(
                        options.southernInfluence
                    ) || 0,
                    0,
                    100
                ),

            appalachianInfluence:
                clamp(
                    Number(
                        options.appalachianInfluence
                    ) || 0,
                    0,
                    100
                ),

            informality:
                clamp(
                    Number(
                        options.informality
                    ) || 0,
                    0,
                    100
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

        const safeOptions =
            normalizeOptions(
                options
            );

        const safeCount =
            clamp(
                Number(count) || 1,
                1,
                1000
            );
    if (
        safeOptions.category ===
        "predefined"
    ) {
        const predefined =
            generatePredefined(
                safeCount
            );

        state.generationCount +=
            predefined.length;

        return predefined;
    }
        

        const results = [];
        const usedTexts = new Set();

        let attempts = 0;

        /*
         * Allow enough attempts for heavily constrained
         * datasets, but never allow an accidental infinite
         * loop when the source data contains only a few
         * unique sentences.
         */

        const maximumAttempts =
            Math.max(
                safeCount * 30,
                100
            );

        while (
            results.length <
                safeCount &&
            attempts <
                maximumAttempts
        ) {

            attempts++;

            const result =
                generateOne(
                    safeOptions
                );

            if (!result) {
                continue;
            }

            const normalized =
                normalizeForComparison(
                    result.text
                );

            if (!normalized) {
                continue;
            }

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
   GENERATE PREDEFINED
   ===================================================== */

function generatePredefined(
    count
) {
    const sentences =
        Array.isArray(state.predefined)
            ? state.predefined
                .map(item =>
                    typeof item === "string"
                        ? item.trim()
                        : ""
                )
                .filter(Boolean)
            : [];

    if (!sentences.length) {
        return [];
    }

    /*
     * Shuffle the predefined sentence pool.
     *
     * This gives us random ordering while preventing
     * duplicate sentences during a generation batch.
     */
    const shuffled = [...sentences];

    for (
        let index = shuffled.length - 1;
        index > 0;
        index--
    ) {
        const randomIndex =
            Math.floor(
                Math.random() * (index + 1)
            );

        [
            shuffled[index],
            shuffled[randomIndex]
        ] = [
            shuffled[randomIndex],
            shuffled[index]
        ];
    }

    const selected =
        shuffled.slice(
            0,
            Math.min(
                Number(count) || 1,
                shuffled.length
            )
        );

    return selected.map(
        text => ({
            text:
                cleanSentence(text),

            category:
                "predefined",

            intent:
                null,

            style:
                "predefined",

            regionalInfluence:
                [],

            pronunciationTargets:
                findPronunciationTargets(
                    text
                ),

            template:
                "predefined",

            generated:
                true,

            generatedAt:
                new Date().toISOString()
        })
    );
}


/* =====================================================
   GENERATE ONE
   ===================================================== */

function generateOne(
    options = {}
) {

    const safeOptions =
        normalizeOptions(
            options
        );

    const intent =
        selectIntent(
            safeOptions.category
        );

    if (!intent) {

        return generateFallback(
            safeOptions
        );
    }

    const context =
        buildContext(
            intent,
            safeOptions
        );

    const template =
        selectTemplate(
            context,
            safeOptions
        );

    if (!template) {

        return generateFallback(
            safeOptions
        );
    }

    let templateText = "";

    if (
        typeof template ===
        "string"
    ) {

        templateText =
            template;

    } else if (
        template &&
        typeof template ===
            "object"
    ) {

        templateText =
            template.pattern ||
            template.text ||
            "";
    }

    let text =
        renderTemplate(
            templateText,
            context
        );

    text =
        cleanSentence(
            text
        );

    if (!text) {
        return null;
    }

    /*
     * Apply regional phrasing after the primary
     * sentence has been constructed.
     *
     * This is intentionally probabilistic. A dataset
     * full of exaggerated regional phrases is less
     * useful than natural variation.
     */

    text =
        applyRegionalStyle(
            text,
            safeOptions
        );

    text =
        cleanSentence(
            text
        );

    const templateId =
        typeof template === "object" &&
        template
            ? (
                template.id ||
                template.name ||
                null
            )
            : null;

    return {

        text,

        category:
            safeOptions.category !==
                "general"
                ? safeOptions.category
                : (
                    intent.category ||
                    "general"
                ),

        intent:
            intent.id ||
            intent.intent ||
            null,

        style:
            context.style ||
            "neutral",

        regionalInfluence:
            Array.isArray(
                context.regionalInfluence
            )
                ? context.regionalInfluence
                : [],

        pronunciationTargets:
            findPronunciationTargets(
                text
            ),

        template:
            templateId,

        generated:
            true,

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
                        getText(
                            item.id ||
                            item.word ||
                            item
                        )
                ).filter(Boolean)
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

        const requestedCategory =
            String(
                category ||
                "general"
            );

        if (
            requestedCategory !==
            "general"
        ) {

            const categoryMatches =
                intents.filter(
                    intent => {

                        if (
                            !intent ||
                            typeof intent !==
                                "object"
                        ) {
                            return false;
                        }

                        return (
                            String(
                                intent.category ||
                                ""
                            ).toLowerCase() ===
                            requestedCategory.toLowerCase()
                        ) ||
                        String(
                            intent.id ||
                            intent.intent ||
                            ""
                        ).toLowerCase() ===
                        requestedCategory.toLowerCase();
                    }
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

        return data.intents.filter(
            Boolean
        );
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

        if (
            devices.length
        ) {

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

        if (
            locations.length
        ) {

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
        options = {}
    ) {

        const openings =
            getVocabulary(
                "openings"
            );

        if (
            !openings.length
        ) {
            return "";
        }

        const informality =
            clamp(
                Number(
                    options.informality
                ) || 0,
                0,
                100
            );

        /*
         * Items whose informality is close to the
         * requested setting are favored. The previous
         * implementation effectively used a random 50/100
         * gate, making the slider much less meaningful.
         */

        const weighted =
            openings.map(
                item => {

                    const itemInformality =
                        clamp(
                            getWeight(
                                item,
                                "informality",
                                50
                            ),
                            0,
                            100
                        );

                    const distance =
                        Math.abs(
                            informality -
                            itemInformality
                        );

                    const matchWeight =
                        Math.max(
                            1,
                            101 -
                            distance
                        );

                    const baseWeight =
                        Math.max(
                            0,
                            getWeight(
                                item,
                                "weight",
                                1
                            )
                        );

                    return {

                        value:
                            item,

                        weight:
                            baseWeight *
                            matchWeight
                    };
                }
            );

        return weightedChoice(
            weighted.map(
                item => ({
                    ...item.value &&
                        typeof item.value ===
                            "object"
                        ? item.value
                        : {
                            value:
                                item.value
                        },

                    weight:
                        item.weight,

                    __generatorValue:
                        item.value
                })
            ),
            "__generatorValue"
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

        if (
            !values.length
        ) {
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

        return data[category].filter(
            value =>
                value !== null &&
                value !== undefined
        );
    }


    /* =====================================================
       REGIONAL LANGUAGE
       ===================================================== */

    function selectRegionalWords(
        options = {}
    ) {

        const regional =
            getVocabulary(
                "regional"
            );

        if (
            !regional.length
        ) {
            return [];
        }

        const influence =
            clamp(
                Number(
                    options.southernInfluence
                ) || 0,
                0,
                100
            );

        const appalachian =
            clamp(
                Number(
                    options.appalachianInfluence
                ) || 0,
                0,
                100
            );

        const selected = [];

        regional.forEach(
            item => {

                const southern =
                    clamp(
                        getWeight(
                            item,
                            "southern",
                            0
                        ),
                        0,
                        100
                    );

                const app =
                    clamp(
                        getWeight(
                            item,
                            "appalachian",
                            0
                        ),
                        0,
                        100
                    );

                /*
                 * Each influence value is 0-100.
                 * The resulting probability is also clamped
                 * to 0-1 so malformed JSON cannot cause every
                 * regional item to be selected.
                 */

                const probability =
                    clamp(
                        (
                            (
                                southern *
                                influence
                            ) +
                            (
                                app *
                                appalachian
                            )
                        ) / 20000,
                        0,
                        1
                    );

                if (
                    Math.random() <
                    probability
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
        options = {}
    ) {

        const informality =
            clamp(
                Number(
                    options.informality
                ) || 0,
                0,
                100
            );

        if (
            informality >= 80
        ) {

            return weightedChoice(
                [
                    {
                        value:
                            "casual",
                        weight:
                            3
                    },
                    {
                        value:
                            "conversational",
                        weight:
                            3
                    },
                    {
                        value:
                            "rural",
                        weight:
                            2
                    },
                    {
                        value:
                            "direct",
                        weight:
                            2
                    },
                    {
                        value:
                            "folksy",
                        weight:
                            1
                    }
                ],
                "value"
            );
        }

        if (
            informality >= 50
        ) {

            return weightedChoice(
                [
                    {
                        value:
                            "neutral",
                        weight:
                            3
                    },
                    {
                        value:
                            "conversational",
                        weight:
                            3
                    },
                    {
                        value:
                            "casual",
                        weight:
                            2
                    }
                ],
                "value"
            );
        }

        return weightedChoice(
            [
                {
                    value:
                        "neutral",
                    weight:
                        4
                },
                {
                    value:
                        "direct",
                    weight:
                        3
                },
                {
                    value:
                        "polite",
                    weight:
                        2
                }
            ],
            "value"
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

        if (
            !templates.length
        ) {
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

        if (
            !compatible.length
        ) {

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

            return state.templates.filter(
                Boolean
            );
        }

        if (
            Array.isArray(
                state.templates.patterns
            )
        ) {

            return state.templates.patterns.filter(
                Boolean
            );
        }

        if (
            Array.isArray(
                state.templates.templates
            )
        ) {

            return state.templates.templates.filter(
                Boolean
            );
        }

        return [];
    }


    function templateMatches(
        template,
        context,
        options
    ) {

        if (
            !template
        ) {
            return false;
        }

        if (
            typeof template ===
            "string"
        ) {

            return true;
        }

        if (
            typeof template !==
                "object"
        ) {

            return false;
        }

        if (
            template.category
        ) {

            const templateCategory =
                String(
                    template.category
                ).toLowerCase();

            const requestedCategory =
                String(
                    options.category ||
                    "general"
                ).toLowerCase();

            const intentCategory =
                String(
                    context.intentCategory ||
                    ""
                ).toLowerCase();

            if (
                templateCategory !==
                    "general" &&
                templateCategory !==
                    requestedCategory &&
                templateCategory !==
                    intentCategory
            ) {

                return false;
            }
        }

        if (
            Array.isArray(
                template.styles
            ) &&
            template.styles.length
        ) {

            const styles =
                template.styles.map(
                    style =>
                        String(
                            style
                        ).toLowerCase()
                );

            if (
                !styles.includes(
                    String(
                        context.style
                    ).toLowerCase()
                )
            ) {

                return false;
            }
        }

        /*
         * Support templates that explicitly specify an
         * intent or list of intents.
         */

        if (
            template.intent
        ) {

            const requestedIntent =
                String(
                    context.intent ||
                    ""
                ).toLowerCase();

            const templateIntent =
                String(
                    template.intent
                ).toLowerCase();

            if (
                requestedIntent !==
                templateIntent
            ) {

                return false;
            }
        }

        if (
            Array.isArray(
                template.intents
            ) &&
            template.intents.length
        ) {

            const requestedIntent =
                String(
                    context.intent ||
                    ""
                ).toLowerCase();

            const allowedIntents =
                template.intents.map(
                    intent =>
                        String(
                            intent
                        ).toLowerCase()
                );

            if (
                !allowedIntents.includes(
                    requestedIntent
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

        if (
            !template
        ) {
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
                        `\\{${escapeRegex(key)}\\}`,
                        "gi"
                    );

                text =
                    text.replace(
                        pattern,
                        () =>
                            value ||
                            ""
                    );
            }
        );

        /*
         * Remove unresolved template placeholders rather
         * than leaving things such as "{foo}" in the
         * training dataset.
         */

        text =
            text.replace(
                /\{[a-zA-Z0-9_-]+\}/g,
                ""
            );

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

        return getText(
            weightedChoice(
                words
            )
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
            "number" ||
            typeof value ===
            "boolean"
        ) {

            return String(
                value
            );
        }

        if (
            typeof value ===
            "object"
        ) {

            return String(
                value.text ??
                value.word ??
                value.value ??
                value.name ??
                ""
            );
        }

        return "";
    }


    /* =====================================================
       REGIONAL STYLE
       ===================================================== */

    function applyRegionalStyle(
        text,
        options
    ) {

        if (
            !text
        ) {
            return "";
        }

        const southern =
            clamp(
                Number(
                    options.southernInfluence
                ) || 0,
                0,
                100
            );

        const appalachian =
            clamp(
                Number(
                    options.appalachianInfluence
                ) || 0,
                0,
                100
            );

        if (
            southern === 0 &&
            appalachian === 0
        ) {

            return text;
        }

        const regional =
            selectRegionalWords(
                options
            );

        if (
            !regional.length
        ) {

            return text;
        }

        /*
         * Regional words are selected above according to
         * their own weights. This second probability controls
         * whether one of those words is actually inserted.
         */

        const averageInfluence =
            (
                southern +
                appalachian
            ) / 2;

        const insertionProbability =
            clamp(
                averageInfluence /
                250,
                0,
                0.40
            );

        if (
            Math.random() >=
            insertionProbability
        ) {

            return text;
        }

        const regionalText =
            selectRegionalText(
                regional
            );

        if (
            !regionalText
        ) {

            return text;
        }

        /*
         * Avoid inserting a phrase that is already present.
         */

        if (
            normalizeForComparison(
                text
            ).includes(
                normalizeForComparison(
                    regionalText
                )
            )
        ) {

            return text;
        }

        const placement =
            Math.random();

        if (
            placement < 0.33
        ) {

            return cleanSentence(
                `${regionalText} ${text}`
            );
        }

        if (
            placement < 0.66
        ) {

            return cleanSentence(
                `${text}, ${regionalText}`
            );
        }

        return cleanSentence(
            `${text} ${regionalText}`
        );
    }


    /* =====================================================
       PRONUNCIATION TARGETS
       ===================================================== */

    function findPronunciationTargets(
        text
    ) {

        const targets = [];

        const data =
            state.pronunciation;

        if (
            !data
        ) {
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
                    getPronunciationTarget(
                        item
                    );

                if (
                    !target
                ) {
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

                    const id =
                        item &&
                        typeof item ===
                            "object"
                            ? (
                                item.id ||
                                item.target ||
                                item.word ||
                                target
                            )
                            : target;

                    if (
                        !targets.includes(
                            id
                        )
                    ) {

                        targets.push(
                            id
                        );
                    }
                }
            }
        );

        return targets;
    }


    function getPronunciationTarget(
        item
    ) {

        if (
            typeof item ===
            "string"
        ) {

            return item.trim();
        }

        if (
            !item ||
            typeof item !==
                "object"
        ) {

            return "";
        }

        return String(
            item.target ??
            item.word ??
            item.text ??
            item.value ??
            ""
        ).trim();
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
        options = {}
    ) {

        const safeOptions =
            normalizeOptions(
                options
            );

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

            const fallbackText =
                "Turn on the light.";

            return {

                text:
                    fallbackText,

                category:
                    safeOptions.category,

                intent:
                    null,

                style:
                    "neutral",

                regionalInfluence:
                    [],

                pronunciationTargets:
                    findPronunciationTargets(
                        fallbackText
                    ),

                template:
                    "fallback",

                generated:
                    true,

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
                safeOptions.category,

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

            generated:
                true,

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

        if (
            typeof window.Dataset.addSentences !==
                "function"
        ) {

            setStatus(
                "Dataset manager cannot add generated sentences."
            );

            return;
        }

        const checkboxes =
            document.querySelectorAll(
                ".generated-entry-select:checked"
            );

        if (
            !checkboxes.length
        ) {

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
                        Number.isInteger(
                            index
                        ) &&
                        index >= 0 &&
                        index <
                            state.lastGenerated.length
                );

        if (
            !selectedIndexes.length
        ) {

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

        let added = [];

        try {

            const result =
                window.Dataset.addSentences(
                    selected
                );

            if (
                Array.isArray(
                    result
                )
            ) {

                added =
                    result;

            } else if (
                Number.isFinite(
                    Number(result)
                )
            ) {

                added =
                    selected.slice(
                        0,
                        Number(result)
                    );

            } else {

                /*
                 * Dataset.addSentences() may perform the
                 * insertion without returning an array.
                 * Assume the selected entries were accepted
                 * rather than crashing on added.length.
                 */

                added =
                    selected;
            }

        } catch (error) {

            console.error(
                "Failed to add generated sentences:",
                error
            );

            setStatus(
                `Could not add sentences: ${error.message}`
            );

            return;
        }

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

        if (
            typeof window.Dataset.addSentences !==
                "function"
        ) {

            setStatus(
                "Dataset manager cannot add generated sentences."
            );

            return;
        }

        const generated =
            [...state.lastGenerated];

        let added = [];

        try {

            const result =
                window.Dataset.addSentences(
                    generated
                );

            if (
                Array.isArray(
                    result
                )
            ) {

                added =
                    result;

            } else if (
                Number.isFinite(
                    Number(result)
                )
            ) {

                added =
                    generated.slice(
                        0,
                        Number(result)
                    );

            } else {

                added =
                    generated;
            }

        } catch (error) {

            console.error(
                "Failed to add generated sentences:",
                error
            );

            setStatus(
                `Could not add sentences: ${error.message}`
            );

            return;
        }

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

        if (
            !container
        ) {
            return;
        }

        container.innerHTML = "";

        if (
            !Array.isArray(
                sentences
            ) ||
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
                    "generated-sentence";

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

                const number =
                    document.createElement(
                        "span"
                    );

                number.className =
                    "generated-entry-number";

                number.textContent =
                    `${index + 1}:`;

                const text =
                    document.createElement(
                        "span"
                    );

                text.className =
                    "generated-entry-text";

                text.textContent =
                    getText(
                        sentence &&
                        sentence.text
                    );

                row.appendChild(
                    select
                );

                row.appendChild(
                    number
                );

                row.appendChild(
                    text
                );

                row.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            select
                        ) {

                            row.classList.toggle(
                                "selected",
                                select.checked
                            );

                            return;
                        }

                        select.checked =
                            !select.checked;

                        row.classList.toggle(
                            "selected",
                            select.checked
                        );
                    }
                );

                select.addEventListener(
                    "change",
                    () => {

                        row.classList.toggle(
                            "selected",
                            select.checked
                        );
                    }
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

    /*
     * Supports both:
     *
     * weightedChoice(array)
     *
     * and:
     *
     * weightedChoice(array, "value")
     *
     * The second form is useful for arrays where the actual
     * selectable value is stored inside an object.
     */

    function weightedChoice(
        values,
        valueProperty = null
    ) {

        if (
            !Array.isArray(
                values
            ) ||
            !values.length
        ) {

            return "";
        }

        const weighted =
            values.map(
                value => {

                    let weight =
                        getWeight(
                            value,
                            "weight",
                            1
                        );

                    if (
                        !Number.isFinite(
                            weight
                        ) ||
                        weight < 0
                    ) {

                        weight = 0;
                    }

                    return {

                        value,

                        weight
                    };
                }
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

        let selected;

        if (
            total <= 0
        ) {

            selected =
                values[
                    Math.floor(
                        Math.random() *
                        values.length
                    )
                ];

        } else {

            let random =
                Math.random() *
                total;

            selected =
                weighted[
                    weighted.length - 1
                ].value;

            for (
                const item of weighted
            ) {

                random -=
                    item.weight;

                if (
                    random <= 0
                ) {

                    selected =
                        item.value;

                    break;
                }
            }
        }

        if (
            valueProperty
        ) {

            if (
                selected &&
                typeof selected ===
                    "object"
            ) {

                return selected[
                    valueProperty
                ];
            }

            return selected;
        }

        return selected;
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

            const number =
                Number(
                    value[property]
                );

            return Number.isFinite(
                number
            )
                ? number
                : fallback;
        }

        return fallback;
    }


    /* =====================================================
       TEXT CLEANUP
       ===================================================== */

    function cleanSentence(
        text
    ) {

        let result =
            String(
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
                .replace(
                    /([,.!?])([A-Za-z])/g,
                    "$1 $2"
                )
                .trim();

        if (
            !result
        ) {
            return "";
        }

        /*
         * Capitalize only the first character. Do not alter
         * the remainder because contractions, proper names,
         * and intentionally styled vocabulary may matter.
         */

        result =
            result.replace(
                /^[a-z]/,
                character =>
                    character.toUpperCase()
            );

        return result;
    }


    function normalizeForComparison(
        text
    ) {

        return cleanSentence(
            text
        )
            .toLowerCase()
            .replace(
                /[^\p{L}\p{N}\s]/gu,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
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
                getValue(
                    id
                )
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

        if (
            element
        ) {

            element.textContent =
                message;
        }
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
            Number(
                value
            );

        if (
            !Number.isFinite(
                number
            )
        ) {

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


    function cloneValue(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return value;
        }

        if (
            typeof structuredClone ===
                "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch (
                error
            ) {

                console.warn(
                    "structuredClone failed while copying fallback data:",
                    error
                );
            }
        }

        try {

            return JSON.parse(
                JSON.stringify(
                    value
                )
            );

        } catch (
            error
        ) {

            return value;
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
            ...state,

            lastGenerated:
                Array.isArray(
                    state.lastGenerated
                )
                    ? [
                        ...state.lastGenerated
                    ]
                    : []
        }),

        getLastGenerated: () =>
            Array.isArray(
                state.lastGenerated
            )
                ? [
                    ...state.lastGenerated
                ]
                : []
    };

})();


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await Generator.init();

        } catch (
            error
        ) {

            console.error(
                "Generator initialization failed:",
                error
            );
        }
    }
);
