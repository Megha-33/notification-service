import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ApiSuccessResponseDto,
  MetaDto,
  hasMessageAndData,
  isPaginatedResponse,
} from '../dtos/api-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponseDto<T>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(
      map((value: any) => {
        // ✅ Skip streams / files
        if (value?.getStream || value?.pipe) {
          return value;
        }

        const timestamp = new Date().toISOString();

        /**
         * ✅ PAGINATED RESPONSE
         */
        if (isPaginatedResponse<T>(value)) {
          const { data, meta, message } = value;

          const totalPages =
            meta.totalPages ??
            meta.lastPage ??
            Math.ceil(meta.total / meta.limit);

          const formattedMeta: MetaDto = {
            page: meta.page,
            limit: meta.limit,
            total: meta.total,
            totalPages,
          };

          return {
            success: true,
            message: message ?? 'Items fetched successfully',
            data,
            meta: formattedMeta,
            timestamp,
          };
        }

        let message = 'Success';
        let data = value;

        if (hasMessageAndData<T>(value)) {
          message = value.message;
          data = value.data;
        }

        return {
          success: true,
          message,
          data,
          meta: null,
          timestamp,
        };
      }),
    );
  }
}