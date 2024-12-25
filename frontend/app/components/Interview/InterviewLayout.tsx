import * as React from "react";
import { cn } from "~/lib/utils";

interface InterviewLayoutProps {
  avatarSection: React.ReactNode;
  recordingSection: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function InterviewLayout({
  avatarSection,
  recordingSection,
  header,
  footer,
  className,
}: InterviewLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      {header && <div className="space-y-2">{header}</div>}

      {/* Main Content - Split Screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
        {/* Avatar Side */}
        <div className="h-full">{avatarSection}</div>

        {/* Recording Side */}
        <div className="h-full">{recordingSection}</div>
      </div>

      {/* Footer Section */}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}