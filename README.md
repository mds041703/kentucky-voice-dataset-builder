# Kentucky Voice Dataset Builder

> **Vibe coded with AI.**

This project was built primarily with substantial assistance from generative AI. The code, data structures, sentence-generation logic, examples, and documentation have all been influenced by AI-generated material.

It has **not** been professionally engineered, formally audited, or extensively tested.

If you want to take this idea, rebuild it properly, improve it, or turn it into something actually useful, you are more than welcome to do so.

A browser-based voice dataset builder for creating speech datasets for Whisper and other speech-recognition systems.

The project was made specifically for collecting natural smart-home commands spoken in the user's normal Kentucky, Appalachian, Southern, and general American speech patterns.

The original goal was to make it easier to build a personalized speech dataset for smart-home voice control, particularly for Home Assistant.

---

## What This Is

This is a browser application that combines:

* JSON vocabulary
* Sentence templates
* Smart-home intents
* Weighted random selection
* Regional vocabulary
* Pronunciation targets
* Browser-based audio recording
* Dataset management
* Dataset searching and filtering
* Recording replacement and re-recording
* ZIP import and export
* Whisper-compatible `metadata.csv` generation
* Dataset configuration and manifest storage

It does **not** use a local AI model to generate or validate sentences.

The sentence generator is rule-based.

That makes it lightweight and capable of running locally, but it also means the generator can produce questionable sentences because, tragically, combining grammatically valid pieces does not guarantee that the resulting sentence makes sense.

---

# Running the Application

This application **must be run through a local web server**.

Do **not** open `index.html` directly with `file://`.

The application uses browser features that may not work correctly when the page is opened directly from the filesystem.

You do not need an Internet connection to run the application, but you do need a local web server.

Python 3 is the easiest option because it is available on Linux and macOS and can also be installed on Windows.

## Linux

Open a terminal, change to the project directory, and run:

```bash
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## macOS

Open Terminal, change to the project directory, and run:

```bash
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also type `cd ` in Terminal and drag the project folder into the Terminal window to insert its path automatically.

## Windows

Open Command Prompt or PowerShell, change to the project directory, and run:

```powershell
cd C:\path\to\kentucky-voice-dataset-builder
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If `py` is not available but Python is installed, try:

```powershell
python -m http.server 8000
```

## Stopping the Server

When finished, return to the terminal window running the server and press:

```text
Ctrl+C
```

This stops the local web server.

### Important

The local server does **not** connect the application to the Internet.

It only provides the HTTP server functionality required for the browser to run the application correctly.

The application itself is designed to operate locally.

You can disconnect from the Internet after the application files and required dependencies have been downloaded.

Remember: the local server is required **every time you want to use the application**.

---

# Important Warning: Save Your Work

**Export your dataset frequently.**

The application's browser storage should **not** be trusted as the only copy of your recordings.

Depending on the browser and the state of the application, refreshing the page can result in data being lost.

There is currently no guarantee that an in-progress dataset will survive:

* Page refreshes
* Browser crashes
* Closing the browser
* Clearing browser data
* Storage cleanup
* Browser storage limitations
* Application changes

The safest workflow is:

```text
Generate
   ↓
Record
   ↓
Export ZIP
   ↓
Record more
   ↓
