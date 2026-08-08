Kentucky Voice Dataset Builder
Vibe coded with AI.
This project was built primarily with substantial assistance from generative AI. The code, data structures, sentence-generation logic, examples, and documentation have all been influenced by AI-generated material. It has not been professionally engineered, formally audited, or extensively tested.
If you want to take this idea, rebuild it properly, improve it, or turn it into something actually useful, you are more than welcome to do so.
A browser-based voice dataset builder for creating speech datasets for Whisper and other speech-recognition systems.
The project was made specifically for collecting natural smart-home commands spoken in the user's normal Kentucky, Appalachian, Southern, and general American speech patterns.
The original goal was to make it easier to build a personalized speech dataset for smart-home voice control, particularly for Home Assistant.
What This Is
This is a relatively simple browser application that combines:
	•	JSON vocabulary
	•	Sentence templates
	•	Smart-home intents
	•	Weighted random selection
	•	Regional vocabulary
	•	Pronunciation targets
	•	Browser-based audio recording
	•	Dataset management
	•	ZIP import and export
It does not use a local AI model to generate or validate sentences.
The sentence generator is rule-based.
That makes it lightweight and capable of running locally, but it also means the generator can produce some questionable sentences because, tragically, combining grammatically valid pieces does not guarantee that the resulting sentence makes sense.

Running the Application
This application must be run through a local web server.
Do not open index.html directly with file://. The application uses browser features that may not work correctly when the page is opened directly from the filesystem.
You do not need an Internet connection to run the application, but you do need a local web server.
Python 3 is the easiest option because it is available on Linux and macOS and can also be installed on Windows.
Linux
Open a terminal, change to the project directory, and run:
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
Then open:
http://localhost:8000
macOS
Open Terminal, change to the project directory, and run:
cd /path/to/kentucky-voice-dataset-builder
python3 -m http.server 8000
Then open:
http://localhost:8000
On macOS, the project folder can also be opened in Terminal by dragging the folder into the Terminal window after typing cd .
Windows
Open Command Prompt or PowerShell, change to the project directory, and run:
cd C:\path\to\kentucky-voice-dataset-builder
py -m http.server 8000
Then open:
http://localhost:8000
If py is not available but Python is installed, try:
python -m http.server 8000
Stopping the Server
When finished, return to the terminal window running the server and press:
Ctrl+C
This stops the local web server.
Important
The local server does not connect the application to the Internet. It only provides the web server functionality required for the browser to run the application correctly.
The application itself is designed to operate locally.
You can disconnect from the Internet after the application files and required dependencies have been downloaded.
Remember: the local server is required every time you want to use the application.

Important Warning: Save Your Work
Export your dataset frequently.
The application's browser storage is not something you should trust as your only copy of your recordings.
Depending on the browser and the state of the application, refreshing the page can result in data being lost.
There is currently no guarantee that an in-progress dataset will survive:
	•	Page refreshes
	•	Browser crashes
	•	Closing the browser
	•	Clearing browser data
	•	Storage cleanup
	•	Browser storage limitations
	•	Application changes
The safest workflow is:
Generate
   ↓
Record
   ↓
Export ZIP
   ↓
Record more
   ↓
Export ZIP again
The ZIP export and import functionality works and should be treated as the actual backup mechanism.
Do not build a large dataset in the browser and assume the browser will politely remember everything. Browsers have never shown much loyalty to human plans.
If you have recordings you care about, export them.
Features
	•	Generate smart-home sentences
	•	Generate multiple variations of the same intent
	•	Use different sentence structures
	•	Generate direct commands
	•	Generate conversational requests
	•	Generate noun-first commands
	•	Generate indirect requests
	•	Generate pronoun/reference-based commands
	•	Include Southern and Appalachian-influenced vocabulary
	•	Track pronunciation targets
	•	Record speech directly from the browser
	•	Automatically move to the next sentence after recording
	•	Skip sentences
	•	Review recorded and pending sentences
	•	Search and filter dataset entries
	•	Track dataset statistics
	•	Add custom sentences
	•	Import an existing dataset
	•	Continue adding recordings to an existing dataset
	•	Export the dataset as a ZIP file
	•	Store audio recordings with transcripts
	•	Store configuration inside exported datasets
	•	Restore configuration when importing
	•	Generate configurable metadata
	•	Select audio format and sample rate
	•	Run locally without requiring an Internet connection
