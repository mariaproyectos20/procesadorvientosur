import { useRef, useCallback, useEffect, useState } from 'react';
import type { ProcessorState } from './types';

export interface AudioLevels {
  inputL: number;
  inputR: number;
  outputL: number;
  outputR: number;
  agcGainReduction: number;
  bandGainReductions: number[];
  mpxDeviation: number;
  pilotActive: boolean;
  spectrum: Uint8Array;
  waveformData: number[];
  isPlaying: boolean;
}

export interface PadPlaybackState {
  fileName: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
}

export interface LibraryPlaybackState {
  fileName: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  ended: boolean;
}

const SPECTRUM_BINS = 128;
const WAVEFORM_POINTS = 200;

export function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const agcNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const preEmphasisFilterRef = useRef<BiquadFilterNode | null>(null);
  const hfLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const masterClipperRef = useRef<DynamicsCompressorNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const inputBusRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const bandFiltersRef = useRef<BiquadFilterNode[]>([]);
  const bandCompressorsRef = useRef<DynamicsCompressorNode[]>([]);
  const bandGainsRef = useRef<GainNode[]>([]);
  const mediaElementRef = useRef<HTMLAudioElement | null>(null);
  const padAudioRefs = useRef<Array<HTMLAudioElement | null>>([null, null]);
  const padSourceRefs = useRef<Array<MediaElementAudioSourceNode | null>>([null, null]);
  const padUrlRefs = useRef<Array<string | null>>([null, null]);
  const streamRef = useRef<MediaStream | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const [levels, setLevels] = useState<AudioLevels>({
    inputL: -60,
    inputR: -60,
    outputL: -60,
    outputR: -60,
    agcGainReduction: 0,
    bandGainReductions: [],
    mpxDeviation: 0,
    pilotActive: false,
    spectrum: new Uint8Array(SPECTRUM_BINS),
    waveformData: new Array(WAVEFORM_POINTS).fill(0.5),
    isPlaying: false,
  });
  const [padPlayback, setPadPlayback] = useState<PadPlaybackState[]>([
    { fileName: null, isPlaying: false, isPaused: false, currentTime: 0, duration: 0 },
    { fileName: null, isPlaying: false, isPaused: false, currentTime: 0, duration: 0 },
  ]);
  const [libraryPlayback, setLibraryPlayback] = useState<LibraryPlaybackState>({
    fileName: null,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    ended: false,
  });

  const rafRef = useRef<number | null>(null);

  const ensureContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 48000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const buildChain = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Disconnect old
    try {
      sourceRef.current?.disconnect();
      padSourceRefs.current.forEach((source) => source?.disconnect());
      inputBusRef.current?.disconnect();
      bandFiltersRef.current.forEach((n) => n.disconnect());
      bandCompressorsRef.current.forEach((n) => n.disconnect());
      bandGainsRef.current.forEach((n) => n.disconnect());
      agcNodeRef.current?.disconnect();
      preEmphasisFilterRef.current?.disconnect();
      hfLimiterRef.current?.disconnect();
      masterClipperRef.current?.disconnect();
      outputGainRef.current?.disconnect();
    } catch {
      // ignore
    }

    // Input analyser
    const inputAnalyser = ctx.createAnalyser();
    inputAnalyser.fftSize = 256;
    inputAnalyserRef.current = inputAnalyser;

    const inputBus = ctx.createGain();
    inputBusRef.current = inputBus;

    // AGC (compressor acting as AGC)
    const agc = ctx.createDynamicsCompressor();
    agcNodeRef.current = agc;

    // Pre-emphasis (highshelf boost)
    const preEmph = ctx.createBiquadFilter();
    preEmph.type = 'highshelf';
    preEmph.frequency.value = 1000;
    preEmphasisFilterRef.current = preEmph;

    // HF Limiter
    const hfLimiter = ctx.createDynamicsCompressor();
    hfLimiterRef.current = hfLimiter;

    // Output analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current = analyser;

    // Master clipper
    const clipper = ctx.createDynamicsCompressor();
    masterClipperRef.current = clipper;

    // Output gain
    const outGain = ctx.createGain();
    outGain.gain.value = 1;
    outputGainRef.current = outGain;

    // Mix primary input and both pad panels before the shared processing chain.
    if (sourceRef.current) {
      sourceRef.current.connect(inputBus);
    }
    padSourceRefs.current.forEach((source) => source?.connect(inputBus));
    inputBus.connect(inputAnalyser);
    inputAnalyser.connect(agc);
    agc.connect(preEmph);
    preEmph.connect(hfLimiter);
    hfLimiter.connect(clipper);
    clipper.connect(outGain);
    outGain.connect(analyser);
    analyser.connect(ctx.destination);
  }, []);

  const applyState = useCallback((state: ProcessorState) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // AGC
    if (agcNodeRef.current) {
      const agc = agcNodeRef.current;
      if (state.agc.enabled) {
        agc.threshold.value = state.agc.threshold;
        agc.ratio.value = state.agc.ratio;
        agc.attack.value = state.agc.attack / 1000;
        agc.release.value = state.agc.release / 1000;
        agc.knee.value = 10;
      } else {
        agc.ratio.value = 1;
        agc.threshold.value = 0;
      }
    }

    // Pre-emphasis
    if (preEmphasisFilterRef.current) {
      const pe = preEmphasisFilterRef.current;
      if (state.preEmphasis.enabled) {
        // 50µs or 75µs — modeled as highshelf gain
        const boost = state.preEmphasis.standard === '50us' ? 6 : 8;
        pe.gain.value = boost;
      } else {
        pe.gain.value = 0;
      }
    }

    // HF Limiter
    if (hfLimiterRef.current) {
      const hfl = hfLimiterRef.current;
      if (state.preEmphasis.hfLimitEnabled) {
        hfl.threshold.value = state.preEmphasis.hfLimitThreshold;
        hfl.ratio.value = 10;
        hfl.attack.value = 0.001;
        hfl.release.value = 0.05;
        hfl.knee.value = 0;
      } else {
        hfl.ratio.value = 1;
      }
    }

    // Master clipper
    if (masterClipperRef.current) {
      const clip = masterClipperRef.current;
      if (state.clipper.enabled) {
        clip.threshold.value = state.clipper.ceiling;
        clip.ratio.value = 20;
        clip.attack.value = 0.0001;
        clip.release.value = 0.01;
        clip.knee.value = 0;
      } else {
        clip.ratio.value = 1;
      }
    }

    // Output gain
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = Math.pow(10, state.io.analogOutputGain / 20);
    }
  }, []);

  const updateLevels = useCallback(() => {
    const ctx = audioCtxRef.current;
    const inputAnalyser = inputAnalyserRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !inputAnalyser || !analyser) {
      rafRef.current = requestAnimationFrame(updateLevels);
      return;
    }

    const inputFreqData = new Uint8Array(inputAnalyser.frequencyBinCount);
    inputAnalyser.getByteFrequencyData(inputFreqData);
    const inputAvg = inputFreqData.reduce((a, b) => a + b, 0) / inputFreqData.length;
    const inputDb = inputAvg > 0 ? 20 * Math.log10(inputAvg / 255) : -60;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const outputAvg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
    const outputDb = outputAvg > 0 ? 20 * Math.log10(outputAvg / 255) : -60;

    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeData);
    const waveform: number[] = [];
    const step = Math.floor(timeData.length / WAVEFORM_POINTS);
    for (let i = 0; i < WAVEFORM_POINTS; i++) {
      waveform.push(timeData[i * step] / 255);
    }

    // Spectrum for display
    const spectrum = new Uint8Array(SPECTRUM_BINS);
    const spectrumStep = Math.floor(freqData.length / SPECTRUM_BINS);
    for (let i = 0; i < SPECTRUM_BINS; i++) {
      spectrum[i] = freqData[i * spectrumStep] || 0;
    }

    const mpxDev = Math.min(100, Math.max(0, (outputDb + 60) * 1.8));

    setLevels((prev) => ({
      ...prev,
      inputL: inputDb,
      inputR: inputDb - 1,
      outputL: outputDb,
      outputR: outputDb - 0.5,
      mpxDeviation: mpxDev,
      pilotActive: true,
      spectrum,
      waveformData: waveform,
    }));

    setPadPlayback((prev) => prev.map((pad, index) => {
      const audio = padAudioRefs.current[index];
      if (!audio) return pad;
      return {
        ...pad,
        isPlaying: !audio.paused && !audio.ended,
        isPaused: audio.paused && audio.currentTime > 0 && !audio.ended,
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : pad.duration,
      };
    }));

    const libraryAudio = mediaElementRef.current;
    if (libraryAudio) {
      setLibraryPlayback((prev) => ({
        ...prev,
        isPlaying: !libraryAudio.paused && !libraryAudio.ended,
        isPaused: libraryAudio.paused && libraryAudio.currentTime > 0 && !libraryAudio.ended,
        currentTime: libraryAudio.currentTime,
        duration: Number.isFinite(libraryAudio.duration) ? libraryAudio.duration : prev.duration,
      }));
    }

    rafRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const startLevelLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateLevels);
  }, [updateLevels]);

  const stopPrimary = useCallback(() => {
    if (mediaElementRef.current) {
      mediaElementRef.current.pause();
      mediaElementRef.current.currentTime = 0;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {
        // ignore
      }
      oscRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }
    setLibraryPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0, ended: false }));
  }, []);

  const stopAll = useCallback(() => {
    stopPrimary();
    padAudioRefs.current.forEach((audio, index) => {
      audio?.pause();
      padSourceRefs.current[index]?.disconnect();
      const url = padUrlRefs.current[index];
      if (url) URL.revokeObjectURL(url);
      padAudioRefs.current[index] = null;
      padSourceRefs.current[index] = null;
      padUrlRefs.current[index] = null;
    });
    setPadPlayback([
      { fileName: null, isPlaying: false, isPaused: false, currentTime: 0, duration: 0 },
      { fileName: null, isPlaying: false, isPaused: false, currentTime: 0, duration: 0 },
    ]);
  }, [stopPrimary]);

  const stopPad = useCallback((panelIndex: number) => {
    const audio = padAudioRefs.current[panelIndex];
    audio?.pause();
    if (audio) audio.currentTime = 0;
    setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
      ? { ...pad, isPlaying: false, isPaused: false, currentTime: 0 }
      : pad));
  }, []);

  const pausePad = useCallback((panelIndex: number) => {
    const audio = padAudioRefs.current[panelIndex];
    if (!audio) return;
    audio.pause();
    setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
      ? { ...pad, isPlaying: false, isPaused: audio.currentTime > 0 }
      : pad));
  }, []);

  const resumePad = useCallback((panelIndex: number) => {
    const audio = padAudioRefs.current[panelIndex];
    if (!audio) return;
    audio.play();
    setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
      ? { ...pad, isPlaying: true, isPaused: false }
      : pad));
  }, []);

  const seekPad = useCallback((panelIndex: number, time: number) => {
    const audio = padAudioRefs.current[panelIndex];
    if (audio) audio.currentTime = time;
  }, []);

  const loadFile = useCallback(
    (file: File, state: ProcessorState) => {
      const ctx = ensureContext();
      stopAll();

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.loop = false;
      audio.volume = libraryPlayback.volume;
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        setLibraryPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0, ended: true }));
      }, { once: true });
      mediaElementRef.current = audio;

      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;

      buildChain();
      applyState(state);
      audio.play();
      startLevelLoop();
      setLibraryPlayback((prev) => ({ ...prev, fileName: file.name, isPlaying: true, isPaused: false, currentTime: 0, duration: 0, ended: false }));
      setLevels((prev) => ({ ...prev, isPlaying: true }));
    },
    [ensureContext, stopAll, buildChain, applyState, startLevelLoop, libraryPlayback.volume]
  );

  const setLibraryVolume = useCallback((volume: number) => {
    const nextVolume = Math.max(0, Math.min(1, volume));
    if (mediaElementRef.current) mediaElementRef.current.volume = nextVolume;
    setLibraryPlayback((prev) => ({ ...prev, volume: nextVolume, muted: nextVolume === 0 }));
  }, []);

  const toggleLibraryMute = useCallback(() => {
    const audio = mediaElementRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setLibraryPlayback((prev) => ({ ...prev, muted: audio.muted }));
  }, []);

  const nudgeLibrary = useCallback((seconds: number) => {
    const audio = mediaElementRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + seconds));
  }, []);

  const pauseLibrary = useCallback(() => {
    const audio = mediaElementRef.current;
    if (!audio) return;
    audio.pause();
    setLibraryPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: audio.currentTime > 0 }));
  }, []);

  const resumeLibrary = useCallback(() => {
    const audio = mediaElementRef.current;
    if (!audio) return;
    if (audio.ended) audio.currentTime = 0;
    void audio.play();
    setLibraryPlayback((prev) => ({ ...prev, isPlaying: true, isPaused: false, ended: false }));
  }, []);

  const seekLibrary = useCallback((time: number) => {
    if (mediaElementRef.current) mediaElementRef.current.currentTime = time;
  }, []);

  const stopLibrary = useCallback(() => {
    stopPrimary();
    setLevels((prev) => ({ ...prev, isPlaying: false }));
  }, [stopPrimary]);

  const playPad = useCallback(
    (file: File, state: ProcessorState, panelIndex: number) => {
      const ctx = ensureContext();

      const currentAudio = padAudioRefs.current[panelIndex];
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        const anotherPadIsPlaying = padAudioRefs.current.some((pad) => pad && !pad.paused);
        setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
          ? { ...pad, isPlaying: false, isPaused: false, currentTime: 0 }
          : pad));
        setLevels((prev) => ({ ...prev, isPlaying: anotherPadIsPlaying }));
        return;
      }

      stopPrimary();

      padAudioRefs.current[panelIndex]?.pause();
      padSourceRefs.current[panelIndex]?.disconnect();
      if (padUrlRefs.current[panelIndex]) URL.revokeObjectURL(padUrlRefs.current[panelIndex] as string);

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.loop = false;
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        padAudioRefs.current[panelIndex] = null;
        padSourceRefs.current[panelIndex] = null;
        padUrlRefs.current[panelIndex] = null;
        setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
          ? { ...pad, isPlaying: false, isPaused: false, currentTime: 0 }
          : pad));
        const anotherPadIsPlaying = padAudioRefs.current.some((pad) => pad && !pad.paused);
        setLevels((prev) => ({ ...prev, isPlaying: anotherPadIsPlaying }));
      }, { once: true });

      const source = ctx.createMediaElementSource(audio);
      padAudioRefs.current[panelIndex] = audio;
      padSourceRefs.current[panelIndex] = source;
      padUrlRefs.current[panelIndex] = url;

      if (!inputAnalyserRef.current) buildChain();
      else source.connect(inputBusRef.current as GainNode);
      applyState(state);
      audio.play();
      startLevelLoop();
      setPadPlayback((prev) => prev.map((pad, index) => index === panelIndex
        ? { fileName: file.name, isPlaying: true, isPaused: false, currentTime: 0, duration: 0 }
        : pad));
      setLevels((prev) => ({ ...prev, isPlaying: true }));
    },
    [ensureContext, stopPrimary, buildChain, applyState, startLevelLoop]
  );

  const startMic = useCallback(
    async (state: ProcessorState) => {
      const ctx = ensureContext();
      stopAll();

      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('El navegador no ofrece captura de audio');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        buildChain();
        applyState(state);
        startLevelLoop();
        setLevels((prev) => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.error('No se pudo iniciar el micrófono', error);
        setLevels((prev) => ({ ...prev, isPlaying: false }));
      }
    },
    [ensureContext, stopAll, buildChain, applyState, startLevelLoop]
  );

  const startTone = useCallback(
    (state: ProcessorState) => {
      const ctx = ensureContext();
      stopAll();

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 440;
      oscRef.current = osc;

      // Add a gain to make tone audible but not too loud
      const gain = ctx.createGain();
      gain.gain.value = 0.15;

      osc.connect(gain);
      sourceRef.current = gain;

      buildChain();
      applyState(state);
      osc.start();
      startLevelLoop();
      setLevels((prev) => ({ ...prev, isPlaying: true }));
    },
    [ensureContext, stopAll, buildChain, applyState, startLevelLoop]
  );

  const stop = useCallback(() => {
    stopAll();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setLevels((prev) => ({
      ...prev,
      isPlaying: false,
      inputL: -60,
      inputR: -60,
      outputL: -60,
      outputR: -60,
      mpxDeviation: 0,
      waveformData: new Array(WAVEFORM_POINTS).fill(0.5),
      spectrum: new Uint8Array(SPECTRUM_BINS),
    }));
  }, [stopAll]);

  useEffect(() => {
    return () => {
      stopAll();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [stopAll]);

  return { levels, padPlayback, libraryPlayback, loadFile, pauseLibrary, resumeLibrary, seekLibrary, stopLibrary, setLibraryVolume, toggleLibraryMute, nudgeLibrary, playPad, pausePad, resumePad, seekPad, stopPad, startMic, startTone, stop, applyState, ensureContext };
}
