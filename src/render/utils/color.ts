export const modeColor = (mode: string) => ({
  liquid: '#b7fbff', rainfall: '#6fb9ff', heatmap: '#ff4f8b', infrared: '#38ffbc',
  sparkles: '#ffd8fb', voxel: '#89ff67', neon: '#7b5cff', glitch: '#ff285f', matrix: '#35ff77', chaos: '#ffffff'
}[mode] ?? '#ffffff');
