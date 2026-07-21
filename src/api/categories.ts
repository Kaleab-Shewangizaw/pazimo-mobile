import { getData } from '@/api/client';
import type { Category } from '@/types/api';

/**
 * Public and unpaginated — always returns every category sorted by name.
 * `isPublished` exists on the model but is not used as a filter server-side.
 */
export function fetchCategories(): Promise<Category[]> {
  return getData<Category[]>('/categories');
}
