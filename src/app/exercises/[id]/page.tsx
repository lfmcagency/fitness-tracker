'use client'

import { useParams } from 'next/navigation';
import ExerciseProgressionView from '@/components/skill-tree/ExerciseProgressionView';

export default function ExercisePage() {
  const params = useParams();
  const exerciseId = params?.id as string;
  
  return <ExerciseProgressionView exerciseId={exerciseId} />;
}