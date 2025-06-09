export interface ImportExercisesRequest {
  file: File // Will be FormData in practice
  options?: {
    overwrite?: boolean
    skipRelationships?: boolean
  }
}

export interface ImportFoodsRequest {
  file: File // Will be FormData in practice
  options?: {
    overwrite?: boolean
  }
}