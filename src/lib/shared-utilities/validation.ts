// Input validation patterns used across all domains

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Field validation rule
 */
export interface ValidationRule {
  field: string;
  value: any;
  rules: ValidatorFunction[];
}

/**
 * Validator function type
 */
export type ValidatorFunction = (value: any, field?: string) => string | null;

/**
 * Create successful validation result
 */
export function createValidResult(): ValidationResult {
  return { isValid: true, errors: [] };
}

/**
 * Create failed validation result
 */
export function createInvalidResult(errors: string[]): ValidationResult {
  return { isValid: false, errors };
}

/**
 * Run validation on multiple fields
 */
export function validateFields(rules: ValidationRule[]): ValidationResult {
  const allErrors: string[] = [];

  for (const rule of rules) {
    for (const validator of rule.rules) {
      const error = validator(rule.value, rule.field);
      if (error) {
        allErrors.push(error);
      }
    }
  }

  return allErrors.length === 0 
    ? createValidResult() 
    : createInvalidResult(allErrors);
}

// ==============================================
// BASIC VALIDATORS
// ==============================================

/**
 * Required field validator
 */
export const required: ValidatorFunction = (value, field = 'Field') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${field} is required`;
  }
  return null;
};

/**
 * String length validators
 */
export const minLength = (min: number): ValidatorFunction => (value, field = 'Field') => {
  if (typeof value !== 'string') return null;
  if (value.length < min) {
    return `${field} must be at least ${min} characters long`;
  }
  return null;
};

export const maxLength = (max: number): ValidatorFunction => (value, field = 'Field') => {
  if (typeof value !== 'string') return null;
  if (value.length > max) {
    return `${field} must be no more than ${max} characters long`;
  }
  return null;
};

/**
 * Number range validators
 */
export const minValue = (min: number): ValidatorFunction => (value, field = 'Field') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return null;
  if (num < min) {
    return `${field} must be at least ${min}`;
  }
  return null;
};

export const maxValue = (max: number): ValidatorFunction => (value, field = 'Field') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return null;
  if (num > max) {
    return `${field} must be no more than ${max}`;
  }
  return null;
};

/**
 * Number type validator
 */
export const isNumber: ValidatorFunction = (value, field = 'Field') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) {
    return `${field} must be a valid number`;
  }
  return null;
};

/**
 * Integer validator
 */
export const isInteger: ValidatorFunction = (value, field = 'Field') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num) || !Number.isInteger(num)) {
    return `${field} must be a whole number`;
  }
  return null;
};

/**
 * Email format validator
 */
export const isEmail: ValidatorFunction = (value, field = 'Email') => {
  if (typeof value !== 'string') return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return `${field} must be a valid email address`;
  }
  return null;
};

/**
 * Array validators
 */
export const isArray: ValidatorFunction = (value, field = 'Field') => {
  if (!Array.isArray(value)) {
    return `${field} must be an array`;
  }
  return null;
};

export const arrayMinLength = (min: number): ValidatorFunction => (value, field = 'Field') => {
  if (!Array.isArray(value)) return null;
  if (value.length < min) {
    return `${field} must contain at least ${min} item${min === 1 ? '' : 's'}`;
  }
  return null;
};

export const arrayMaxLength = (max: number): ValidatorFunction => (value, field = 'Field') => {
  if (!Array.isArray(value)) return null;
  if (value.length > max) {
    return `${field} must contain no more than ${max} item${max === 1 ? '' : 's'}`;
  }
  return null;
};

// ==============================================
// DOMAIN-SPECIFIC VALIDATORS
// ==============================================

/**
 * Time format validator (HH:MM)
 */
export const isTimeFormat: ValidatorFunction = (value, field = 'Time') => {
  if (typeof value !== 'string') return null;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(value)) {
    return `${field} must be in HH:MM format (24-hour)`;
  }
  return null;
};

/**
 * Date format validator (YYYY-MM-DD)
 */
export const isDateFormat: ValidatorFunction = (value, field = 'Date') => {
  if (typeof value !== 'string') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return `${field} must be in YYYY-MM-DD format`;
  }
  
  // Validate actual date
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isValidDate = date.getFullYear() === year && 
                     date.getMonth() === month - 1 && 
                     date.getDate() === day;
  
  if (!isValidDate) {
    return `${field} must be a valid date`;
  }
  
  return null;
};

/**
 * Priority validator
 */
export const isValidPriority: ValidatorFunction = (value, field = 'Priority') => {
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(value)) {
    return `${field} must be one of: ${validPriorities.join(', ')}`;
  }
  return null;
};

/**
 * Time block validator
 */
export const isValidTimeBlock: ValidatorFunction = (value, field = 'Time block') => {
  const validTimeBlocks = ['morning', 'afternoon', 'evening'];
  if (!validTimeBlocks.includes(value)) {
    return `${field} must be one of: ${validTimeBlocks.join(', ')}`;
  }
  return null;
};

/**
 * Domain category validator
 */
export const isValidDomainCategory: ValidatorFunction = (value, field = 'Domain category') => {
  const validDomains = ['ethos', 'trophe', 'soma'];
  if (!validDomains.includes(value)) {
    return `${field} must be one of: ${validDomains.join(', ')}`;
  }
  return null;
};

/**
 * Recurrence pattern validator
 */
export const isValidRecurrencePattern: ValidatorFunction = (value, field = 'Recurrence pattern') => {
  const validPatterns = ['once', 'daily', 'custom'];
  if (!validPatterns.includes(value)) {
    return `${field} must be one of: ${validPatterns.join(', ')}`;
  }
  return null;
};

/**
 * Custom recurrence days validator (0-6, Sunday to Saturday)
 */
export const isValidCustomRecurrenceDays: ValidatorFunction = (value, field = 'Custom recurrence days') => {
  if (!Array.isArray(value)) {
    return `${field} must be an array`;
  }
  
  if (value.length === 0) {
    return `${field} must contain at least one day`;
  }
  
  const validDays = [0, 1, 2, 3, 4, 5, 6];
  const invalidDays = value.filter(day => !validDays.includes(day));
  
  if (invalidDays.length > 0) {
    return `${field} must contain only numbers 0-6 (Sunday to Saturday)`;
  }
  
  return null;
};

/**
 * Label validator (for task/item labels)
 */
export const isValidLabel: ValidatorFunction = (value, field = 'Label') => {
  if (typeof value !== 'string') {
    return `${field} must be a string`;
  }
  
  if (value.trim().length === 0) {
    return `${field} cannot be empty`;
  }
  
  if (value.length > 50) {
    return `${field} must be less than 50 characters`;
  }
  
  // No special characters except underscore and hyphen
  const labelRegex = /^[a-zA-Z0-9_-]+$/;
  if (!labelRegex.test(value)) {
    return `${field} can only contain letters, numbers, underscores, and hyphens`;
  }
  
  return null;
};

/**
 * Nutritional value validator (protein, carbs, fat, calories)
 */
export const isValidNutritionalValue: ValidatorFunction = (value, field = 'Nutritional value') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return `${field} must be a valid number`;
  }
  
  if (num < 0) {
    return `${field} cannot be negative`;
  }
  
  if (num > 10000) {
    return `${field} seems unreasonably high (max 10,000)`;
  }
  
  return null;
};

/**
 * Weight validator (for bodyweight tracking)
 */
export const isValidWeight: ValidatorFunction = (value, field = 'Weight') => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return `${field} must be a valid number`;
  }
  
  if (num <= 0) {
    return `${field} must be greater than 0`;
  }
  
  if (num < 20 || num > 1000) {
    return `${field} must be between 20 and 1000 (kg or lbs)`;
  }
  
  return null;
};

// ==============================================
// VALIDATION UTILITIES
// ==============================================

/**
 * Combine multiple validators with AND logic
 */
export function combineValidators(...validators: ValidatorFunction[]): ValidatorFunction {
  return (value, field) => {
    for (const validator of validators) {
      const error = validator(value, field);
      if (error) return error;
    }
    return null;
  };
}

/**
 * Create conditional validator (only validate if condition is met)
 */
export function conditionalValidator(
  condition: (value: any) => boolean,
  validator: ValidatorFunction
): ValidatorFunction {
  return (value, field) => {
    if (condition(value)) {
      return validator(value, field);
    }
    return null;
  };
}

/**
 * Create custom regex validator
 */
export function regexValidator(
  pattern: RegExp,
  errorMessage: string
): ValidatorFunction {
  return (value, field = 'Field') => {
    if (typeof value !== 'string') return null;
    if (!pattern.test(value)) {
      return errorMessage.replace('{field}', field);
    }
    return null;
  };
}

/**
 * Validate object with schema
 */
export interface ValidationSchema {
  [key: string]: ValidatorFunction[];
}

export function validateObject(
  obj: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const rules: ValidationRule[] = Object.entries(schema).map(([field, validators]) => ({
    field,
    value: obj[field],
    rules: validators
  }));

  return validateFields(rules);
}

/**
 * Quick validation helpers for common use cases
 */
export const validators = {
  // Task validation
  taskName: [required, minLength(1), maxLength(100)],
  taskDescription: [maxLength(500)],
  taskScheduledTime: [required, isTimeFormat],
  taskPriority: [isValidPriority],
  taskRecurrencePattern: [required, isValidRecurrencePattern],
  taskDomainCategory: [isValidDomainCategory],
  taskLabels: [isArray, arrayMaxLength(10)],
  
  // Food/Nutrition validation
  foodName: [required, minLength(1), maxLength(100)],
  foodProtein: [required, isValidNutritionalValue],
  foodCarbs: [required, isValidNutritionalValue],
  foodFat: [required, isValidNutritionalValue],
  foodCalories: [required, isValidNutritionalValue],
  
  // User validation
  userEmail: [required, isEmail],
  userWeight: [required, isValidWeight],
  
  // Common validation
  dateString: [required, isDateFormat],
  timeString: [required, isTimeFormat],
  positiveNumber: [required, isNumber, minValue(0)],
  positiveInteger: [required, isInteger, minValue(0)]
};

/**
 * Sanitize input by removing/escaping potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/['"]/g, '') // Remove quotes
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .map(sanitizeInput)
    .filter(item => item.length > 0)
    .slice(0, 50); // Limit array size
}