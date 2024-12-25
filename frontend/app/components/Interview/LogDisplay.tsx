import * as React from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { Log } from "~/hooks/useRecording";

interface LogDisplayProps {
  logs: Log[];
}

export function LogDisplay({ logs }: LogDisplayProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: Log['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500 dark:text-green-400';
      case 'error':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="p-2 border-b bg-muted">
        <h3 className="text-sm font-medium">System Logs</h3>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-4 space-y-2">
          {logs.map((log, index) => (
            <div key={index} className="text-sm flex gap-2">
              <span className="text-muted-foreground shrink-0">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span className={getLogColor(log.type)}>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No logs to display. Start recording to see system logs.
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}