Export ZIP again
```

The **ZIP export and import functionality should be treated as the actual backup mechanism**.

Do not build a large dataset in the browser and assume the browser will politely remember everything. Browsers have never shown much loyalty to human plans.

If you have recordings you care about, export them.

---

# Features

* Generate smart-home sentences
* Generate multiple variations of the same intent
* Use different sentence structures
* Generate direct commands
* Generate conversational requests
* Generate noun-first commands
* Generate indirect requests
* Generate pronoun/reference-based commands
* Include Southern and Appalachian-influenced vocabulary
* Track pronunciation targets
* Record speech directly from the browser
* Automatically move to the next sentence after recording
* Skip sentences
* Review recorded and pending sentences
* Search and filter dataset entries
* Track dataset statistics
* Add custom sentences
* Re-record existing dataset entries
* Replace an existing recording while keeping its transcript
* Import an existing dataset
* Import simple user-created datasets
* Import ZIPs with an additional top-level folder
* Continue adding recordings to an existing dataset
* Export the dataset as a ZIP file
* Store audio recordings with transcripts
* Store configuration inside exported datasets
* Restore configuration when importing
* Generate configurable Whisper-style metadata
* Generate a `metadata.csv` beginning with `audio,text`
* Select audio format and sample rate
* Run locally without requiring an Internet connection

---

# Dataset Tab

The Dataset tab is used to review and manage recordings that have already been added to the dataset.

It allows the user to inspect the generated sentence, transcript, recording status, and other dataset information.

One important function is **re-recording**.

## Re-recording an Existing Entry

If a recording is poor, contains background noise, was spoken incorrectly, or simply needs to be replaced, the existing dataset entry can be re-recorded from the Dataset tab.

The intended workflow is:

```text
Dataset Tab
    ↓
Find existing recording
    ↓
Select re-record
    ↓
Record replacement audio
    ↓
Save replacement
```

The transcript associated with the dataset entry remains the intended transcript unless the user explicitly changes it.

This is important for training datasets.

If the displayed transcript says:

```text
Turn on the living room lights.
```

and the speaker records it incorrectly, the application should not silently change the transcript to whatever a speech-recognition system thinks was spoken.

The recording should either be re-recorded or discarded.

The transcript represents what the speaker was **supposed to say**, not what an automatic speech recognizer guessed they said.

---

# Known Limitations

The generator is **not an AI language model**.

It uses predefined templates and vocabulary to construct sentences.

This works reasonably well for many normal commands, but it can also produce sentences that are:

* Awkward
* Unnatural
* Semantically questionable
* Ambiguous
* Grammatically strange
* Technically grammatical but unlikely to be spoken
* Completely wrong combinations of devices and locations

For example, it may generate:

```text
Turn on the kitchen light in the bedroom.

Turn off the bedroom fan in the basement.

Brighten the blinds in the hallway.

Close the television.

Put the bedroom lights in the dining room.

Power on the kitchen fan in the bathroom.
```

Some of these could make sense in a particular context.

Some clearly do not.

This is a limitation of the rule-based generation system.

There is no semantic AI layer checking every generated sentence.

---

# Why Some Weird Sentences Are Useful

The purpose of this project is to collect speech from an actual person.

Real speech is not perfectly grammatical.

People use:

* Pronouns
* References
* Reordered words
* Incomplete commands
* Informal grammar
* Regional vocabulary
* Connected speech
* Indirect requests
* Context-dependent phrases
* Unusual wording
* Corrections
* Filler words
* Different ways of expressing the same request

Examples:

```text
Turn them living room lights on.

It's pretty dark in here.

Go ahead and cut them lights on.

Turn that one on.

The lights in here, get them on.

