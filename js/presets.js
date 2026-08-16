// 流璃 FlowGlass — 內建預設漸層桌布
// bright: true 表示亮色系(自動改用深色文字)
export const PRESETS = [
  {
    id: 'aurora',
    nameKey: 'p.aurora',
    accent: '#6ee7c8',
    bright: false,
    css: `radial-gradient(at 15% 20%, rgba(64, 224, 178, .55) 0, transparent 52%),
          radial-gradient(at 80% 12%, rgba(96, 130, 255, .5) 0, transparent 50%),
          radial-gradient(at 68% 88%, rgba(150, 84, 255, .42) 0, transparent 55%),
          linear-gradient(160deg, #071528 0%, #0b2137 55%, #0a1626 100%)`,
  },
  {
    id: 'dusk',
    nameKey: 'p.dusk',
    accent: '#ffab7a',
    bright: false,
    css: `radial-gradient(at 22% 78%, rgba(255, 122, 89, .5) 0, transparent 55%),
          radial-gradient(at 82% 22%, rgba(255, 170, 90, .38) 0, transparent 50%),
          radial-gradient(at 55% 45%, rgba(190, 80, 140, .34) 0, transparent 60%),
          linear-gradient(200deg, #241033 0%, #3a1631 55%, #1c0d24 100%)`,
  },
  {
    id: 'ocean',
    nameKey: 'p.ocean',
    accent: '#67c8ff',
    bright: false,
    css: `radial-gradient(at 30% 25%, rgba(56, 150, 255, .45) 0, transparent 55%),
          radial-gradient(at 78% 70%, rgba(38, 210, 220, .35) 0, transparent 50%),
          linear-gradient(180deg, #05182e 0%, #073050 60%, #04121f 100%)`,
  },
  {
    id: 'neon',
    nameKey: 'p.neon',
    accent: '#ff7ad0',
    bright: false,
    css: `radial-gradient(at 20% 30%, rgba(255, 60, 172, .42) 0, transparent 50%),
          radial-gradient(at 78% 25%, rgba(120, 80, 255, .46) 0, transparent 52%),
          radial-gradient(at 60% 85%, rgba(0, 200, 255, .35) 0, transparent 55%),
          linear-gradient(150deg, #140a26 0%, #1d0f33 60%, #0d0819 100%)`,
  },
  {
    id: 'mist',
    nameKey: 'p.mist',
    accent: '#5a8fd6',
    bright: true,
    css: `radial-gradient(at 25% 30%, rgba(255, 255, 255, .75) 0, transparent 55%),
          radial-gradient(at 80% 65%, rgba(173, 205, 255, .6) 0, transparent 55%),
          linear-gradient(165deg, #e8eef7 0%, #cdd9ec 55%, #b8c8e0 100%)`,
  },
  {
    id: 'graphite',
    nameKey: 'p.graphite',
    accent: '#9fb3c8',
    bright: false,
    css: `radial-gradient(at 30% 20%, rgba(120, 135, 155, .3) 0, transparent 55%),
          radial-gradient(at 75% 80%, rgba(70, 85, 105, .35) 0, transparent 55%),
          linear-gradient(170deg, #191d24 0%, #23282f 55%, #14171c 100%)`,
  },
];

export function getPreset(id) {
  return PRESETS.find(p => p.id === id) || PRESETS[0];
}
