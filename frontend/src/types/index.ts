export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  url: string;      // The actual source audio URL or YouTube ID
  duration: number; // in seconds
  lyrics?: string;
  quote?: string;
}