It's fucking dark in the living room, how about you turn on the lights in here.
```

These can be useful training examples.

The problem is that the generator does not always know the difference between a naturally odd human sentence and an accidentally bad sentence.

That distinction currently has to be handled by the person using the application.

---

# AI / Vibe Coding Disclosure

This project is intentionally labeled as **vibe coded**.

A substantial amount of the software was produced or modified with generative AI assistance.

AI was used for things including:

* JavaScript
* HTML
* CSS
* JSON structures
* Sentence-generation logic
* Smart-home intent design
* Dataset design
* Debugging
* Documentation
* Example sentences
* Architecture suggestions

The resulting code has not been professionally reviewed.

It may contain:

* Bugs
* Inefficient code
* Poor design decisions
* Inconsistent data structures
* Security issues
* Browser compatibility problems
* Incorrect assumptions
* Features that appear to work but have edge cases

The same applies to the linguistic data.

The regional vocabulary should **not** be treated as authoritative research on Kentucky, Appalachian, or Southern English.

It was created as practical vocabulary for this particular project.

If somebody wants to take the basic concept and build a properly engineered version, improve the generator, add a local language model, build better validation, or turn it into a real dataset platform, that is encouraged.

---

# Project Structure

```text
kentucky-voice-dataset-builder/
│
├── index.html
│
├── css/
│   └── app.css
│
├── js/
│   ├── app.js
│   ├── recorder.js
│   ├── dataset.js
│   ├── generator.js
│   ├── audio.js
│   ├── export.js
│   └── storage.js
│
├── data/
│   ├── templates.json
│   ├── vocabulary.json
│   ├── pronunciation.json
│   └── smart-home.json
│
└── README.md
```

---

# How It Works

## Generator

`js/generator.js`

The generator creates sentences using JSON files in the `data/` directory.

It combines things such as:

* Sentence templates
* Openings
* Actions
* Devices
* Locations
* Connectors
* Pronouns
* Modifiers
* Questions
* Regional vocabulary
* Smart-home intents
* Pronunciation targets

Weighted random selection allows common phrases to occur more frequently than uncommon phrases.

The generator also attempts to prevent duplicate sentences within a generation batch.

It does not understand language in the way a large language model does.

---

# Templates

`data/templates.json`

Templates define sentence structures.

Examples:

```text
{opening} {action} {device}

{opening} {action} {device} {location}

{question} {action} {device}

{opening} {device} {modifier}

{opening} it's {modifier} {location}

{opening} {device} is {modifier}

{regional} {action} {device}
```

The goal is to create different ways of expressing the same intent rather than generating thousands of nearly identical commands.

---

# Vocabulary

`data/vocabulary.json`

Contains reusable vocabulary for:

* Openings
* Actions
* Devices
* Locations
* Connectors
* Pronouns
* Modifiers
* Questions
* Regional language

Examples include:

```text
over yonder
back yonder
out back
up front
right here
right there
in here
in there
this here
that there
them lights
I reckon
y'all
```

Regional vocabulary is intended to occur naturally.

The project is not intended to create an exaggerated or stereotypical Appalachian accent.

---

# Pronunciation Targets

`data/pronunciation.json`

Contains words and phrases useful for monitoring pronunciation.

Examples:

```text
light
lights
right
night
there
here
air
door
porch
house
out
about
down
home
y'all
yonder
reckon
folks
```

The project does not intentionally misspell words to represent an accent.

For example, a transcript should normally contain:

```text
going to
```

rather than:

```text
gonna
```

if `going to` is the intended transcript.

The speaker should simply pronounce the words naturally.

---

# Smart-Home Intents

`data/smart-home.json`

Defines smart-home commands that the generator can produce.

Current categories include:

* Lighting
* Climate
* Media
* Security
* Covers
* Power

Examples:

```text
light_on
light_off
light_dim
light_brighten
light_brightness_set
light_color

fan_on
fan_off

thermostat_set_temperature

heat_on
heat_off

ac_on
ac_off

tv_on
tv_off

door_lock
door_unlock

garage_open
garage_close

blinds_open
blinds_close