Known Limitations
The generator is not an AI language model.
It uses predefined templates and vocabulary to construct sentences.
This works reasonably well for many normal commands, but it can also produce sentences that are:
	•	Awkward
	•	Unnatural
	•	Semantically questionable
	•	Ambiguous
	•	Grammatically strange
	•	Technically grammatical but unlikely to be spoken
	•	Completely wrong combinations of devices and locations
For example, it may generate things like:
Turn on the kitchen light in the bedroom.

Turn off the bedroom fan in the basement.

Brighten the blinds in the hallway.

Close the television.

Put the bedroom lights in the dining room.

Power on the kitchen fan in the bathroom.
Some of these could make sense in a particular context.
Some clearly do not.
This is a limitation of the rule-based generation system.
There is no semantic AI layer checking every generated sentence.
Why Some Weird Sentences Are Useful
The purpose of this project is to collect speech from an actual person.
Real speech is not perfectly grammatical.
People use:
	•	Pronouns
	•	References
	•	Reordered words
	•	Incomplete commands
	•	Informal grammar
	•	Regional vocabulary
	•	Connected speech
	•	Indirect requests
	•	Context-dependent phrases
	•	Unusual wording
	•	Corrections
	•	Filler words
	•	Different ways of expressing the same request
Examples:
Turn them living room lights on.

It's pretty dark in here.

Go ahead and cut them lights on.

Turn that one on.

The lights in here, get them on.

It's fucking dark in the living room, how about you turn on the lights in here.
These can be useful training examples.
The problem is that the generator does not always know the difference between a naturally odd human sentence and an accidentally bad sentence.
That distinction currently has to be handled by the person using the application.
AI / Vibe Coding Disclosure
This project is intentionally labeled as vibe coded.
A substantial amount of the software was produced or modified with generative AI assistance.
AI was used for things including:
	•	JavaScript
	•	HTML
	•	CSS
	•	JSON structures
	•	Sentence-generation logic
	•	Smart-home intent design
	•	Dataset design
	•	Debugging
	•	Documentation
	•	Example sentences
	•	Architecture suggestions
The resulting code has not been professionally reviewed.
It may contain:
	•	Bugs
	•	Inefficient code
	•	Poor design decisions
	•	Inconsistent data structures
	•	Security issues
	•	Browser compatibility problems
	•	Incorrect assumptions
	•	Features that appear to work but have edge cases
The same applies to the linguistic data.
The regional vocabulary should not be treated as authoritative research on Kentucky, Appalachian, or Southern English.
It was created as practical vocabulary for this particular project.
If somebody wants to take the basic concept and build a properly engineered version, improve the generator, add a local language model, build better validation, or turn it into a real dataset platform, that is encouraged.
Project Structure
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
How It Works
Generator
js/generator.js
The generator creates sentences using JSON files in the data/ directory.
It combines things such as:
	•	Sentence templates
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Connectors
	•	Pronouns
	•	Modifiers
	•	Questions
	•	Regional vocabulary
	•	Smart-home intents
	•	Pronunciation targets
Weighted random selection allows common phrases to occur more frequently than uncommon phrases.
The generator also attempts to prevent duplicate sentences within a generation batch.
It does not understand language in the way a large language model does.
Templates
data/templates.json
Templates define sentence structures.
Examples:
{opening} {action} {device}

{opening} {action} {device} {location}

{question} {action} {device}

{opening} {device} {modifier}

{opening} it's {modifier} {location}

{opening} {device} is {modifier}

{regional} {action} {device}
The goal is to create different ways of expressing the same intent rather than generating thousands of nearly identical commands.
Vocabulary
data/vocabulary.json
Contains reusable vocabulary for:
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Connectors
	•	Pronouns
	•	Modifiers
	•	Questions
	•	Regional language
Examples include:
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
Regional vocabulary is intended to occur naturally.
The project is not intended to create an exaggerated or stereotypical Appalachian accent.
Pronunciation Targets
data/pronunciation.json
Contains words and phrases useful for monitoring pronunciation.
Examples:
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
The project does not intentionally misspell words to represent an accent.
For example, a transcript should normally contain:
going to
rather than:
gonna
if "going to" is the intended transcript.
The speaker should simply pronounce the words naturally.
Smart-Home Intents
data/smart-home.json
Defines smart-home commands that the generator can produce.
Current categories include:
	•	Lighting
	•	Climate
	•	Media
	•	Security
	•	Covers
	•	Power
