import { useQuery } from '@tanstack/react-query';

import { fetchPublishedRsvpForms, fetchRsvpForm } from '@/api/rsvp';
import { queryKeys } from '@/queries/keys';

/** The Home rail's feed — published `type:"rsvp"` forms, newest/featured first per the server. */
export function useRsvpFeed(limit = 6) {
  const query = useQuery({
    queryKey: queryKeys.rsvp.forms(),
    queryFn: () => fetchPublishedRsvpForms(limit),
  });
  return { ...query, forms: query.data ?? [] };
}

export function useRsvpForm(publicId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rsvp.form(publicId ?? ''),
    queryFn: () => fetchRsvpForm(publicId!),
    enabled: Boolean(publicId),
  });
}
