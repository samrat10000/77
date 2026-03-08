export interface PlaybackState {
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
}

export interface JamSessionState extends PlaybackState {
  hostId: string;
  participants: string[];
  lastUpdated: number;
}