Examples:
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
The intent system was designed around smart-home control rather than arbitrary speech.
Device and Location Problems
One of the generator's biggest weaknesses is that it can combine device names and locations in ways that do not make much sense.
For example:
bedroom fan
may already contain a location, but the generator can still add:
in the basement
resulting in:
Turn off the bedroom fan in the basement.
This is a consequence of the simple rule-based system.
A better implementation would separate:
Device type
Device name
Device location
Device aliases
and understand the relationship between them.
That is one of the areas where a future implementation could substantially improve on this project.
Recording
js/recorder.js
The intended recording workflow is:
	1	Display a sentence.
	2	Wait for the user to start.
	3	Give a countdown.
	4	Start recording.
	5	Detect when the user has stopped speaking.
	6	Stop recording.
	7	Save the audio.
	8	Mark the sentence as recorded.
	9	Move to the next pending sentence.
Manual recording controls are also useful when automatic silence detection does not behave correctly.
The application should not automatically change the transcript based on what the recording sounds like.
The displayed sentence is the intended transcript.
If the recording contains a mistake, the recording should be discarded or reviewed rather than silently changing the transcript.
Audio
js/audio.js
Handles audio-related functions such as:
	•	Audio format handling
	•	Audio duration
	•	Audio playback
	•	Audio conversion where supported
	•	Audio metadata
	•	Audio validation
A commonly useful Whisper configuration is:
Format: WAV
Channels: Mono
Sample rate: 16000 Hz
Bit depth: 16-bit PCM
The exact requirements depend on the training pipeline.
Dataset Management
js/dataset.js
Maintains dataset entries.
Entries can contain information such as:
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
Possible statuses include:
pending
recorded
skipped
Storage
js/storage.js
The application uses browser storage for the working dataset.
IndexedDB is more appropriate than Local Storage for audio because recordings can be much larger than normal text data.
However, the current implementation should not be considered reliable permanent storage.
A page refresh may result in loss of the current working dataset.
Browser storage behavior can also be affected by:
	•	Browser settings
	•	Storage quotas
	•	Clearing site data
	•	Private browsing
	•	Browser crashes
	•	Application changes
	•	Browser compatibility
For that reason:
Export your dataset frequently.
The ZIP export is the important backup mechanism.
Import and Export
js/export.js
The application can export the dataset as a ZIP archive.
A typical export looks like:
kentucky-voice-dataset/
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   ├── 000003.wav
│   └── ...
│
├── metadata.csv
├── dataset.json
├── config.json
└── README.txt
The exact structure may change depending on the training system being used.
Import
ZIP files exported by the application can be imported again.
The import process is intended to:
	1	Read the ZIP archive.
	2	Locate config.json.
	3	Restore configuration.
	4	Locate dataset metadata.
	5	Locate audio files.
	6	Rebuild dataset entries.
	7	Preserve transcript text.
	8	Preserve available recording metadata.
	9	Add entries to the current dataset.
	10	Avoid overwriting existing recordings.
Invalid or incomplete entries should be reported instead of silently disappearing.
Backup Workflow
Because browser persistence is unreliable in the current version, the recommended workflow is:
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
If the page refreshes and the working dataset disappears, import the most recent ZIP backup.
The import/export system is intended to make this recovery possible.
Offline Operation
The application is designed to operate locally.
It does not require a local AI model.
Once the application files and required dependencies are downloaded, the generator, recorder, dataset manager, and export/import systems can operate without an Internet connection.
Some browsers restrict functionality when an HTML file is opened directly with:
file://
For reliable operation, run the project through a small local HTTP server.
For example:
python3 -m http.server 8000
Then open:
http://localhost:8000
No Internet connection is required for the local server.
JSZip
The export system uses JSZip to create ZIP archives.
For completely offline operation, JSZip should be stored locally rather than loaded from a CDN.
Example:
js/
├── app.js
├── recorder.js
├── dataset.js
├── generator.js
├── audio.js
├── export.js
├── storage.js
└── jszip.min.js
Privacy
The application is intended to keep recordings local.
It does not need to upload recordings to a remote server.
Voice recordings can contain highly identifying information and should be treated as private data.
Be careful when sharing exported datasets.
Dataset Quality
The goal is not simply to generate the largest possible number of recordings.
A smaller dataset containing varied, natural speech can be more useful than thousands of nearly identical commands.
Useful variation includes:
	•	Sentence structure
	•	Word order
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Pronouns
	•	References
	•	Formality
	•	Regional vocabulary
	•	Conversational phrasing
