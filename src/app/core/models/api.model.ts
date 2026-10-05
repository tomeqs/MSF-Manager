/**
 * Envelope used by every MSF API response: `{ data, meta }`.
 * See https://developer.marvelstrikeforce.com/beta/index.html (schema `Meta`).
 */
export interface ApiResponse<T> {
  data: T;
  meta: Meta;
}

export interface Meta {
  version: number;
  hashes?: Partial<
    Record<'events' | 'drops' | 'locs' | 'nodes' | 'chars' | 'other' | 'all', string>
  >;
  page?: number;
  perPage?: number;
  perTotal?: number;
  /** Seconds since epoch. */
  refreshAt?: DateTime;
  /** Pass to a later request's `since` param to get 344 UNCHANGED when nothing changed. */
  asOf?: string;
}

/** Seconds since 1970 UTC (API `DateTime`). */
export type DateTime = number;

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
