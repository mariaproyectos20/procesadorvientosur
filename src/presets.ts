import type { ProcessorState, Preset, BandSettings } from './types';

const band3: BandSettings[] = [
  { name: 'Graves', freqLow: 20, freqHigh: 200, threshold: -20, ratio: 3, attack: 15, release: 200, gain: 2, enabled: true },
  { name: 'Medios', freqLow: 200, freqHigh: 3500, threshold: -18, ratio: 2.5, attack: 10, release: 150, gain: 0, enabled: true },
  { name: 'Agudos', freqLow: 3500, freqHigh: 15000, threshold: -22, ratio: 3, attack: 5, release: 100, gain: 1.5, enabled: true },
];

const band5: BandSettings[] = [
  { name: 'Sub-Graves', freqLow: 20, freqHigh: 80, threshold: -22, ratio: 4, attack: 20, release: 250, gain: 1, enabled: true },
  { name: 'Graves', freqLow: 80, freqHigh: 350, threshold: -20, ratio: 3, attack: 15, release: 200, gain: 2, enabled: true },
  { name: 'Medios Bajos', freqLow: 350, freqHigh: 1500, threshold: -18, ratio: 2.5, attack: 10, release: 150, gain: 0, enabled: true },
  { name: 'Medios Altos', freqLow: 1500, freqHigh: 5000, threshold: -19, ratio: 2.5, attack: 8, release: 120, gain: 0.5, enabled: true },
  { name: 'Agudos', freqLow: 5000, freqHigh: 15000, threshold: -22, ratio: 3, attack: 5, release: 100, gain: 1.5, enabled: true },
];

export function getBands(count: 3 | 5): BandSettings[] {
  return (count === 3 ? band3 : band5).map((b) => ({ ...b }));
}

function makeState(partial: Partial<ProcessorState>): ProcessorState {
  return {
    agc: { enabled: true, targetLevel: -10, ratio: 4, attack: 5, release: 200, threshold: -25, makeupGain: 3 },
    multiband: { enabled: true, bandCount: 5, bands: getBands(5), linkage: 60 },
    preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -5, hfLimitEnabled: true },
    clipper: { enabled: true, ceiling: -1, overshootCompensation: true },
    stereoMPX: { stereoEnabled: true, pilotLevel: 9, pilotFrequency: 19000, separation: 55, lowPassCutoff: 15000, lowPassEnabled: true },
    io: { sampleRate: '96kHz', analogInputGain: 0, analogOutputGain: 0, aesEbuOutput: true, mpxOutput1: true, mpxOutput2: true, aoipProtocol: 'AES67' },
    regulatory: { bs412Enabled: true, bs412Level: 75, rdsEnabled: false, rdsText: 'RADIO FM 101.5', rdsMode: 'internal' },
    monitor: { latencyMode: 'low', headphoneMonitor: true },
    ...partial,
  };
}

export const defaultState: ProcessorState = makeState({});