The speaker should speak naturally.
Do not deliberately exaggerate an accent.
Useful examples include:
Turn on the living room lights.

Can you turn the living room lights on?

Go ahead and turn them lights on.

It's getting pretty dark in here.

It's too dark in the living room.

Can you cut the lights on in here?

How about you turn the living room light on?

I reckon you could turn that light on.
Project Philosophy
The original goal was simple:
Build a dataset around how one real person actually talks to a smart home.
That means the dataset should contain more than perfectly structured commands.
It should include:
	•	Normal commands
	•	Casual commands
	•	Indirect requests
	•	Regional expressions
	•	Pronoun references
	•	Context-dependent requests
	•	Natural speech reductions
	•	Some unusual but understandable phrasing
The generator should not be treated as a source of perfect English.
It is a tool for creating material that can then be recorded, reviewed, and used to build a personalized speech dataset.
What This Project Is Not
This project is not:
	•	Professionally engineered software
	•	A professional linguistic corpus
	•	A scientific study of Appalachian English
	•	A universal Whisper dataset formatter
	•	A semantic natural-language generation system
	•	A replacement for human review
	•	A guarantee that generated sentences make sense
	•	A guarantee that every exported dataset works with every Whisper training system
	•	A guarantee that a trained speech model will understand every command
It is a practical experiment in building a personalized smart-home voice dataset.
If You Want to Build Something Better
Take the idea.
Seriously.
The useful part of this project is the concept more than the code.
A better implementation could add:
	•	Local LLM-based sentence validation
	•	Semantic device/location validation
	•	Better grammar checking
	•	Better Home Assistant intent modeling
	•	Entity-aware generation
	•	More realistic conversational context
	•	Automatic bad-sentence detection
	•	Recording quality analysis
	•	Reliable persistent storage
	•	Better dataset versioning
	•	Better Whisper dataset exports
	•	Multiple speaker support
	•	Phoneme or pronunciation analysis
	•	Better regional-language controls
If someone takes this project and turns the idea into something substantially better, that is a success rather than a failure of the original project.
The point was to make something useful enough to experiment with, not to pretend that a pile of AI-assisted JavaScript is going to overthrow the field of speech recognition.
Final Warning
Save often. Export often.
The current browser storage implementation can lose the working dataset after a page refresh.
The ZIP export is your backup.
If you care about the recordings, export them.
Kentucky Voice Dataset Builder
Vibe coded with AI.
This project was built primarily with substantial assistance from generative AI. The code, data structures, sentence-generation logic, examples, and documentation have all been influenced by AI-generated material. It has not been professionally engineered, formally audited, or extensively tested.
If you want to take this idea, rebuild it properly, improve it, or turn it into something actually useful, you are more than welcome to do so.
A browser-based voice dataset builder for creating speech datasets for Whisper and other speech-recognition systems.
The project was made specifically for collecting natural smart-home commands spoken in the user's normal Kentucky, Appalachian, Southern, and general American speech patterns.
The original goal was to make it easier to build a personalized speech dataset for smart-home voice control, particularly for Home Assistant.
What This Is
This is a relatively simple browser application that combines:
	•	JSON vocabulary
	•	Sentence templates
	•	Smart-home intents
	•	Weighted random selection
	•	Regional vocabulary
	•	Pronunciation targets
	•	Browser-based audio recording
	•	Dataset management
	•	ZIP import and export
It does not use a local AI model to generate or validate sentences.
The sentence generator is rule-based.
That makes it lightweight and capable of running locally, but it also means the generator can produce some questionable sentences because, tragically, combining grammatically valid pieces does not guarantee that the resulting sentence makes sense.
Important Warning: Save Your Work
Export your dataset frequently.
The application's browser storage is not something you should trust as your only copy of your recordings.
Depending on the browser and the state of the application, refreshing the page can result in data being lost.
There is currently no guarantee that an in-progress dataset will survive:
	•	Page refreshes
	•	Browser crashes
	•	Closing the browser
	•	Clearing browser data
	•	Storage cleanup
	•	Browser storage limitations
	•	Application changes
