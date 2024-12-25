import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

interface QuestionStatus {
  id: string;
  completed: boolean;
  hasRecording: boolean;
}

interface ProgressBarProps {
  progress: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStatuses: QuestionStatus[];
  onQuestionClick?: (index: number) => void;
}

export function ProgressBar({
  progress,
  currentQuestionIndex,
  totalQuestions,
  questionStatuses,
  onQuestionClick,
}: ProgressBarProps) {
  return (
    <Card className="p-4">
      {/* Main Progress Bar */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <div className="ml-4 min-w-[3rem] text-right text-sm font-medium">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Question Progress Details */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {questionStatuses.filter(s => s.completed).length} Completed
          </span>
        </div>

        {/* Question Indicators */}
        <div className="flex gap-1 mt-2">
          {questionStatuses.map((status, index) => (
            <button
              key={status.id}
              onClick={() => onQuestionClick?.(index)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                status.completed
                  ? "bg-green-500"
                  : index === currentQuestionIndex
                  ? "bg-blue-500"
                  : "bg-gray-200",
                onQuestionClick && "cursor-pointer hover:opacity-80"
              )}
              title={`Question ${index + 1}${
                status.completed ? " (Completed)" : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-500">
        Interview Progress
      </div>
    </Card>
  );
}