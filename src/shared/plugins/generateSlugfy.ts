import { Schema } from 'mongoose';

export function slugify(
  text: string,
  options: { lower?: boolean; strict?: boolean } = {
    lower: true,
    strict: true,
  },
): string {
  const { lower = false, strict = false } = options;
  let slug = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/\s+/g, '-');

  if (strict) {
    slug = slug.replace(/[^a-zA-Z0-9-]/g, '');
  }
  if (lower) {
    slug = slug.toLowerCase();
  }
  return slug;
}

interface SlugifyPluginOptions {
  sourceField: string;
  targetField?: string;
  lower?: boolean;
  strict?: boolean;
}

export function autoSlugify<T>(
  schema: Schema<T>,
  options: SlugifyPluginOptions,
): void {
  const {
    sourceField,
    targetField = 'slug',
    lower = true,
    strict = true,
  } = options;

  schema.pre<any>('save', function (next) {
    if ((this.isNew || this.isModified(sourceField)) && this[sourceField]) {
      this[targetField] = slugify(this[sourceField], { lower, strict });
    }
    next();
  });
}