The safest workflow is:
Generate
   ↓
Record
   ↓
Export ZIP
   ↓
Record more
   ↓
Export ZIP again
The ZIP export and import functionality works and should be treated as the actual backup mechanism.
Do not build a large dataset in the browser and assume the browser will politely remember everything. Browsers have never shown much loyalty to human plans.
If you have recordings you care about, export them.
Features
	•	Generate smart-home sentences
	•	Generate multiple variations of the same intent
	•	Use different sentence structures
	•	Generate direct commands
	•	Generate conversational requests
	•	Generate noun-first commands
	•	Generate indirect requests
	•	Generate pronoun/reference-based commands
	•	Include Southern and Appalachian-influenced vocabulary
	•	Track pronunciation targets
	•	Record speech directly from the browser
	•	Automatically move to the next sentence after recording
	•	Skip sentences
	•	Review recorded and pending sentences
	•	Search and filter dataset entries
	•	Track dataset statistics
	•	Add custom sentences
	•	Import an existing dataset
	•	Continue adding recordings to an existing dataset
	•	Export the dataset as a ZIP file
	•	Store audio recordings with transcripts
	•	Store configuration inside exported datasets
	•	Restore configuration when importing
	•	Generate configurable metadata
	•	Select audio format and sample rate
	•	Run locally without requiring an Internet connection
Known Limitations
The generator is not an AI language model.
It uses predefined templates and vocabulary to construct sentences.
This works reasonably well for many normal commands, but it can also produce sentences that are:
	•	Awkward
	•	Unnatural
	•	Semantically questionable
	•	Ambiguous
	•	Grammatically strange
	•	Technically grammatical but unlikely to be spoken
	•	Completely wrong combinations of devices and locations
For example, it may generate things like:
Turn on the kitchen light in the bedroom.

Turn off the bedroom fan in the basement.

Brighten the blinds in the hallway.

Close the television.

Put the bedroom lights in the dining room.

Power on the kitchen fan in the bathroom.
Some of these could make sense in a particular context.
Some clearly do not.
This is a limitation of the rule-based generation system.
There is no semantic AI layer checking every generated sentence.
Why Some Weird Sentences Are Useful
The purpose of this project is to collect speech from an actual person.
Real speech is not perfectly grammatical.
People use:
	•	Pronouns
	•	References
	•	Reordered words
	•	Incomplete commands
	•	Informal grammar
	•	Regional vocabulary
	•	Connected speech
	•	Indirect requests
	•	Context-dependent phrases
	•	Unusual wording
	•	Corrections
	•	Filler words
	•	Different ways of expressing the same request
Examples:
Turn them living room lights on.

It's pretty dark in here.

Go ahead and cut them lights on.

Turn that one on.

The lights in here, get them on.

It's fucking dark in the living room, how about you turn on the lights in here.
These can be useful training examples.
The problem is that the generator does not always know the difference between a naturally odd human sentence and an accidentally bad sentence.
That distinction currently has to be handled by the person using the application.
AI / Vibe Coding Disclosure
This project is intentionally labeled as vibe coded.
A substantial amount of the software was produced or modified with generative AI assistance.
AI was used for things including:
	•	JavaScript
	•	HTML
	•	CSS
	•	JSON structures
	•	Sentence-generation logic
	•	Smart-home intent design
	•	Dataset design
	•	Debugging
	•	Documentation
	•	Example sentences
	•	Architecture suggestions
The resulting code has not been professionally reviewed.
It may contain:
	•	Bugs
	•	Inefficient code
	•	Poor design decisions
	•	Inconsistent data structures
	•	Security issues
	•	Browser compatibility problems
	•	Incorrect assumptions
	•	Features that appear to work but have edge cases
The same applies to the linguistic data.
The regional vocabulary should not be treated as authoritative research on Kentucky, Appalachian, or Southern English.
It was created as practical vocabulary for this particular project.
If somebody wants to take the basic concept and build a properly engineered version, improve the generator, add a local language model, build better validation, or turn it into a real dataset platform, that is encouraged.
Project Structure
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
How It Works
Generator
js/generator.js
The generator creates sentences using JSON files in the data/ directory.
It combines things such as:
	•	Sentence templates
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Connectors
	•	Pronouns
	•	Modifiers
	•	Questions
	•	Regional vocabulary
	•	Smart-home intents
	•	Pronunciation targets