outlet_on
outlet_off
```

The intent system was designed around smart-home control rather than arbitrary speech.

---

# Device and Location Problems

One of the generator's biggest weaknesses is that it can combine device names and locations in ways that do not make much sense.

For example:

```text
bedroom fan
```

may already contain a location, but the generator can still add:

```text
in the basement
```

resulting in:

```text
Turn off the bedroom fan in the basement.
```

This is a consequence of the simple rule-based system.

A better implementation would separate:

* Device type
* Device name
* Device location
* Device aliases

and understand the relationship between them.

That is one of the areas where a future implementation could substantially improve on this project.

---

# Recording

`js/recorder.js`

The intended recording workflow is:

1. Display a sentence.
2. Wait for the user to start.
3. Give a countdown.
4. Start recording.
5. Detect when the user has stopped speaking.
6. Stop the recording.
7. Save the audio.
8. Mark the sentence as recorded.
9. Move to the next pending sentence.

Manual recording controls are also useful when automatic silence detection does not behave correctly.

The application should not automatically change the transcript based on what the recording sounds like.

The displayed sentence is the intended transcript.

If the recording contains a mistake, the recording should be discarded or re-recorded rather than silently changing the transcript.

---

# Audio

`js/audio.js`

Handles audio-related functions such as:

* Audio format handling
* Audio duration
* Audio playback
* Audio conversion where supported
* Audio metadata
* Audio validation

The application's exported dataset uses WAV audio by default.

The preferred dataset audio specification is:

```text
Format: WAV
Codec: PCM
Channels: Mono
Sample rate: 16000 Hz
Bit depth: 16-bit
```

This corresponds to:

```text
16 kHz
16-bit
mono
PCM WAV
```

This is a practical format for Whisper-style speech datasets.

Individual training systems may impose additional requirements, so the target training pipeline should always be checked before training.

The important part is that the audio should be clean, intelligible speech with the transcript matching what was intentionally spoken.

---

# Dataset Management

`js/dataset.js`

Maintains dataset entries.

Entries can contain information such as:

```text
ID
Transcript
Category
Intent
Style
Regional influence
Pronunciation targets
Template
Status
Recording
Creation time
Modification time
```

Possible statuses include:

```text
pending
recorded
skipped
```

The Dataset tab can also be used to replace an existing recording through the re-record function.

This allows poor recordings to be corrected without having to delete and regenerate the associated sentence.

---

# Storage

`js/storage.js`

The application uses browser storage for the working dataset.

IndexedDB is more appropriate than Local Storage for audio because recordings can be much larger than normal text data.

However, the current implementation should **not** be considered reliable permanent storage.

A page refresh may result in loss of the current working dataset.

Browser storage behavior can also be affected by:

* Browser settings
* Storage quotas
* Clearing site data
* Private browsing
* Browser crashes
* Application changes
* Browser compatibility

For that reason:

**Export your dataset frequently.**

The ZIP export is the important backup mechanism.

---

# Import and Export

`js/export.js`

The application can export the dataset as a ZIP archive.

The normal exported structure is:

```text
kentucky-voice-dataset-YYYYMMDD-HHMMSS.zip
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   ├── 000003.wav
│   └── ...
│
├── metadata.csv
├── config.json
├── manifest.json
└── README.txt
```

The exact ZIP filename may vary.

The important dataset files are:

```text
audio/
metadata.csv
```

The other files contain additional application information.

---

# `metadata.csv`

The exported metadata file is a CSV designed around the standard two-column Whisper-style format used by this project.

The **first line must be exactly:**

```csv
audio,text
```

The audio column contains the relative path to the audio file.

The text column contains the intended transcript.

Example:

```csv
audio,text
audio/000001.wav,Can you turn off the television
audio/000002.wav,Turn off that air conditioner
audio/000003.wav,"Hey, go ahead and you open the garage door upstairs"
audio/000004.wav,Could you go on and adjust the air conditioner
audio/000005.wav,"You see that TV over there, turn off it"
```

CSV quoting is required when transcript text contains characters that would interfere with CSV parsing, such as commas or quotation marks.

For example:

```csv
audio/000003.wav,"Hey, go ahead and you open the garage door upstairs"
```

The application automatically handles CSV escaping during export.

---

# Importing a Dataset

The application supports two related ZIP import formats.

The first is the application's normal exported dataset format.

The second is a simpler **fallback import format** intended for importing datasets created outside the application.

The importer also supports a ZIP where the actual dataset is contained inside one additional top-level folder.

This is useful when a dataset is packaged like:

```text
my-dataset.zip
│
└── some-random-folder-name/
    │
    ├── audio/
    │   ├── 000001.wav
    │   ├── 000002.wav
    │   └── ...
    │
    └── metadata.csv
