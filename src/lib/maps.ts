import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

/**
 * Where a place is, and how to get someone there.
 *
 * Cinemas and refill venues always carry a `locationUrl` (the owner pastes a
 * Google Maps link — the backend refuses to save one without it); events
 * only sometimes. So "Directions" resolves in order of how exact it is:
 *
 *   1. the place's own map link      — exactly the pin the owner chose
 *   2. its coordinates               — still exact, just not hand-picked
 *   3. a search for its address      — Google Maps finds the best match
 *
 * Anything with an address therefore gets working directions, link or not.
 */

export type Place = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  locationUrl?: string | null;
  /** GeoJSON order: [longitude, latitude]. */
  coordinates?: [number, number] | null;
};

const GOOGLE_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

/** `[0, 0]` is what an unset GeoJSON point defaults to — not a real place anyone means. */
function usableCoordinates(coordinates: Place['coordinates']): coordinates is [number, number] {
  if (!coordinates || coordinates.length !== 2) return false;
  const [lng, lat] = coordinates;
  return Number.isFinite(lng) && Number.isFinite(lat) && !(lng === 0 && lat === 0);
}

/** "Bole Road, Addis Ababa" — whatever of the address the place has. */
export function placeAddress(place: Place): string {
  return [place.address, place.city, place.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(', ');
}

/** The link "Directions" opens, or `null` when there's nothing to go on. */
export function directionsUrl(place: Place): string | null {
  if (place.locationUrl?.trim()) return place.locationUrl.trim();
  if (usableCoordinates(place.coordinates)) {
    const [lng, lat] = place.coordinates;
    return `${GOOGLE_SEARCH}${lat},${lng}`;
  }
  const query = [place.name, placeAddress(place)].filter(Boolean).join(', ');
  return placeAddress(place) ? `${GOOGLE_SEARCH}${encodeURIComponent(query)}` : null;
}

/** True when the destination is the owner's own pin, not a best-guess search. */
export function hasExactLocation(place: Place): boolean {
  return Boolean(place.locationUrl?.trim()) || usableCoordinates(place.coordinates);
}

/**
 * Opens the map. Handed straight to the OS rather than an in-app browser:
 * a Google Maps link is an App Link / Universal Link, so it opens the Maps
 * app itself when it's installed — where turn-by-turn directions actually
 * live — and the web map otherwise.
 */
export async function openDirections(place: Place): Promise<boolean> {
  const url = directionsUrl(place);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Copies the map link (or, without one, the address) for pasting into a chat. */
export async function copyLocation(place: Place): Promise<boolean> {
  const text = place.locationUrl?.trim() || placeAddress(place);
  if (!text) return false;
  await Clipboard.setStringAsync(text);
  return true;
}
