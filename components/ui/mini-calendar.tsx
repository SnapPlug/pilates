"use client";

import * as React from "react";
import {
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DAYS_OF_WEEK = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

export type CalendarView = "week" | "twoWeeks" | "month";

export type CalendarProps = {
  value?: Date;
  onChange?: (date: Date) => void;
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  showControls?: boolean; // whether to render internal view controls
};

export const Calendar: React.FC<CalendarProps> = ({ value, onChange, view: controlledView, onViewChange, weekStartsOn = 0, showControls = true }) => {
  const [selectedDate, setSelectedDate] = React.useState<Date>(value ?? new Date());
  const [anchorDate, setAnchorDate] = React.useState<Date>(value ?? new Date());
  const [uncontrolledView, setUncontrolledView] = React.useState<CalendarView>(controlledView ?? "week");
  const view = controlledView ?? uncontrolledView;

  function setView(next: CalendarView) {
    setUncontrolledView(next);
    onViewChange?.(next);
  }

  let start: Date;
  let end: Date;
  if (view === "week") {
    start = startOfWeek(anchorDate, { weekStartsOn });
    end = endOfWeek(anchorDate, { weekStartsOn });
  } else if (view === "twoWeeks") {
    start = startOfWeek(anchorDate, { weekStartsOn });
    end = addDays(start, 13);
  } else {
    // month view - expand to full weeks
    start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn });
    end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn });
  }
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card text-card-foreground shadow">
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (view === "month") setAnchorDate(subMonths(anchorDate, 1));
            else if (view === "twoWeeks") setAnchorDate(subWeeks(anchorDate, 2));
            else setAnchorDate(subWeeks(anchorDate, 1));
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium">{format(anchorDate, "MMMM yyyy")}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (view === "month") setAnchorDate(addMonths(anchorDate, 1));
            else if (view === "twoWeeks") setAnchorDate(addWeeks(anchorDate, 2));
            else setAnchorDate(addWeeks(anchorDate, 1));
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center mb-2 px-4">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.key}
            className="text-xs font-medium text-muted-foreground"
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-4 pt-0">
        {days.map((day) => {
          const isSelected =
            format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const outside = view === "month" && !isSameMonth(day, anchorDate);

          return (
            <Button
              key={day.toString()}
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "h-9 w-9 p-0 font-normal",
                outside && "text-muted-foreground/60",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => {
                setSelectedDate(day);
                onChange?.(day);
              }}
            >
              <time dateTime={format(day, "yyyy-MM-dd")}>
                {format(day, "d")}
              </time>
            </Button>
          );
        })}
      </div>
      {showControls && (
        <div className="px-4 pb-4">
          <div className="ml-auto w-fit rounded-md border bg-black/[.04] dark:bg-white/[.04] px-2 py-1 flex items-center gap-1">
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("week")}
            >
              1주
            </Button>
            <Button
              variant={view === "twoWeeks" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("twoWeeks")}
            >
              2주
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("month")}
            >
              1달
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// External control component so the buttons can be placed outside the calendar
export function CalendarViewControls({
  view,
  onChange,
  className,
}: {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
  className?: string;
}) {
  return (
    <div className={cn("w-fit rounded-md border bg-black/[.04] dark:bg-white/[.04] px-2 py-1 flex items-center gap-1", className)}>
      <Button variant={view === "week" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => onChange("week")}>
        1주
      </Button>
      <Button variant={view === "twoWeeks" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => onChange("twoWeeks")}>
        2주
      </Button>
      <Button variant={view === "month" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => onChange("month")}>
        1달
      </Button>
    </div>
  );
}