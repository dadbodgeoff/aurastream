/**
 * Audio UI Components
 *
 * Audio visualization and reactivity mapping components.
 *
 * @module ui/audio
 */

export { AudioUploader } from './AudioUploader';
export type { AudioUploaderProps, AudioFileInfo } from './AudioUploader';

export { WaveformDisplay } from './WaveformDisplay';
export type { WaveformDisplayProps } from './WaveformDisplay';

export { FrequencyBands, FrequencyBandsCompact } from './FrequencyBands';
export type { FrequencyBandsProps, FrequencyBandsCompactProps } from './FrequencyBands';

export { BeatMarkers, BeatCounter } from './BeatMarkers';
export type { BeatMarkersProps, BeatCounterProps } from './BeatMarkers';

export { ReactivityMapper } from './ReactivityMapper';
export type { ReactivityMapperProps } from './ReactivityMapper';
