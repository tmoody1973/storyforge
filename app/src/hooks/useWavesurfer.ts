import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WavesurferControls {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (volume: number) => void;
  addRegion: (opts: {
    id: string;
    start: number;
    end: number;
    color: string;
    content?: string;
  }) => void;
  clearRegions: () => void;
}

export interface UseWavesurferOptions {
  container: RefObject<HTMLDivElement | null>;
  url?: string;
  placeholderDuration?: number;
}

// ---------------------------------------------------------------------------
// Minimal WAV encoder
// ---------------------------------------------------------------------------

/**
 * Encode an AudioBuffer as a 16-bit PCM WAV file and return a Blob.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;

  // Interleave channels
  const length = buffer.length;
  const interleaved = new Float32Array(length * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      interleaved[i * numChannels + ch] = channelData[i];
    }
  }

  const dataLength = interleaved.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Helper to write a string into the DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(8, "WAVE");

  // fmt chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

// ---------------------------------------------------------------------------
// Generate placeholder audio with a fake speech-like waveform
// ---------------------------------------------------------------------------

function generatePlaceholderAudio(durationSeconds: number): Blob {
  const sampleRate = 16000;
  const length = sampleRate * durationSeconds;
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
  const buffer = offlineCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate a speech-like waveform pattern:
  // alternating "word" bursts and brief silences
  const samplesPerMs = sampleRate / 1000;
  let pos = 0;

  while (pos < length) {
    // Word duration: 200–600ms
    const wordLen = Math.floor((200 + Math.random() * 400) * samplesPerMs);
    // Silence duration: 80–300ms
    const silenceLen = Math.floor((80 + Math.random() * 220) * samplesPerMs);

    // Fill word samples with modulated noise to simulate speech energy
    const wordEnd = Math.min(pos + wordLen, length);
    const baseAmplitude = 0.15 + Math.random() * 0.35;
    for (let i = pos; i < wordEnd; i++) {
      // Envelope: ramp up then ramp down within the word
      const t = (i - pos) / (wordEnd - pos);
      const envelope = Math.sin(Math.PI * t); // smooth rise/fall
      // Random noise shaped by envelope
      data[i] = (Math.random() * 2 - 1) * baseAmplitude * envelope;
    }
    pos = wordEnd;

    // Fill silence
    const silenceEnd = Math.min(pos + silenceLen, length);
    for (let i = pos; i < silenceEnd; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.005; // near-silent noise floor
    }
    pos = silenceEnd;
  }

  return audioBufferToWav(buffer);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWavesurfer(
  options: UseWavesurferOptions
): WavesurferControls {
  const { container, url, placeholderDuration = 120 } = options;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  // ------- Create / Destroy wavesurfer instance ----------------------------
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: el,
      waveColor: "#F8971D",
      progressColor: "#FFAB42",
      cursorColor: "#F7F1DB",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      plugins: [regions],
    });
    wsRef.current = ws;

    // ---- Event listeners --------------------------------------------------
    ws.on("ready", (dur: number) => {
      setIsReady(true);
      setDuration(dur);
    });

    ws.on("audioprocess", (time: number) => {
      setCurrentTime(time);
    });

    ws.on("seeking", (time: number) => {
      setCurrentTime(time);
    });

    ws.on("play", () => {
      setIsPlaying(true);
    });

    ws.on("pause", () => {
      setIsPlaying(false);
    });

    ws.on("finish", () => {
      setIsPlaying(false);
    });

    // ---- Load audio -------------------------------------------------------
    if (url) {
      void ws.load(url);
    } else {
      // Generate placeholder audio blob
      const blob = generatePlaceholderAudio(placeholderDuration);
      void ws.loadBlob(blob);
    }

    // ---- Cleanup ----------------------------------------------------------
    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, placeholderDuration]);
  // NOTE: `container` is a RefObject whose identity is stable, so it does
  // not need to be in the dependency array. The effect reads `.current` at
  // invocation time which is sufficient.

  // ------- Transport controls ----------------------------------------------

  const play = useCallback(() => {
    void wsRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    wsRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    void wsRef.current?.playPause();
  }, []);

  const seek = useCallback((timeSeconds: number) => {
    wsRef.current?.setTime(timeSeconds);
  }, []);

  const setVolume = useCallback((volume: number) => {
    wsRef.current?.setVolume(volume);
  }, []);

  // ------- Region controls -------------------------------------------------

  const addRegion = useCallback(
    (opts: {
      id: string;
      start: number;
      end: number;
      color: string;
      content?: string;
    }) => {
      regionsRef.current?.addRegion({
        id: opts.id,
        start: opts.start,
        end: opts.end,
        color: opts.color,
        content: opts.content,
        drag: false,
        resize: false,
      });
    },
    []
  );

  const clearRegions = useCallback(() => {
    regionsRef.current?.clearRegions();
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    addRegion,
    clearRegions,
  };
}

export default useWavesurfer;