Weighted random selection allows common phrases to occur more frequently than uncommon phrases.
The generator also attempts to prevent duplicate sentences within a generation batch.
It does not understand language in the way a large language model does.
Templates
data/templates.json
Templates define sentence structures.
Examples:
{opening} {action} {device}

{opening} {action} {device} {location}

{question} {action} {device}

{opening} {device} {modifier}

{opening} it's {modifier} {location}

{opening} {device} is {modifier}

{regional} {action} {device}
The goal is to create different ways of expressing the same intent rather than generating thousands of nearly identical commands.
Vocabulary
data/vocabulary.json
Contains reusable vocabulary for:
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Connectors
	•	Pronouns
	•	Modifiers
	•	Questions
	•	Regional language
Examples include:
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
Regional vocabulary is intended to occur naturally.
The project is not intended to create an exaggerated or stereotypical Appalachian accent.
Pronunciation Targets
data/pronunciation.json
Contains words and phrases useful for monitoring pronunciation.
Examples:
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
The project does not intentionally misspell words to represent an accent.
For example, a transcript should normally contain:
going to
rather than:
gonna
if "going to" is the intended transcript.
The speaker should simply pronounce the words naturally.
Smart-Home Intents
data/smart-home.json
Defines smart-home commands that the generator can produce.
Current categories include:
	•	Lighting
	•	Climate
	•	Media
	•	Security
	•	Covers
	•	Power
Examples:
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
The intent system was designed around smart-home control rather than arbitrary speech.
Device and Location Problems
One of the generator's biggest weaknesses is that it can combine device names and locations in ways that do not make much sense.
For example:
bedroom fan
may already contain a location, but the generator can still add:
in the basement
resulting in:
Turn off the bedroom fan in the basement.
This is a consequence of the simple rule-based system.
A better implementation would separate:
Device type
Device name
Device location
Device aliases
and understand the relationship between them.
That is one of the areas where a future implementation could substantially improve on this project.
Recording
js/recorder.js
The intended recording workflow is:
	1	Display a sentence.
	2	Wait for the user to start.
	3	Give a countdown.
	4	Start recording.
	5	Detect when the user has stopped speaking.
	6	Stop recording.
	7	Save the audio.
	8	Mark the sentence as recorded.
	9	Move to the next pending sentence.
Manual recording controls are also useful when automatic silence detection does not behave correctly.
The application should not automatically change the transcript based on what the recording sounds like.
The displayed sentence is the intended transcript.
If the recording contains a mistake, the recording should be discarded or reviewed rather than silently changing the transcript.
Audio
js/audio.js
Handles audio-related functions such as:
	•	Audio format handling
	•	Audio duration
	•	Audio playback
	•	Audio conversion where supported
	•	Audio metadata
	•	Audio validation
A commonly useful Whisper configuration is:
Format: WAV
Channels: Mono
Sample rate: 16000 Hz
Bit depth: 16-bit PCM
The exact requirements depend on the training pipeline.
Dataset Management
js/dataset.js
Maintains dataset entries.
Entries can contain information such as:
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
Possible statuses include:
pending
recorded
skipped
Storage
js/storage.js
The application uses browser storage for the working dataset.
IndexedDB is more appropriate than Local Storage for audio because recordings can be much larger than normal text data.
However, the current implementation should not be considered reliable permanent storage.
A page refresh may result in loss of the current working dataset.
Browser storage behavior can also be affected by:
	•	Browser settings
	•	Storage quotas
	•	Clearing site data
	•	Private browsing
	•	Browser crashes
	•	Application changes
	•	Browser compatibility
For that reason:
Export your dataset frequently.
The ZIP export is the important backup mechanism.
Import and Export
js/export.js
The application can export the dataset as a ZIP archive.
A typical export looks like:
kentucky-voice-dataset/
│
├── audio/
│   ├── 000001.wav
│   ├── 000002.wav
│   ├── 000003.wav
│   └── ...
│
├── metadata.csv
├── dataset.json
├── config.json
└── README.txt
The exact structure may change depending on the training system being used.
Import
ZIP files exported by the application can be imported again.
The import process is intended to:
	1	Read the ZIP archive.
	2	Locate config.json.
	3	Restore configuration.
	4	Locate dataset metadata.
	5	Locate audio files.
	6	Rebuild dataset entries.
	7	Preserve transcript text.
	8	Preserve available recording metadata.
	9	Add entries to the current dataset.
	10	Avoid overwriting existing recordings.
