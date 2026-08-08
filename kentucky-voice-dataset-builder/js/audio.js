/*
 * Kentucky Voice Dataset Builder
 * js/audio.js
 *
 * Audio processing:
 * - Blob decoding
 * - Mono conversion
 * - Sample-rate conversion
 * - PCM WAV encoding
 * - WAV/MP3/WebM format handling hooks
 */

"use strict";


const AudioTools = (() => {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        initialized: false,

        audioContext: null
    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function init() {

        if (state.initialized) {
            return;
        }


        state.initialized = true;


        console.log(
            "Audio tools initialized."
        );
    }


    /* =====================================================
       AUDIO CONTEXT
       ===================================================== */

    function getAudioContext() {

        if (state.audioContext) {
            return state.audioContext;
        }


        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {

            throw new Error(
                "Web Audio API is not supported by this browser."
            );
        }


        state.audioContext =
            new AudioContext();


        return state.audioContext;
    }


    /* =====================================================
       BLOB -> ARRAY BUFFER
       ===================================================== */

    async function blobToArrayBuffer(
        blob
    ) {

        if (!(blob instanceof Blob)) {

            throw new TypeError(
                "Expected a Blob."
            );
        }


        return await blob.arrayBuffer();
    }


    /* =====================================================
       DECODE AUDIO
       ===================================================== */

    async function decodeAudio(
        input
    ) {

        let arrayBuffer;


        if (
            input instanceof Blob
        ) {

            arrayBuffer =
                await blobToArrayBuffer(
                    input
                );

        } else if (
            input instanceof ArrayBuffer
        ) {

            arrayBuffer =
                input;

        } else {

            throw new TypeError(
                "Audio input must be a Blob or ArrayBuffer."
            );
        }


        /*
         * decodeAudioData may detach the supplied ArrayBuffer,
         * so make a copy before passing it to the browser.
         */

        const copy =
            arrayBuffer.slice(0);


        const context =
            getAudioContext();


        return await context.decodeAudioData(
            copy
        );
    }


    /* =====================================================
       AUDIO BUFFER INFO
       ===================================================== */

    function getAudioInfo(
        audioBuffer
    ) {

        if (
            !audioBuffer ||
            typeof audioBuffer.duration !==
                "number"
        ) {

            throw new TypeError(
                "Invalid AudioBuffer."
            );
        }


        return {

            duration:
                audioBuffer.duration,

            sampleRate:
                audioBuffer.sampleRate,

            channels:
                audioBuffer.numberOfChannels,

            length:
                audioBuffer.length
        };
    }


    /* =====================================================
       MONO CONVERSION
       ===================================================== */

    function toMono(
        audioBuffer
    ) {

        if (
            audioBuffer.numberOfChannels ===
            1
        ) {

            return audioBuffer;
        }


        const context =
            getAudioContext();


        const mono =
            context.createBuffer(
                1,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        const output =
            mono.getChannelData(
                0
            );


        /*
         * Average every channel.

         * This avoids simply discarding one side of a stereo
         * recording.
         */

        const channels =
            [];


        for (
            let channel = 0;
            channel <
            audioBuffer.numberOfChannels;
            channel++
        ) {

            channels.push(
                audioBuffer.getChannelData(
                    channel
                )
            );
        }


        for (
            let i = 0;
            i < audioBuffer.length;
            i++
        ) {

            let sum = 0;


            for (
                const channel of channels
            ) {

                sum +=
                    channel[i];
            }


            output[i] =
                sum /
                channels.length;
        }


        return mono;
    }


    /* =====================================================
       RESAMPLE
       ===================================================== */

    async function resample(
        audioBuffer,
        targetSampleRate
    ) {

        const target =
            Number(
                targetSampleRate
            );


        if (
            !Number.isFinite(target) ||
            target <= 0
        ) {

            throw new Error(
                "Invalid target sample rate."
            );
        }


        if (
            audioBuffer.sampleRate ===
            target
        ) {

            return audioBuffer;
        }


        const duration =
            audioBuffer.duration;


        const frameCount =
            Math.ceil(
                duration *
                target
            );


        const OfflineAudioContext =
            window.OfflineAudioContext ||
            window.webkitOfflineAudioContext;


        if (!OfflineAudioContext) {

            throw new Error(
                "OfflineAudioContext is not supported by this browser."
            );
        }


        const offline =
            new OfflineAudioContext(
                1,
                frameCount,
                target
            );


        const source =
            offline.createBufferSource();


        /*
         * Convert to mono before rendering.
         */

        const mono =
            toMono(
                audioBuffer
            );


        source.buffer =
            mono;


        source.connect(
            offline.destination
        );


        source.start(
            0
        );


        return await offline.startRendering();
    }


    /* =====================================================
       NORMALIZE
       ===================================================== */

    function normalize(
        audioBuffer,
        targetPeak = 0.95
    ) {

        if (
            !audioBuffer ||
            audioBuffer.numberOfChannels <
                1
        ) {

            throw new TypeError(
                "Invalid AudioBuffer."
            );
        }


        const peakTarget =
            Math.max(
                0.01,
                Math.min(
                    1,
                    Number(
                        targetPeak
                    ) || 0.95
                )
            );


        const output =
            audioBuffer;


        let peak = 0;


        for (
            let channel = 0;
            channel <
            output.numberOfChannels;
            channel++
        ) {

            const data =
                output.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                peak =
                    Math.max(
                        peak,
                        Math.abs(
                            data[i]
                        )
                    );
            }
        }


        if (
            peak <= 0 ||
            peak >= peakTarget
        ) {

            return output;
        }


        const multiplier =
            peakTarget /
            peak;


        for (
            let channel = 0;
            channel <
            output.numberOfChannels;
            channel++
        ) {

            const data =
                output.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                data[i] *=
                    multiplier;
            }
        }


        return output;
    }


    /* =====================================================
       TRIM SILENCE
       ===================================================== */

    function trimSilence(
        audioBuffer,
        threshold = 0.008,
        paddingSeconds = 0.05
    ) {

        const mono =
            toMono(
                audioBuffer
            );


        const data =
            mono.getChannelData(
                0
            );


        let first =
            0;


        let last =
            data.length - 1;


        const limit =
            Math.max(
                0,
                Number(
                    threshold
                ) || 0.008
            );


        while (
            first < data.length &&
            Math.abs(
                data[first]
            ) < limit
        ) {

            first++;
        }


        while (
            last > first &&
            Math.abs(
                data[last]
            ) < limit
        ) {

            last--;
        }


        if (
            first >= last
        ) {

            return mono;
        }


        const padding =
            Math.floor(
                (
                    Number(
                        paddingSeconds
                    ) || 0
                ) *
                mono.sampleRate
            );


        first =
            Math.max(
                0,
                first - padding
            );


        last =
            Math.min(
                data.length - 1,
                last + padding
            );


        const length =
            last -
            first +
            1;


        const context =
            getAudioContext();


        const trimmed =
            context.createBuffer(
                1,
                length,
                mono.sampleRate
            );


        trimmed
            .getChannelData(0)
            .set(
                data.slice(
                    first,
                    last + 1
                )
            );


        return trimmed;
    }


    /* =====================================================
       PROCESS FOR WHISPER
       ===================================================== */

    async function prepareForWhisper(
        blob,
        options = {}
    ) {

        const sampleRate =
            Number(
                options.sampleRate ||
                16000
            );


        const trim =
            options.trimSilence !== false;


        const normalizeAudio =
            options.normalize !== false;


        let buffer =
            await decodeAudio(
                blob
            );


        /*
         * Mono first.
         */

        buffer =
            toMono(
                buffer
            );


        /*
         * Resample to requested rate.
         */

        buffer =
            await resample(
                buffer,
                sampleRate
            );


        /*
         * Optional silence trimming.
         */

        if (trim) {

            buffer =
                trimSilence(
                    buffer,
                    options.silenceThreshold ||
                        0.008,
                    options.silencePadding ||
                        0.05
                );
        }


        /*
         * Optional peak normalization.
         */

        if (normalizeAudio) {

            buffer =
                normalize(
                    buffer,
                    options.targetPeak ||
                        0.95
                );
        }


        return buffer;
    }


    /* =====================================================
       AUDIO BUFFER -> WAV
       ===================================================== */

    function audioBufferToWav(
        audioBuffer,
        options = {}
    ) {

        const channels =
            options.channels === 1
                ? 1
                : audioBuffer.numberOfChannels;


        const sampleRate =
            Number(
                options.sampleRate ||
                audioBuffer.sampleRate
            );


        const bitDepth =
            Number(
                options.bitDepth ||
                16
            );


        if (
            bitDepth !== 16 &&
            bitDepth !== 24 &&
            bitDepth !== 32
        ) {

            throw new Error(
                "Supported PCM bit depths are 16, 24, and 32."
            );
        }


        /*
         * Gather channel data.
         */

        const channelData =
            [];


        if (
            channels === 1
        ) {

            if (
                audioBuffer.numberOfChannels ===
                1
            ) {

                channelData.push(
                    audioBuffer.getChannelData(
                        0
                    )
                );

            } else {

                const mono =
                    toMono(
                        audioBuffer
                    );


                channelData.push(
                    mono.getChannelData(
                        0
                    )
                );
            }

        } else {

            for (
                let channel = 0;
                channel < channels;
                channel++
            ) {

                channelData.push(
                    audioBuffer.getChannelData(
                        Math.min(
                            channel,
                            audioBuffer.numberOfChannels - 1
                        )
                    )
                );
            }
        }


        const frameCount =
            channelData[0].length;


        const bytesPerSample =
            bitDepth / 8;


        const blockAlign =
            channels *
            bytesPerSample;


        const dataSize =
            frameCount *
            blockAlign;


        const buffer =
            new ArrayBuffer(
                44 +
                dataSize
            );


        const view =
            new DataView(
                buffer
            );


        writeString(
            view,
            0,
            "RIFF"
        );


        view.setUint32(
            4,
            36 + dataSize,
            true
        );


        writeString(
            view,
            8,
            "WAVE"
        );


        writeString(
            view,
            12,
            "fmt "
        );


        view.setUint32(
            16,
            16,
            true
        );


        view.setUint16(
            20,
            1,
            true
        );


        view.setUint16(
            22,
            channels,
            true
        );


        view.setUint32(
            24,
            sampleRate,
            true
        );


        view.setUint32(
            28,
            sampleRate *
            blockAlign,
            true
        );


        view.setUint16(
            32,
            blockAlign,
            true
        );


        view.setUint16(
            34,
            bitDepth,
            true
        );


        writeString(
            view,
            36,
            "data"
        );


        view.setUint32(
            40,
            dataSize,
            true
        );


        writePCM(
            view,
            44,
            channelData,
            frameCount,
            channels,
            bitDepth
        );


        return new Blob(
            [buffer],
            {
                type:
                    "audio/wav"
            }
        );
    }


    function writeString(
        view,
        offset,
        string
    ) {

        for (
            let i = 0;
            i < string.length;
            i++
        ) {

            view.setUint8(
                offset + i,
                string.charCodeAt(i)
            );
        }
    }


    function writePCM(
        view,
        offset,
        channels,
        frameCount,
        channelCount,
        bitDepth
    ) {

        let position =
            offset;


        for (
            let frame = 0;
            frame < frameCount;
            frame++
        ) {

            for (
                let channel = 0;
                channel < channelCount;
                channel++
            ) {

                let sample =
                    channels[channel][frame];


                sample =
                    Math.max(
                        -1,
                        Math.min(
                            1,
                            sample
                        )
                    );


                if (
                    bitDepth === 16
                ) {

                    const value =
                        sample < 0
                            ? sample * 0x8000
                            : sample * 0x7FFF;


                    view.setInt16(
                        position,
                        value,
                        true
                    );


                    position += 2;

                } else if (
                    bitDepth === 24
                ) {

                    let value =
                        sample < 0
                            ? sample * 0x800000
                            : sample * 0x7FFFFF;


                    value =
                        Math.round(
                            value
                        );


                    view.setUint8(
                        position,
                        value & 0xFF
                    );


                    view.setUint8(
                        position + 1,
                        (
                            value >> 8
                        ) & 0xFF
                    );


                    view.setUint8(
                        position + 2,
                        (
                            value >> 16
                        ) & 0xFF
                    );


                    position += 3;

                } else {

                    const value =
                        sample;


                    view.setFloat32(
                        position,
                        value,
                        true
                    );


                    position += 4;
                }
            }
        }
    }


    /* =====================================================
       WAV HEADER INFO
       ===================================================== */

    async function getWavInfo(
        blob
    ) {

        const buffer =
            await blob.arrayBuffer();


        if (
            buffer.byteLength <
            44
        ) {

            throw new Error(
                "File is too small to be a WAV file."
            );
        }


        const view =
            new DataView(
                buffer
            );


        const riff =
            readString(
                view,
                0,
                4
            );


        const wave =
            readString(
                view,
                8,
                4
            );


        if (
            riff !== "RIFF" ||
            wave !== "WAVE"
        ) {

            throw new Error(
                "Not a standard RIFF/WAVE file."
            );
        }


        return {

            channels:
                view.getUint16(
                    22,
                    true
                ),

            sampleRate:
                view.getUint32(
                    24,
                    true
                ),

            byteRate:
                view.getUint32(
                    28,
                    true
                ),

            blockAlign:
                view.getUint16(
                    32,
                    true
                ),

            bitDepth:
                view.getUint16(
                    34,
                    true
                )
        };
    }


    function readString(
        view,
        offset,
        length
    ) {

        let result = "";


        for (
            let i = 0;
            i < length;
            i++
        ) {

            result += String.fromCharCode(
                view.getUint8(
                    offset + i
                )
            );
        }


        return result;
    }


    /* =====================================================
       CONVERT BLOB
       ===================================================== */

    async function convert(
        blob,
        options = {}
    ) {

        const format =
            String(
                options.format ||
                "wav"
            ).toLowerCase();


        if (
            format === "wav"
        ) {

            const buffer =
                await prepareForWhisper(
                    blob,
                    options
                );


            return audioBufferToWav(
                buffer,
                {
                    channels:
                        options.channels ||
                        1,

                    sampleRate:
                        options.sampleRate ||
                        16000,

                    bitDepth:
                        options.bitDepth ||
                        16
                }
            );
        }


        /*
         * The browser cannot reliably encode MP3 by itself.
         *
         * MP3 support can later be added using a client-side
         * encoder library if we decide it is actually useful.
         */

        if (
            format === "webm" ||
            format === "webm-opus"
        ) {

            return blob;
        }


        if (
            format === "ogg" ||
            format === "opus"
        ) {

            return blob;
        }


        if (
            format === "mp3"
        ) {

            throw new Error(
                "MP3 encoding is not built into the browser. " +
                "Use WAV or WebM, or add an MP3 encoder."
            );
        }


        throw new Error(
            `Unsupported audio format: ${format}`
        );
    }


    /* =====================================================
       DOWNLOAD
       ===================================================== */

    function downloadBlob(
        blob,
        filename
    ) {

        if (
            !(blob instanceof Blob)
        ) {

            throw new TypeError(
                "Expected a Blob."
            );
        }


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


    /* =====================================================
       PUBLIC API
       ===================================================== */

    return {

        init,

        decodeAudio,

        getAudioInfo,

        toMono,

        resample,

        normalize,

        trimSilence,

        prepareForWhisper,

        audioBufferToWav,

        getWavInfo,

        convert,

        downloadBlob

    };

})();


/* =========================================================
   GLOBAL
   ========================================================= */

window.AudioTools =
    AudioTools;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        AudioTools.init();

    }
);