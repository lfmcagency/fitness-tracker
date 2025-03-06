export interface ValidationResult {
    /** Whether the validation passed */
    valid: boolean;
    /** Validation error messages (only present on failure) */
    errors?: string[];
  }
  
  /**
   * Type for validation function
   * @template T The type of value being validated
   */
  export type Validator<T> = (value: T) => ValidationResult;
  
  /**
   * Common error codes used across the application
   */
  export enum ErrorCode {
    VALIDATION = 'ERR_VALIDATION',
    NOT_FOUND = 'ERR_NOT_FOUND',
    UNAUTHORIZED = 'ERR_UNAUTHORIZED',
    FORBIDDEN = 'ERR_FORBIDDEN',
    INTERNAL = 'ERR_INTERNAL',
    INVALID_JSON = 'ERR_INVALID_JSON',
    INVALID_ID = 'ERR_INVALID_ID',
    DUPLICATE = 'ERR_DUPLICATE',
    NOT_IMPLEMENTED = 'ERR_NOT_IMPLEMENTED'
  }