Invalid or incomplete entries should be reported instead of silently disappearing.
Backup Workflow
Because browser persistence is unreliable in the current version, the recommended workflow is:
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
If the page refreshes and the working dataset disappears, import the most recent ZIP backup.
The import/export system is intended to make this recovery possible.
Offline Operation
The application is designed to operate locally.
It does not require a local AI model.
Once the application files and required dependencies are downloaded, the generator, recorder, dataset manager, and export/import systems can operate without an Internet connection.
Some browsers restrict functionality when an HTML file is opened directly with:
file://
For reliable operation, run the project through a small local HTTP server.
For example:
python3 -m http.server 8000
Then open:
http://localhost:8000
No Internet connection is required for the local server.
JSZip
The export system uses JSZip to create ZIP archives.
For completely offline operation, JSZip should be stored locally rather than loaded from a CDN.
Example:
js/
├── app.js
├── recorder.js
├── dataset.js
├── generator.js
├── audio.js
├── export.js
├── storage.js
└── jszip.min.js
Privacy
The application is intended to keep recordings local.
It does not need to upload recordings to a remote server.
Voice recordings can contain highly identifying information and should be treated as private data.
Be careful when sharing exported datasets.
Dataset Quality
The goal is not simply to generate the largest possible number of recordings.
A smaller dataset containing varied, natural speech can be more useful than thousands of nearly identical commands.
Useful variation includes:
	•	Sentence structure
	•	Word order
	•	Openings
	•	Actions
	•	Devices
	•	Locations
	•	Pronouns
	•	References
	•	Formality
	•	Regional vocabulary
	•	Conversational phrasing
The speaker should speak naturally.
Do not deliberately exaggerate an accent.
Useful examples include:
Turn on the living room lights.

Can you turn the living room lights on?

Go ahead and turn them lights on.

It's getting pretty dark in here.

It's too dark in the living room.

Can you cut the lights on in here?

How about you turn the living room light on?

I reckon you could turn that light on.
Project Philosophy
The original goal was simple:
Build a dataset around how one real person actually talks to a smart home.
That means the dataset should contain more than perfectly structured commands.
It should include:
	•	Normal commands
	•	Casual commands
	•	Indirect requests
	•	Regional expressions
	•	Pronoun references
	•	Context-dependent requests
	•	Natural speech reductions
	•	Some unusual but understandable phrasing
The generator should not be treated as a source of perfect English.
It is a tool for creating material that can then be recorded, reviewed, and used to build a personalized speech dataset.
What This Project Is Not
This project is not:
	•	Professionally engineered software
	•	A professional linguistic corpus
	•	A scientific study of Appalachian English
	•	A universal Whisper dataset formatter
	•	A semantic natural-language generation system
	•	A replacement for human review
	•	A guarantee that generated sentences make sense
	•	A guarantee that every exported dataset works with every Whisper training system
	•	A guarantee that a trained speech model will understand every command
It is a practical experiment in building a personalized smart-home voice dataset.
If You Want to Build Something Better
Take the idea.
Seriously.
The useful part of this project is the concept more than the code.
A better implementation could add:
	•	Local LLM-based sentence validation
	•	Semantic device/location validation
	•	Better grammar checking
	•	Better Home Assistant intent modeling
	•	Entity-aware generation
	•	More realistic conversational context
	•	Automatic bad-sentence detection
	•	Recording quality analysis
	•	Reliable persistent storage
	•	Better dataset versioning
	•	Better Whisper dataset exports
	•	Multiple speaker support
	•	Phoneme or pronunciation analysis
	•	Better regional-language controls
If someone takes this project and turns the idea into something substantially better, that is a success rather than a failure of the original project.
The point was to make something useful enough to experiment with, not to pretend that a pile of AI-assisted JavaScript is going to overthrow the field of speech recognition.
Final Warning
Save often. Export often.
The current browser storage implementation can lose the working dataset after a page refresh.
The ZIP export is your backup.
If you care about the recordings, export them.


