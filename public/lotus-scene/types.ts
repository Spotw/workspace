export type CameraPresetId = 'photo_match' | 'golden_lotus' | 'pavilion' | 'rockery' | 'wide_panoramic' | 'moon_view';

export type LightingMoodId = 'mystic_night' | 'golden_moon' | 'twilight_dusk';

export interface CameraPreset {
  id: CameraPresetId;
  name: string;
  vietnameseName: string;
  position: [number, number, number];
  target: [number, number, number];
  description: string;
}

export interface LightingMood {
  id: LightingMoodId;
  name: string;
  vietnameseName: string;
  moonColor: string;
  skyTopColor: string;
  skyBottomColor: string;
  lotusGlowIntensity: number;
  lanternIntensity: number;
  ambientIntensity: number;
}

export interface SceneConfig {
  preset: CameraPresetId;
  mood: LightingMoodId;
  lotusGlowMultiplier: number;
  waterRippleSpeed: number;
  fireflyCount: number;
  showLanternGlow: boolean;
  enableAudio: boolean;
  audioVolume: number;
  autoRotate: boolean;
}