```

The folder name does **not** need to be known in advance.

The importer searches for the dataset structure inside the ZIP instead of requiring `audio/` and `metadata.csv` to exist only at the ZIP root.

This means a ZIP such as:

```text
my-dataset.zip
└── 8f4c2b1a/
    ├── audio/
    │   ├── 000001.wav
    │   └── 000002.wav
    └── metadata.csv
```

can still be imported.

---

# Creating Your Own Dataset for Import

You can create a compatible dataset without using this application.

The simplest supported format is:

```text
your-dataset.zip
│
└── your-folder-name/
    │
    ├── audio/
    │   ├── 000001.wav
    │   ├── 000002.wav
    │   ├── 000003.wav
    │   └── ...
    │
    └── metadata.csv
```

The additional folder is optional.

You can also create:

```text
your-dataset.zip
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   └── ...
│
└── metadata.csv
```

Both layouts are supported.

The importer is primarily interested in finding:

```text
audio/
metadata.csv
```

inside the ZIP.

---

# Requirements for Your Own `metadata.csv`

Your `metadata.csv` must begin with:

```csv
audio,text
```

The first column must identify the audio file.

The second column must contain the transcript.

Example:

```csv
audio,text
audio/000001.wav,Turn on the living room lights
audio/000002.wav,Turn off the television
audio/000003.wav,Can you turn the thermostat down
```

The audio path in `metadata.csv` should correspond to the audio file's location inside the ZIP.

For example:

```text
audio/000001.wav
```

corresponds to:

```text
audio/
└── 000001.wav
```

If the dataset is inside another folder, the metadata does not need to include that outer folder name.

For example, this ZIP:

```text
dataset.zip
└── random-folder/
    ├── audio/
    │   └── 000001.wav
    └── metadata.csv
```

can still use:

```csv
audio,text
audio/000001.wav,Turn on the living room lights
```

The importer normalizes the paths and searches for the matching audio file.

---

# CSV Rules

The importer supports normal CSV quoting.

If the transcript contains a comma, quote, or other CSV-sensitive character, the field should be quoted.

For example:

```csv
audio,text
audio/000001.wav,"Hey, turn the living room lights on"
```

A quotation mark inside the transcript must be represented using two quotation marks according to normal CSV rules.

Example:

```csv
audio,text
audio/000001.wav,"He said ""turn on the lights"""
```

The application has its own CSV parser for importing metadata.

The safest format is always:

```csv
audio,text
```

followed by one recording per line.

---

# Audio Requirements for Custom Imports

For reliable importing and later Whisper training, use:

```text
WAV
PCM
16-bit
16,000 Hz
Mono
```

Recommended:

```text
Sample rate: 16000 Hz
Channels: 1
Bit depth: 16-bit
Codec: PCM
Container: WAV
```

Example:

```text
000001.wav
```

should be:

```text
16 kHz
16-bit
mono
PCM WAV
```

The importer does not use the filename alone to determine the transcript.

The transcript comes from `metadata.csv`.

For example:

```text
audio/000001.wav
```

must have a corresponding metadata row:

```csv
audio/000001.wav,Turn on the living room lights
```

The audio should contain the speech represented by that transcript.

---

# Simple Custom Import Example

A complete manually created dataset can therefore be as simple as:

```text
my-dataset/
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   ├── 000003.wav
│   ├── 000004.wav
│   └── 000005.wav
│
└── metadata.csv
```

With:

```csv
audio,text
audio/000001.wav,Can you turn off the television
audio/000002.wav,Turn off that air conditioner
audio/000003.wav,"Hey, go ahead and you open the garage door upstairs"
audio/000004.wav,Could you go on and adjust the air conditioner
audio/000005.wav,"You see that TV over there, turn off it"
```

Zip the `my-dataset` folder:

```text
my-dataset.zip
```

Then import that ZIP through the application.

The ZIP may also contain additional files, but they are not required for the basic fallback import.

---

# Fallback Import

The application has a fallback importer specifically for simple datasets that do not contain the application's full export structure.

The fallback importer is used when the normal dataset import cannot successfully import the dataset.

It looks for:

```text
metadata.csv
```

and:

```text
audio/
```

within the ZIP.

The importer can also find these files when they are located inside one additional top-level folder.

For example:

```text
dataset.zip
└── abc123/
    ├── metadata.csv
    └── audio/
        ├── 000001.wav
        ├── 000002.wav
        └── 000003.wav
