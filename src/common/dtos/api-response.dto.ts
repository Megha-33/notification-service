export interface MetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponseDto<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: MetaDto | null;
  timestamp: string;
}

/**
 * Type Guards
 */

export function hasMessageAndData<T = unknown>(
  value: unknown,
): value is { message: string; data: T } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'data' in value
  );
}

export function isPaginatedResponse<T = unknown>(
  value: unknown,
): value is {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    lastPage?: number;
  };
  message?: string;
} {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;
  if (!('data' in v && 'meta' in v)) return false;

  const meta = v.meta as Record<string, unknown>;
  return (
    meta !== null &&
    typeof meta === 'object' &&
    'page' in meta &&
    'limit' in meta &&
    'total' in meta
  );
}