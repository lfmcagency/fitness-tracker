// src/components/routine/ProgressIndicator.tsx
interface ProgressIndicatorProps {
    percentage: number
  }
  
  export default function ProgressIndicator({ percentage }: ProgressIndicatorProps) {
    return (
      <div className="mb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-kalos-secondary">Progress</span>
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
        <div className="h-1 bg-[#E5E0DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-kalos-text rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }