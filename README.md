# Kentucky Voice Dataset Builder

> **Vibe coded with AI.**

Kentucky Voice Dataset Builder is a local-first browser application for building personalized speech datasets.

It was created primarily for collecting smart-home commands spoken naturally by one person, including Kentucky, Appalachian, Southern, and general American speech patterns. The resulting recordings can be exported for use with Whisper and other speech-recognition systems, particularly for projects such as Home Assistant.

The project was built with substantial assistance from generative AI. The code has not been professionally engineered or formally audited.

The goal is practical: make it easier to generate sentences, record them, organize the recordings, and export a usable speech dataset.

---

## Current Version

**Application version: 0.5.1**

The current application includes:

* Local browser recording
* Rule-based smart-home sentence generation
* Dataset management
* IndexedDB persistence
* Recording replacement and re-recording
* ZIP export
* ZIP import
* Fallback dataset import
* Support for ZIPs containing an additional top-level folder
* Whisper-style `metadata.csv` generation
* Dataset configuration persistence
* Audio conversion and WAV generation
* Local JSZip support

---

# Running the Application

There are two ways to run the application.

## Local Version

The application can be run from your own computer using a local HTTP server.

This is the recommended method when building a private speech dataset.

The application should be run through a local HTTP server.

Do not open `index.html` directly with:

```text
file://
```

The application uses browser APIs such as IndexedDB, Web Audio, microphone access, and `fetch()` for its local JSON data.

A local HTTP server provides the environment the browser expects.

### Linux

```bash
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

### macOS

```bash
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

You can also type:

```bash
cd 
```

and drag the project folder into Terminal to insert its path.

### Windows

```powershell
cd C:\path\to\kentucky-voice-dataset-builder
py -m http.server 8000
```

Open:

```text
http://localhost:8000
```

If `py` is unavailable:

```powershell
python -m http.server 8000
```

### Stopping the Server

Press:

```text
Ctrl+C
```

in the terminal running the server.

The local server does not connect the application to the Internet. It simply provides HTTP access to the application files.

---

# GitHub Pages Version

The application is also available as a live website through GitHub Pages:

**https://mds041703.github.io/kentucky-voice-dataset-builder/**

This version is **not running locally**.

The website files are hosted by GitHub Pages and served from GitHub over HTTPS. The application is therefore considered the **non-local version** when accessed through the GitHub Pages address.

The GitHub Pages version still uses the browser's local storage systems, including IndexedDB, for application data and recordings. The fact that the website is hosted by GitHub does not mean that recordings are automatically uploaded to GitHub.

The basic data flow is:

```text
GitHub Pages
      ↓
Browser
      ↓
Application
      ↓
IndexedDB
      ↓
Recordings stored in the browser
```

Exporting a dataset creates a ZIP file that can be saved wherever you choose.

The GitHub Pages version is useful for accessing the application without starting a local HTTP server, but it should not be confused with a locally hosted copy.

### Local vs GitHub Pages

|                                  | Local Version          | GitHub Pages Version  |
| -------------------------------- | ---------------------- | --------------------- |
| Application files                | Local computer         | GitHub                |
| Address                          | `localhost`            | `mds041703.github.io` |
| Requires local HTTP server       | Yes                    | No                    |
| Uses browser IndexedDB           | Yes                    | Yes                   |
| Recordings stored in browser     | Yes                    | Yes                   |
| Automatically uploads recordings | No                     | No                    |
| Website itself hosted locally    | Yes                    | No                    |
| HTTPS                            | Depends on local setup | Yes                   |

For private dataset work, the local version is generally the preferred option because the application files and data workflow remain entirely on your own computer.

---

# What the Application Does

The application combines several systems:

```text
JSON Data
   ↓
Sentence Generator
   ↓
Dataset Entries
   ↓
Browser Recording
   ↓
IndexedDB
   ↓
Dataset Management
   ↓
ZIP Export
   ↓
Whisper / Speech-Recognition Dataset
```

The generator is rule-based. It does not use an AI language model to create or validate sentences.

It combines predefined templates, vocabulary, smart-home intents, regional vocabulary, pronunciation targets, and weighted selections.

That keeps the application lightweight and able to run locally, but it also means the generator can create sentences that are technically assembled correctly while still being ridiculous. Computers remain excellent at following rules and terrible at knowing when the rules produced nonsense.

---

# Important: Browser Storage and Backups

The application uses IndexedDB for persistent application data and recorded audio.

Recorded and imported dataset entries are written to IndexedDB. The current storage layer uses:

```text
Database:
kentucky_voice_dataset_builder

IndexedDB version:
2
```

The storage layer supports both the current recording structure and older audio structures for compatibility.

Completed recordings are explicitly saved before the Dataset module advances to another sentence. Imported recordings are also persisted through the same storage layer.

However, browser storage is still not a substitute for a real backup.

Export important work as a ZIP periodically.

A practical workflow is:

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

Keep the exported ZIP files somewhere outside the browser.

Browser storage can be affected by clearing site data, browser storage policies, private browsing, browser failures, or future application changes.

---

# Important Persistence Detail

There is an important distinction between generated sentences and completed recordings.

Generated pending sentences are held by the Dataset module while the application is running.

When a recording is completed, the entry is saved to IndexedDB.

Imported recordings are also saved to IndexedDB.

Therefore:

```text
Generated sentence
    ↓
Pending in application
    ↓
Record it
    ↓
Saved to IndexedDB
```

A generated sentence that has not yet been recorded is not the same thing as a persisted recording.

If the browser is refreshed before a generated sentence has been recorded, that pending in-memory entry may not be restored.

---

# Application Pages

The application has five primary sections:

```text
Record
Generate
Dataset
Settings
Import / Export
```

## Record

The Record page displays the currently selected sentence and provides microphone controls.

The normal workflow is:

1. Select a sentence.
2. Start recording.
3. Countdown.
4. Record speech.
5. Detect silence or manually stop.
6. Finish the recording.
7. Save it to the dataset.
8. Advance to the next pending sentence.

The recorder also supports recording controls such as stopping, skipping, redoing, saving, and retaking recordings.

---

## Generate

The Generate page creates new dataset sentences.

Generation is based on the JSON files in:

```text
data/
```

The generator uses:

* Sentence templates
* Actions
* Devices
* Locations
* Openings
* Connectors
* Pronouns
* Modifiers
* Questions
* Regional vocabulary
* Smart-home intents
* Pronunciation targets
* Weighted selection

The generator attempts to avoid duplicate sentences within a generation batch.

It does not perform semantic reasoning.

---

## Dataset

The Dataset page is the management interface for dataset entries.

It can be used to:

* Search entries
* Filter entries
* Review transcripts
* Review recording status
* Select entries
* Play recordings
* Re-record recordings
* Replace poor recordings
* Inspect dataset statistics

Dataset entries can contain information such as:

```text
ID
Transcript
Category
Intent
Style
Template
Regional influence
Pronunciation targets
Status
Recording
Duration
MIME type
Creation time
Modification time
Source
Imported state
```

The Dataset module loads persisted entries from IndexedDB when the application starts.

---

# Re-recording

A recording should be replaced if it contains:

* Background noise
* Incorrect speech
* Missing words
* Recording artifacts
* An incorrect sentence
* A bad microphone capture
* A recording that otherwise should not be included in training

The intended workflow is:

```text
Dataset
   ↓
Select entry
   ↓
Re-record
   ↓
Record replacement
   ↓
Save replacement
```

The transcript is not automatically changed based on the audio.

If the intended transcript is:

```text
Turn the thermostat down.
```

the recording should contain that intended sentence.

A speech-recognition system should not be used to guess a new transcript and silently replace the original.

The Dataset module persists the replacement recording through `Storage.saveEntry()`.

---

# Settings

The Settings page stores application configuration in IndexedDB.

Settings include:

## Dataset

```text
Dataset name
Speaker ID
```

## Recording

```text
Countdown
Silence before stopping
Minimum duration
Maximum duration
Audio pre-roll
Silence threshold
```

## Audio

```text
Format
Sample rate
Channels
Bit depth
```

Available audio formats in the current interface include:

```text
WAV
FLAC
MP3
WebM / Opus
```

Available sample rates include:

```text
8 kHz
16 kHz
22.05 kHz
24 kHz
44.1 kHz
48 kHz
```

Available channel settings include:

```text
Mono
Stereo
```

Bit depth settings include:

```text
16-bit
24-bit
```

The default recording configuration targets:

```text
WAV
16 kHz
Mono
16-bit
```

The Settings page also provides Whisper export options and configurable CSV delimiters.

---

# Recommended Audio Format for Whisper

For a Whisper-style speech dataset, the recommended target is:

```text
Container: WAV
Codec: PCM
Sample rate: 16000 Hz
Channels: 1
Bit depth: 16-bit
```

In short:

```text
16 kHz
16-bit
mono
PCM WAV
```

The exporter uses the audio settings to convert recordings to the selected output format when supported. WAV export uses the local `AudioTools` conversion system.

Other speech-recognition pipelines may have different requirements. Check the requirements of the actual training pipeline before training.

---

# Audio Processing

`js/audio.js` provides audio functionality including:

* Blob handling
* Audio decoding
* Audio information
* Mono conversion
* Sample-rate conversion
* PCM WAV encoding
* Audio format handling
* Audio conversion

The application is designed to keep the original browser recording available while allowing the exporter to produce the desired dataset format.

---

# Sentence Generation

The generator is located in:

```text
js/generator.js
```

It loads:

```text
data/templates.json
data/vocabulary.json
data/pronunciation.json
data/smart-home.json
```

The generator uses weighted random selection and different sentence structures to create variation.

It can produce:

* Direct commands
* Conversational commands
* Questions
* Indirect requests
* Noun-first commands
* Pronoun/reference-based commands
* Informal phrasing
* Regional vocabulary
* Smart-home commands

The generator loads the JSON data through local `fetch()` calls. If a JSON file cannot be loaded, it has internal default structures available as fallbacks.

---

# Templates

Templates are stored in:

```text
data/templates.json
```

They define the structure of generated sentences.

The template system allows the same basic intent to be expressed in different ways.

For example, the concept of turning on a light could be expressed as:

```text
Turn on the living room lights.
```

or:

```text
Can you turn the living room lights on?
```

or:

```text
Go ahead and turn them lights on.
```

The exact sentences available depend on the current template and vocabulary data.

---

# Vocabulary

Vocabulary is stored in:

```text
data/vocabulary.json
```

It contains reusable language for areas such as:

```text
Openings
Actions
Devices
Locations
Connectors
Pronouns
Modifiers
Questions
Regional vocabulary
```

Regional vocabulary is intended to provide natural variation rather than deliberately spelling words incorrectly.

The purpose is to train on how someone naturally speaks, not to create a cartoon version of a regional accent.

---

# Pronunciation Targets

Pronunciation information is stored in:

```text
data/pronunciation.json
```

This data identifies words and phrases that are useful when building a personalized speech dataset.

The application does not intentionally misspell transcripts to represent an accent.

For example, the transcript should normally use:

```text
going to
```

rather than changing it to:

```text
gonna
```

unless `gonna` is actually the intended word in the sentence.

The speaker should pronounce the sentence naturally.

---

# Smart-Home Intents

Smart-home definitions are stored in:

```text
data/smart-home.json
```

The intent system is designed around smart-home control.

It can represent operations such as:

```text
Lighting
Climate
Media
Security
Covers
Power
```

Examples include:

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

The actual available intents are defined by the current `smart-home.json` file.

---

# Why the Generator Can Produce Weird Sentences

The generator is rule-based.

It does not understand whether every combination makes semantic sense.

For example, a rule-based system can accidentally combine a device and a location that do not belong together.

That can produce sentences such as:

```text
Turn off the bedroom fan in the basement.
```

or other combinations that may be valid in one house but nonsensical in another.

This is not a semantic language model.

Generated sentences should be reviewed before recording.

---

# Natural Speech Is Not Perfect Speech

The purpose of the dataset is to teach a speech-recognition system how a real person talks.

Real speech can include:

* Different word orders
* Pronouns
* References
* Informal grammar
* Regional vocabulary
* Indirect requests
* Filler words
* Corrections
* Context-dependent wording
* Connected speech
* Unusual but understandable phrasing

Examples might include:

```text
Turn them living room lights on.

It's pretty dark in here.

Go ahead and cut them lights on.

Turn that one on.

The lights in here, get them on.
```

These kinds of variations can be valuable.

The important distinction is between:

```text
Natural unusual speech
```

and:

```text
A generated sentence that simply makes no sense.
```

The application cannot reliably make that distinction automatically.

Human review remains necessary.

---

# Dataset Quality

More recordings do not automatically mean a better dataset.

Useful variation is more important than producing thousands of nearly identical commands.

Useful variation can include:

```text
Different sentence structures
Different openings
Different word orders
Different device references
Different locations
Pronouns
Indirect requests
Conversational phrasing
Regional vocabulary
Different levels of formality
```

The speaker should speak naturally.

Do not exaggerate an accent for the recording.

If the person normally says something in a particular way, that natural pronunciation is exactly what the personalized dataset is intended to capture.

---

# Transcript Accuracy

The transcript should represent the intended speech.

If the target transcript is:

```text
Can you turn the thermostat down?
```

the recording should contain that sentence.

If the speaker says something different, the recording should normally be:

* Re-recorded
* Rejected
* Or otherwise removed from the training dataset

Do not automatically replace the transcript with an automatic speech-recognition guess.

For supervised speech training, the relationship between:

```text
Audio
    ↕
Transcript
```

is fundamental.

Incorrect transcripts teach the model incorrect relationships.

---

# Dataset Storage

The storage system is:

```text
IndexedDB
    ↓
Storage
    ↓
Dataset
    ↓
App.state
    ↓
UI
```

IndexedDB is the persistent source of truth for configuration and persisted dataset entries.

The database currently uses:

```text
Name:
kentucky_voice_dataset_builder

Version:
2

Object stores:
entries
settings
meta
```

The `entries` store uses the dataset entry ID as its key path and contains indexes for dataset metadata.

Audio Blobs are stored directly in IndexedDB.

The storage layer normalizes different audio representations so that the application can work with:

```text
entry.recording.blob
```

and older structures such as:

```text
entry.audioBlob
```

The normalized representation keeps both the legacy audio field and the recording object available for compatibility.

---

# ZIP Export

The Import / Export page can create a ZIP archive containing the recorded dataset.

The exporter creates an `audio/` directory and places the recordings inside it.

It also creates metadata and dataset information.

The basic exported structure is:

```text
dataset.zip
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   ├── 000003.wav
│   └── ...
│
├── metadata.csv
├── manifest.json
├── config.json
└── README.txt
```

The exact additional files may depend on the current exporter configuration.

The exporter only includes entries that have usable audio and text.

---

# `metadata.csv`

The default metadata format is a two-column CSV:

```csv
audio,text
```

The first row is the header.

Example:

```csv
audio,text
audio/000001.wav,Turn on the living room lights
audio/000002.wav,Turn off the television
audio/000003.wav,Can you turn the thermostat down
```

The exporter automatically handles CSV quoting.

For example, a transcript containing a comma may be exported as:

```csv
audio/000004.wav,"Hey, turn the living room lights on"
```

Quotes inside CSV fields are escaped according to normal CSV rules.

The metadata column names and delimiter are configurable through the application's export configuration.

---

# Importing a Dataset

The application accepts ZIP files through the Import / Export page.

It supports two main situations.

## Normal Application Export

A ZIP produced by this application can contain:

```text
audio/
metadata.csv
manifest.json
config.json
```

The normal importer attempts to use the manifest and metadata to restore the dataset.

## Simple External Dataset

The application also supports a simpler dataset containing:

```text
audio/
metadata.csv
```

This is the fallback import format.

The importer can search for the required files even when the dataset is placed inside an additional top-level directory.

For example:

```text
dataset.zip
└── my-dataset/
    ├── audio/
    │   ├── 000001.wav
    │   └── 000002.wav
    │
    └── metadata.csv
```

is supported.

The outer directory does not have to be named `my-dataset`.

---

# Creating Your Own Import Dataset

The simplest compatible dataset is:

```text
my-dataset/
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   └── 000003.wav
│
└── metadata.csv
```

The ZIP can contain that directory:

```text
my-dataset.zip
└── my-dataset/
    ├── audio/
    └── metadata.csv
```

or the files can be placed directly at the ZIP root:

```text
my-dataset.zip
├── audio/
└── metadata.csv
```

Both layouts are supported by the importer.

---

# Custom `metadata.csv`

The minimum useful CSV is:

```csv
audio,text
audio/000001.wav,Turn on the living room lights
audio/000002.wav,Turn off the television
audio/000003.wav,Can you turn the thermostat down
```

The `audio` field identifies the audio file.

The `text` field contains the transcript.

The audio path should correspond to the audio file inside the ZIP.

For example:

```csv
audio/000001.wav,Turn on the living room lights
```

corresponds to:

```text
audio/
└── 000001.wav
```

The importer also recognizes common alternate transcript column names such as:

```text
text
transcript
sentence
utterance
phrase
```

The normal format should still be:

```csv
audio,text
```

because that is the format produced by this application.

---

# Custom Audio Requirements

For a Whisper-oriented dataset, use:

```text
WAV
PCM
16-bit
16000 Hz
Mono
```

For example:

```text
audio/000001.wav
```

should contain:

```text
16 kHz
16-bit
mono
PCM audio
```

The transcript in `metadata.csv` should correspond to what the recording intentionally contains.

The importer does not infer the transcript from the filename.

---

# Fallback Import

The fallback importer is designed for simple datasets that do not contain the full application export structure.

Its basic requirements are:

```text
metadata.csv
audio/
```

The importer first attempts to locate `metadata.csv` at the detected dataset root.

If it cannot find it there, it searches the ZIP more broadly for a `metadata.csv`.

It then searches for audio files relative to the metadata file and, if necessary, searches more broadly for audio files inside an `audio/` directory.

For every matching audio file, it:

1. Finds the corresponding metadata row.
2. Reads the transcript.
3. Loads the audio into a Blob.
4. Creates a dataset entry.
5. Marks the entry as imported.
6. Saves the entry through the Dataset/Storage system.

The imported entry receives default metadata when information such as category, intent, style, or pronunciation targets is not supplied.

---

# Fallback Import Example

This is enough to create a basic external dataset:

```text
dataset.zip
└── anything/
    ├── metadata.csv
    └── audio/
        ├── 000001.wav
        ├── 000002.wav
        └── 000003.wav
```

With:

```csv
audio,text
audio/000001.wav,Turn on the kitchen lights
audio/000002.wav,Turn off the television
audio/000003.wav,Turn the thermostat down
```

The folder name can be arbitrary.

The importer searches for the actual dataset structure rather than requiring a specific outer directory name.

---

# Import Errors

Common fallback-import failures include:

```text
Import failed. No metadata.csv was found.
```

The ZIP did not contain a usable metadata file.

```text
Import failed. metadata.csv contains no dataset entries.
```

The metadata file was found but contained no usable rows.

```text
Import failed. No audio files were found in an audio/ folder.
```

The importer could not find compatible audio files.

```text
Fallback import failed. No recordings could be imported using audio/ and metadata.csv.
```

The importer found the metadata and audio structure but could not match usable recordings to transcripts.

These errors are preferable to silently importing an incomplete dataset.

---

# Importing Into an Existing Dataset

Imported recordings are added to the current Dataset state.

Each imported recording becomes a normal dataset entry.

The imported entry is marked:

```text
imported: true
```

The recording is then persisted through IndexedDB.

If an imported entry uses an ID that already exists, the Dataset module can replace the existing entry rather than blindly creating another copy.

---

# Audio Export and Conversion

When exporting WAV audio, the exporter attempts to pass the recording through:

```text
AudioTools.convert()
```

using the configured audio settings.

If conversion fails, the exporter logs the problem and falls back to the original recording rather than silently deleting the recording from the export.

This means the exported audio should still be checked before beginning a training run.

---

# JSZip

ZIP creation and extraction use the local copy of:

```text
js/jszip.min.js
```

The current HTML loads JSZip locally before the application systems.

This avoids depending on a CDN for normal ZIP import/export operation.

---

# Project Structure

The current repository structure is:

```text
kentucky-voice-dataset-builder/
│
├── kentucky-voice-dataset-builder/
│   │
│   ├── index.html
│   │
│   ├── css/
│   │   └── app.css
│   │
│   ├── data/
│   │   ├── pronunciation.json
│   │   ├── smart-home.json
│   │   ├── templates.json
│   │   └── vocabulary.json
│   │
│   └── js/
│       ├── app.js
│       ├── audio.js
│       ├── dataset.js
│       ├── export.js
│       ├── generator.js
│       ├── jszip.min.js
│       ├── recorder.js
│       └── storage.js
│
└── README.md
```

The JavaScript files are loaded in dependency order by `index.html`.

---

# JavaScript Components

## `app.js`

Main application controller.

Responsibilities include:

* Application startup
* Storage initialization
* Configuration loading
* Dataset initialization
* Navigation
* Settings
* UI synchronization
* Dataset statistics
* Application state

The current application version is:

```text
0.5.1
```

The application startup sequence is intended to be:

```text
IndexedDB
   ↓
Configuration
   ↓
Dataset
   ↓
UI
   ↓
Recorder
```

---

## `storage.js`

Provides the IndexedDB persistence layer.

It handles:

* Database initialization
* Dataset entries
* Audio Blobs
* Configuration
* Settings
* Metadata
* Entry normalization
* Entry lookup
* Entry counting
* Entry saving
* Entry deletion

The storage layer uses `store.put()` when saving entries, allowing an existing ID to be updated as well as allowing new entries to be inserted.

---

## `dataset.js`

Controls the in-memory dataset and Dataset UI.

Responsibilities include:

* Loading persisted entries
* Adding sentences
* Receiving recordings
* Saving recordings
* Importing entries
* Selecting entries
* Re-recording
* Searching
* Filtering
* Statistics
* Dataset rendering
* Current-sentence management

Completed recordings are persisted before Dataset advances to another pending sentence.

---

## `recorder.js`

Controls microphone recording.

It manages:

* Microphone access
* Recording state
* Countdown
* Silence detection
* Maximum recording duration
* Recording chunks
* Audio Blob creation
* Current sentence association
* Re-recording
* Retakes
* Recording UI

The recorder uses the current Dataset sentence ID to help prevent a completed recording from being associated with the wrong sentence.

---

## `audio.js`

Provides audio processing and conversion.

It handles:

* Blob decoding
* AudioContext
* AudioBuffer information
* Mono conversion
* Resampling
* WAV encoding
* Format conversion

---

## `generator.js`

Loads the JSON language data and generates smart-home utterances.

It is intentionally rule-based.

There is no local LLM or remote AI service involved in sentence generation.

---

## `export.js`

Handles:

* ZIP export
* ZIP import
* Metadata CSV generation
* Manifest handling
* Configuration handling
* Audio file discovery
* Metadata matching
* Fallback imports

The exporter creates an `audio/` folder and writes metadata rows referencing those files.

---

# Current Known Limitations

## Rule-Based Generation

The generator does not semantically validate sentences.

Generated sentences can therefore be:

* Awkward
* Unnatural
* Ambiguous
* Grammatically strange
* Semantically incorrect
* Unlikely to be spoken naturally

Generated sentences should be reviewed before recording.

---

## Pending Generated Sentences

Generated pending entries are not currently persisted to IndexedDB merely because they were generated.

Persistence occurs when recordings are saved or entries are imported.

Therefore, an application refresh can remove pending generated sentences that have not yet been recorded.

---

## Browser Storage

IndexedDB provides persistent local storage, but it should not be treated as a complete backup strategy.

Use ZIP exports for backups.

---

## Current Startup Issue

The current `app.js` calls:

```javascript
setVersion();
```

during initialization.

The current `app.js` contains the call and comments describing the intended behavior, but there is no corresponding `setVersion()` function in the current file.

This can produce:

```text
ReferenceError: setVersion is not defined
```

during application initialization.

The version itself is already exposed through:

```javascript
App.VERSION
```

and stored as:

```text
0.5.1
```

The `index.html` footer currently contains an older static fallback value of `v0.1.0`, while the application controller has moved to `0.5.1`.

This should be corrected in the application code before treating the current checkout as a clean release.

---

# Dataset Quality Recommendations

A useful personalized speech dataset should contain variation without becoming garbage.

Good variation includes:

```text
Turn on the living room lights.

Can you turn the living room lights on?

Go ahead and turn them living room lights on.

It's getting dark in here.

It's too dark in the living room.

Can you cut the lights on in here?
```

The exact wording should reflect how the speaker actually talks.

Do not deliberately exaggerate pronunciation.

Do not intentionally introduce spelling mistakes into transcripts merely to represent an accent.

Do not keep recordings that contain obvious mistakes simply to increase the dataset size.

A smaller clean dataset is preferable to a larger dataset containing mislabeled audio.