```

is a valid layout.

The fallback importer uses the following information:

```text
metadata.csv
    ↓
audio path
    ↓
transcript
    ↓
audio file
    ↓
new dataset entry
```

Additional metadata such as:

```text
category
intent
style
regionalInfluence
pronunciationTargets
template
```

is not required for fallback imports.

Those values are initialized to basic defaults.

---

# What Happens During Fallback Import

For each row in `metadata.csv`, the importer:

1. Reads the audio path.
2. Finds the corresponding audio file inside the ZIP.
3. Reads the transcript.
4. Loads the audio as a Blob.
5. Creates a dataset entry.
6. Assigns the transcript.
7. Adds the recording to the dataset.
8. Continues to the next entry.

For example:

```csv
audio,text
audio/000001.wav,Turn on the kitchen lights
```

results in an imported dataset entry containing the audio from:

```text
audio/000001.wav
```

and the transcript:

```text
Turn on the kitchen lights
```

---

# Import Failure Conditions

The importer will reject the dataset if it cannot find the required information.

Typical errors include:

```text
Import failed. The ZIP does not contain a usable dataset and no metadata.csv was found for fallback import.
```

This means the importer could not find a usable `metadata.csv`.

Another possible error is:

```text
Import failed. metadata.csv contains no dataset entries.
```

This means the CSV was found but contained no usable recording rows.

Another possible error is:

```text
Import failed. No audio files were found in the audio/ folder.
```

This means the metadata exists, but the importer could not find the corresponding audio directory.

A fallback import may also fail if none of the metadata rows can be matched to actual audio files.

---

# Importing an Existing Export

A ZIP exported directly by the application contains additional information.

Example:

```text
kentucky-voice-dataset-20260808-190000.zip
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   └── ...
│
├── metadata.csv
├── config.json
├── manifest.json
└── README.txt
```

The normal importer attempts to restore:

* Recordings
* Transcripts
* IDs
* Categories
* Intents
* Styles
* Templates
* Regional influences
* Pronunciation targets
* Recording durations
* MIME types
* Creation timestamps
* Configuration

If the normal import cannot successfully recover recordings, the importer can attempt the simpler fallback import.

---

# Adding Imported Data

Importing a dataset adds the imported recordings to the current dataset.

It is intended to allow the user to:

```text
Create dataset
    ↓
Export
    ↓
Later import
    ↓
Continue recording
```

It can also be used to start with a dataset created elsewhere and then continue recording additional examples inside the application.

The imported audio and transcript become normal dataset entries.

Once imported, those entries can be reviewed and, where supported, re-recorded from the Dataset tab.

---

# Backup Workflow

Because browser persistence is unreliable in the current version, the recommended workflow is:

```text
Generate sentences
        ↓
Record sentences
        ↓
Export ZIP
        ↓
Continue recording
        ↓
Export another ZIP
        ↓
