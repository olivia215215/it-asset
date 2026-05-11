import { cn } from "@/lib/utils";

interface TimelineEvent {
  label: string;
  time: string;
  description?: string;
}

interface TicketTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function TicketTimeline({ events, className }: TicketTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <div key={index} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Timeline line + indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "z-10 flex size-3 shrink-0 items-center justify-center rounded-full border-2",
                  "border-primary bg-background",
                )}
              />
              {!isLast && (
                <div className="mt-0.5 w-px flex-1 bg-border" />
              )}
            </div>

            {/* Event content */}
            <div className="min-w-0 flex-1 -mt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {event.label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {event.time}
                </span>
              </div>
              {event.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
