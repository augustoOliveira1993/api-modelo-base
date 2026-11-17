// ====================================
// SHARED UTILITIES - CENTRALIZED EXPORTS
// ====================================
// Este arquivo centraliza todas as utilities compartilhadas
// organizadas por categoria para fácil importação

// Validation utilities
export { isValidMongoId, isValidObjectIdMongose } from './validation';

// Excel utilities

// Pagination utilities
export {
  applyPaginationParams,
  applyCursorPaginationParams,
  buildCursorPaginatedResult,
  buildPaginatedResult,
  ICursorPaginationOptions,
  ICursorPaginationResult,
  IPaginationParams,
  IPaginatedResult,
} from './pagination';

// Formatters
export { parseExpirationTime, calculatePercentage } from './formatters';

// Search utilities
export { applySearchParam, SearchOptions } from './search';

// Comparison utilities
export { getDiffJson } from './comparison';

// Logger (mantido separado)
export { logger } from './logger';