Keep the ZIP files somewhere safe
```

If the page refreshes and the working dataset disappears, import the most recent ZIP backup.

The import/export system is intended to make this recovery possible.

---

# Offline Operation

The application is designed to operate locally.

It does not require a local AI model.

Once the application files and required dependencies are downloaded, the generator, recorder, dataset manager, and export/import systems can operate without an Internet connection.

Some browsers restrict functionality when an HTML file is opened directly with:

```text
file://
```

For reliable operation, run the project through a small local HTTP server.

For example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

No Internet connection is required for the local server.

The local server is simply providing the browser with HTTP instead of loading the application directly from the filesystem.

---

# JSZip

The export system uses JSZip to create ZIP archives.

For completely offline operation, JSZip should be stored locally rather than loaded from a CDN.

Example:

```text
js/
├── app.js
├── recorder.js
├── dataset.js
├── generator.js
├── audio.js
├── export.js
├── storage.js
└── jszip.min.js
```

---

# Privacy

The application is intended to keep recordings local.

It does not need to upload recordings to a remote server.

Voice recordings can contain highly identifying information and should be treated as private data.

Be careful when sharing exported datasets.

---

# Dataset Quality

The goal is not simply to generate the largest possible number of recordings.

A smaller dataset containing varied, natural speech can be more useful than thousands of nearly identical commands.

Useful variation includes:

* Sentence structure
* Word order
* Openings
* Actions
* Devices
* Locations
* Pronouns
* References
* Formality
* Regional vocabulary
* Conversational phrasing

The speaker should speak naturally.

Do not deliberately exaggerate an accent.

Useful examples include:

```text
Turn on the living room lights.

Can you turn the living room lights on?

Go ahead and turn them lights on.

It's getting pretty dark in here.

It's too dark in the living room.

Can you cut the lights on in here?

How about you turn the living room light on?

I reckon you could turn that light on.
```

---

# Dataset Accuracy

The transcript should represent what the speaker is intentionally saying.

If the target transcript is:

```text
Can you turn the thermostat down?
```

the speaker should attempt to say that sentence naturally.

The dataset should not be created by recording random speech and then guessing what the speaker said afterward.

For speech-recognition training, the relationship between audio and transcript is critical.

An incorrect transcript effectively teaches the model that the wrong sound corresponds to the wrong words.

If a recording is bad:

```text
Wrong pronunciation
Background noise
Missed words
Wrong sentence
Coughing
Talking over the recording
Recording started too late
Recording stopped too early
```

the preferred solution is to re-record it or remove it.

The Dataset tab's re-record capability exists specifically to make correcting bad recordings easier.

---

# Project Philosophy

The original goal was simple:

> Build a dataset around how one real person actually talks to a smart home.

That means the dataset should contain more than perfectly structured commands.

It should include:

* Normal commands
* Casual commands
* Indirect requests
* Regional expressions
* Pronoun references
* Context-dependent requests
* Natural speech reductions
* Some unusual but understandable phrasing

The generator should not be treated as a source of perfect English.

It is a tool for creating material that can then be recorded, reviewed, and used to build a personalized speech dataset.

---

# What This Project Is Not

This project is not:

* Professionally engineered software
* A professional linguistic corpus
* A scientific study of Appalachian English
* A universal Whisper dataset formatter
* A semantic natural-language generation system
* A replacement for human review
* A guarantee that generated sentences make sense
* A guarantee that every exported dataset works with every Whisper training system
* A guarantee that a trained speech model will understand every command

It is a practical experiment in building a personalized smart-home voice dataset.

---

# If You Want to Build Something Better

Take the idea.

Seriously.

The useful part of this project is the concept more than the code.

A better implementation could add:

* Local LLM-based sentence validation
* Semantic device/location validation
* Better grammar checking
* Better Home Assistant intent modeling
* Entity-aware generation
* More realistic conversational context
* Automatic bad-sentence detection
* Recording quality analysis
* Reliable persistent storage
* Better dataset versioning
* Better Whisper dataset exports
* Multiple speaker support
* Phoneme or pronunciation analysis
* Better regional-language controls

If someone takes this project and turns the idea into something substantially better, that is a success rather than a failure of the original project.

The point was to make something useful enough to experiment with, not to pretend that a pile of AI-assisted JavaScript is going to overthrow the field of speech recognition.

---

# Final Warning

**Save often. Export often.**

The current browser storage implementation can lose the working dataset after a page refresh.

The ZIP export is your backup.

If you care about the recordings, export them.

---

## License

No license has been selected yet.

Choose an appropriate license before distributing the project publicly.
