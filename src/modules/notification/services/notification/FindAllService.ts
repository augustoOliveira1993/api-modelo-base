import { injectable, inject } from 'tsyringe';
import { QueryOptions } from 'mongoose';
import { applySearchParam } from '@shared/utils/search';
import {
  applyPaginationParams,
  buildPaginatedResult,
} from '@shared/utils/pagination';
import moment from 'moment-timezone';
import INotificationRepository from '../../repositories/INotificationRepository';
import { INotificationDTO } from '../../dto/INotificationDTO';

@injectable()
export default class FindAllService {
  constructor(
    @inject('NotificationRepository')
    private repository: INotificationRepository,
  ) {}

  public async execute(
    query: QueryOptions<INotificationDTO> & {
      userId?: string;
      lojaId?: string;
      isAdmin?: boolean;
      is_read?: string | boolean;
      type?: string;
      category?: string;
    },
  ) {
    const now = moment().tz('America/Sao_Paulo').toDate();
    const scopeFilters = [
      query.userId ? { user: query.userId } : null,
      query.lojaId
        ? {
            'metadata.loja': query.lojaId,
            user: { $exists: false },
            'metadata.audience': { $ne: 'admins' },
          }
        : null,
      query.isAdmin && query.lojaId
        ? {
            'metadata.loja': query.lojaId,
            user: { $exists: false },
            'metadata.audience': 'admins',
          }
        : null,
    ].filter(Boolean);

    let queryParams: any = {
      $and: [
        {
          $or: [
            { expiresAt: { $gte: now } },
            { expiresAt: { $exists: false } },
          ],
        },
      ],
    };

    if (scopeFilters.length) {
      queryParams.$and.push({ $or: scopeFilters });
    }

    if (query.is_read !== undefined) {
      queryParams.is_read =
        query.is_read === true ||
        String(query.is_read).toLowerCase() === 'true';
    }

    if (query.type) {
      queryParams.type = query.type;
    }

    if (query.category) {
      queryParams = {
        ...queryParams,
        category: { $regex: query.category, $options: 'i' },
      };
    }

    queryParams = applySearchParam(query, queryParams, {
      textFields: ['title', 'message'],
    });

    queryParams = applyPaginationParams(query, queryParams);
    const [total, resultData] = await Promise.all([
      this.repository.total(queryParams),
      this.repository.findAll(queryParams),
    ]);
    return buildPaginatedResult(resultData, total, query);
  }
}
