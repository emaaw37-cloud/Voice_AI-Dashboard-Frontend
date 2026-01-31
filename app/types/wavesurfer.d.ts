declare module "wavesurfer.js" {
  interface WaveSurferOptions {
    container: string | HTMLElement;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    barWidth?: number;
    barGap?: number;
    height?: number;
    responsive?: boolean;
    url?: string;
  }

  interface WaveSurferInstance {
    play: () => void;
    pause: () => void;
    seekTo: (progress: number) => void;
    setPlaybackRate: (rate: number) => void;
    getDuration: () => number;
    getCurrentTime: () => number;
    destroy: () => void;
    on: (event: string, callback: (t?: number) => void) => void;
  }

  export function create(options: WaveSurferOptions): WaveSurferInstance;
  const WaveSurfer: { create: typeof create };
  export default WaveSurfer;
}
