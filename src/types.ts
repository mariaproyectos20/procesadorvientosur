export type PreEmphasisStandard = '50us' | '75us';
export type SampleRate = '48kHz' | '96kHz';
export type BandCount = 3 | 5;
export type AudioSourceType = 'mic' | 'tone' | 'pad' | 'none';

export interface AGCSettings {
  enabled: boolean;
  targetLevel: number; // dB
  ratio: number; // 1:1 to 20:1
  attack: number; // ms
  release: number; // ms
  threshold: number; // dB
  makeupGain: number; // dB
}

export interface BandSettings {
  name: string;
  freqLow: number; // Hz
  freqHigh: number; // Hz
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  gain: number; // dB
  enabled: boolean;
}

export interface MultibandSettings {
  enabled: boolean;
  bandCount: BandCount;
  bands: BandSettings[];
  linkage: number; // 0-100%
}

export interface PreEmphasisSettings {
  enabled: boolean;
  standard: PreEmphasisStandard;
  hfLimitThreshold: number; // dB
  hfLimitEnabled: boolean;
}

export interface ClipperSettings {
  enabled: boolean;
  ceiling: number; // dB (modulation ceiling)
  overshootCompensation: boolean;
}

export interface StereoMPXSettings {
  stereoEnabled: boolean;
  pilotLevel: number; // % (typically 8-10%)
  pilotFrequency: number; // Hz (19 kHz)
  separation: number; // dB
  lowPassCutoff: number; // Hz (15 kHz)
  lowPassEnabled: boolean;
}

export interface IOSettings {
  sampleRate: SampleRate;
  analogInputGain: number; // dB
  analogOutputGain: number; // dB
  aesEbuOutput: boolean;
  mpxOutput1: boolean;
  mpxOutput2: boolean;
  aoipProtocol: 'AES67' | 'Livewire' | 'Dante' | 'Ravenna' | 'Off';
}

export interface RegulatorySettings {
  bs412Enabled: boolean;
  bs412Level: number; // dB deviation limit
  rdsEnabled: boolean;
  rdsText: string;
  rdsMode: 'passthrough' | 'internal';
}

export interface MonitorSettings {
  latencyMode: 'ultra' | 'low' | 'high';
  headphoneMonitor: boolean;
}

export interface ProcessorState {
  agc: AGCSettings;
  multiband: MultibandSettings;
  preEmphasis: PreEmphasisSettings;
  clipper: ClipperSettings;
  stereoMPX: StereoMPXSettings;
  io: IOSettings;
  regulatory: RegulatorySettings;
  monitor: MonitorSettings;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  state: ProcessorState;
}

export interface MeterLevels {
  inputL: number;
  inputR: number;
  outputL: number;
  outputR: number;
  agcGain: number;
  bandGains: number[];
  mpxDeviation: number;
  pilotActive: boolean;
}