export const presets: Preset[] = [
  {
    id: 'pop',
    name: 'Pop',
    description: 'Brillante, denso y competitivo. Ideal para música pop comercial.',
    icon: 'Sparkles',
    state: makeState({
      agc: { enabled: true, targetLevel: -8, ratio: 5, attack: 3, release: 150, threshold: -25, makeupGain: 5 },
      multiband: { enabled: true, bandCount: 5, bands: getBands(5), linkage: 50 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -4, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -0.5, overshootCompensation: true },
    }),
  },
  {
    id: 'rock',
    name: 'Rock',
    description: 'Graves potentes y medios densos. Cuerpo y energía para guitarra y batería.',
    icon: 'Guitar',
    state: makeState({
      agc: { enabled: true, targetLevel: -12, ratio: 6, attack: 5, release: 250, threshold: -28, makeupGain: 4 },
      multiband: { enabled: true, bandCount: 5, bands: getBands(5), linkage: 70 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -3, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -1, overshootCompensation: true },
    }),
  },
  {
    id: 'news',
    name: 'Noticias',
    description: 'Voz clara e inteligible. Compresión suave con máxima claridad vocal.',
    icon: 'Mic',
    state: makeState({
      agc: { enabled: true, targetLevel: -6, ratio: 8, attack: 2, release: 100, threshold: -30, makeupGain: 6 },
      multiband: { enabled: true, bandCount: 3, bands: getBands(3), linkage: 80 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -2, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -1.5, overshootCompensation: true },
    }),
  },
  {
    id: 'jazz',
    name: 'Jazz',
    description: 'Dinámica natural y transparencia. Procesamiento mínimo y fiel.',
    icon: 'Music',
    state: makeState({
      agc: { enabled: true, targetLevel: -14, ratio: 2, attack: 10, release: 400, threshold: -22, makeupGain: 1 },
      multiband: { enabled: true, bandCount: 3, bands: getBands(3), linkage: 30 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -6, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -2, overshootCompensation: true },
    }),
  },
  {
    id: 'dance',
    name: 'Dance',
    description: 'Maximización de loudness para EDM. Bomba de graves y agudos cristalinos.',
    icon: 'Radio',
    state: makeState({
      agc: { enabled: true, targetLevel: -6, ratio: 6, attack: 2, release: 100, threshold: -28, makeupGain: 6 },
      multiband: { enabled: true, bandCount: 5, bands: getBands(5), linkage: 45 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -3, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -0.3, overshootCompensation: true },
    }),
  },
  {
    id: 'classical',
    name: 'Clásica',
    description: 'Rango dinámico amplio. Procesamiento transparente para música clásica.',
    icon: 'Library',
    state: makeState({
      agc: { enabled: true, targetLevel: -16, ratio: 2, attack: 20, release: 500, threshold: -20, makeupGain: 0 },
      multiband: { enabled: true, bandCount: 3, bands: getBands(3), linkage: 20 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -8, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -2.5, overshootCompensation: true },
    }),
  },
  {
    id: 'capital-urbana',
    name: 'Capital Urbana',
    description: 'Sonido FM moderno y contundente para una radio urbana de gran ciudad.',
    icon: 'Building2',
    state: makeState({
      agc: { enabled: true, targetLevel: -7, ratio: 5.5, attack: 3, release: 140, threshold: -27, makeupGain: 5 },
      multiband: { enabled: true, bandCount: 5, bands: getBands(5), linkage: 55 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -3.5, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -0.6, overshootCompensation: true },
      stereoMPX: { stereoEnabled: true, pilotLevel: 9, pilotFrequency: 19000, separation: 58, lowPassCutoff: 15000, lowPassEnabled: true },
      regulatory: { bs412Enabled: true, bs412Level: 75, rdsEnabled: true, rdsText: 'VIENTO SUR FM', rdsMode: 'internal' },
    }),
  },
  {
    id: 'metropolitana-voz',
    name: 'Metropolitana Voz',
    description: 'Voz presente y clara para informativos, magazines y conducción en vivo.',
    icon: 'Landmark',
    state: makeState({
      agc: { enabled: true, targetLevel: -8, ratio: 7, attack: 2, release: 110, threshold: -29, makeupGain: 6 },
      multiband: { enabled: true, bandCount: 3, bands: getBands(3), linkage: 75 },
      preEmphasis: { enabled: true, standard: '50us', hfLimitThreshold: -2.5, hfLimitEnabled: true },
      clipper: { enabled: true, ceiling: -1, overshootCompensation: true },
      stereoMPX: { stereoEnabled: true, pilotLevel: 9, pilotFrequency: 19000, separation: 55, lowPassCutoff: 15000, lowPassEnabled: true },
      regulatory: { bs412Enabled: true, bs412Level: 75, rdsEnabled: true, rdsText: 'VIENTO SUR FM - EN VIVO', rdsMode: 'internal' },
    }),
  },
];
