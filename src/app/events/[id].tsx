import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Alias for the public web URL shape — pazimo.com's own site serves events at
 * `/events/:id` (plural, confirmed against the live site), while this app's
 * route is `/event/:id` (singular). A tapped Universal/App Link for
 * `https://pazimo.com/events/...` lands here first; this just bounces it to
 * the real screen.
 */
export default function EventsRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/event/${id}`} />;
}
