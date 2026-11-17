import { RequestHandler } from 'express';
import { BadRequestError } from '@shared/errors/AppError';

type ValidationLocation = 'body' | 'params' | 'query';
type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface IFieldValidationRule {
  required?: boolean;
  type?: FieldType;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: Array<string | number | boolean>;
}

export type IRequestValidationSchema = Record<string, IFieldValidationRule>;

export interface IRequestValidationSchemas {
  body?: IRequestValidationSchema;
  params?: IRequestValidationSchema;
  query?: IRequestValidationSchema;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function matchesType(value: unknown, type: FieldType): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'number') {
    return typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value)));
  }
  if (type === 'boolean') {
    return (
      typeof value === 'boolean' ||
      value === 'true' ||
      value === 'false'
    );
  }
  if (type === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  return typeof value === type;
}

function validateSchema(
  location: ValidationLocation,
  payload: Record<string, unknown>,
  schema: IRequestValidationSchema,
): string[] {
  const errors: string[] = [];

  Object.entries(schema).forEach(([field, rule]) => {
    const value = payload[field];
    const fieldPath = `${location}.${field}`;

    if (rule.required && isEmpty(value)) {
      errors.push(`${fieldPath} é obrigatório`);
      return;
    }

    if (isEmpty(value)) return;

    if (rule.type && !matchesType(value, rule.type)) {
      errors.push(`${fieldPath} deve ser ${rule.type}`);
      return;
    }

    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldPath} deve ter no mínimo ${rule.minLength} caracteres`);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${fieldPath} deve ter no máximo ${rule.maxLength} caracteres`);
      }

      if (rule.pattern) {
        rule.pattern.lastIndex = 0;
        if (!rule.pattern.test(value)) {
          errors.push(`${fieldPath} tem formato inválido`);
        }
      }
    }

    if (rule.allowedValues && !rule.allowedValues.includes(value as never)) {
      errors.push(`${fieldPath} deve ser um dos valores permitidos`);
    }
  });

  return errors;
}

export function validateRequest(schemas: IRequestValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const errors = (Object.keys(schemas) as ValidationLocation[]).flatMap(location => {
      const schema = schemas[location];
      if (!schema) return [];

      return validateSchema(
        location,
        req[location] as Record<string, unknown>,
        schema,
      );
    });

    if (errors.length > 0) {
      throw new BadRequestError({
        message: `Campos inválidos: ${errors.join('; ')}`,
      });
    }

    next();
  };
}