---

# Privacy

Voice recordings can contain identifying information.

The application is designed to operate locally and does not require uploading recordings to a remote service.

The GitHub Pages version is hosted remotely, but its browser data is still stored by the browser for that website origin. Recordings are not automatically committed to the GitHub repository or uploaded to GitHub.

However, exported ZIP files contain the actual recordings.

Treat exported datasets as private files unless you intentionally want to share them.

Do not publish recordings containing personal or sensitive information without considering the consequences.

---

# AI / Vibe-Coding Disclosure

This project was built with substantial generative-AI assistance.

AI assistance was used for areas including:

* JavaScript
* HTML
* CSS
* JSON structures
* Dataset architecture
* Sentence-generation logic
* Smart-home intent design
* Debugging
* Documentation
* Architecture decisions
* Examples

The project has not been professionally engineered or formally audited.

Possible issues include:

* Bugs
* Browser compatibility problems
* Inefficient code
* Inconsistent structures
* Incorrect assumptions
* Edge cases
* Poor architectural decisions
* Security issues

The linguistic data should also not be treated as authoritative research on Kentucky, Appalachian, or Southern English.

The regional vocabulary exists for the practical purpose of generating speech examples for this project.

---

# What This Project Is

It is a practical tool for:

```text
Generating speech prompts
        ↓
Recording natural speech
        ↓
Managing recordings
        ↓
Persisting completed entries locally
        ↓
Exporting a training dataset
```

It is especially useful for experimenting with personalized speech recognition and smart-home voice control.

---

# What This Project Is Not

It is not:

* A professional speech corpus
* A professional linguistic study
* An authoritative representation of Appalachian English
* A semantic natural-language-generation system
* A replacement for human dataset review
* A universal Whisper training pipeline
* A guarantee that generated sentences make sense
* A guarantee that exported data meets every training framework's requirements
* A guarantee that a trained model will understand every possible command

It is a dataset-building tool and an experiment in personalized speech recognition.

---

# Future Improvements

Potential future improvements include:

* Persisting pending generated sentences
* More robust semantic sentence validation
* Device/location relationships
* Entity-aware smart-home generation
* Better dataset versioning
* More detailed recording-quality checks
* Automatic bad-recording detection
* Multiple-speaker support
* Better training-framework exports
* Phoneme and pronunciation analysis
* More advanced conversational sentence generation
* Local language-model-assisted generation and validation
* Improved IndexedDB recovery and migration

---

# Project Philosophy

The original idea was simple:

> Build a speech dataset around how one real person actually talks to a smart home.

That means the dataset should not consist entirely of rigid commands such as:

```text
Turn on the living room lights.
```

It should also contain natural alternatives:

```text
Can you turn the lights on in here?

It's getting dark in the living room.

Go ahead and cut them lights on.

You see them lights over there? Turn them on.
```

The application exists to make collecting that variety easier.

The generated text is a starting point.

The human speaker and the quality of the resulting recordings are what ultimately determine the usefulness of the dataset.

---

# License

Kentucky Voice Dataset Builder is licensed under the GNU General Public License v3.0 (GPL-3.0).

See the [LICENSE](LICENSE) file for the complete license text.

Under the GPL-3.0, you are free to use, study, modify, copy, distribute, and commercially use this software, subject to the terms of the license.

If you distribute a modified version of this application, the GPL-3.0 requires you to provide the corresponding source code under the applicable GPL terms. This helps ensure that improvements and modified versions remain open source.

## Third-Party Software

This project includes third-party software that was not written by the project author.

### JSZip

This project includes `js/jszip.min.js`, which is used for ZIP file creation and extraction.

JSZip is dual-licensed under the MIT License or GNU General Public License v3.0. This project uses JSZip under the GPLv3 option.

JSZip is Copyright © JS Foundation and other contributors.

The JSZip project and its source code are available here:

https://github.com/Stuk/jszip

The applicable JSZip license information is included with the JSZip project.

## Voice Recordings and Datasets

The GPL-3.0 license for the application does not automatically apply to voice recordings or other datasets created using the application.

Voice recordings, transcripts, and other datasets may have separate ownership and licensing terms.

If you distribute recordings or datasets created with this application, you are responsible for determining the appropriate rights and license for that material.

