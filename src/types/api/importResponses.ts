import { ApiResponse } from './common'

export interface ImportResult {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  duration?: string
}

export interface ExerciseImportResult extends ImportResult {
  relationshipsProcessed?: number
  relationshipErrors?: string[]
}

export interface ImportExercisesResponse {
  data: ExerciseImportResult
  success: boolean
  error?: string
}
export interface ImportFoodsResponse {
  data: ImportResult
  success: boolean
  error?: string
}