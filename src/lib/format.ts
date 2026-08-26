export function spotifyTrackUrl(trackUri: string): string | null {
  const id = trackUri.split(":")[2];
  return id ? `https://open.spotify.com/track/${id}` : null;
}

export function spotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function artistPageUrl(artistName: string): string {
  return `/artists/${encodeURIComponent(artistName)}`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours.toLocaleString()} hr ${minutes} min`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
