"use client";

import * as React from "react";
import {
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DAYS_OF_WEEK = [
  { key: "sun", label: "일" },
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
];

type ViewMode = "week" | "two-weeks" | "month";

type MiniCalendarProps = {
  onSelect?: (date: Date) => void;
  dayStatus?: (date: Date) => "available" | "full" | "none"; // visual marker per day
};

export const Calendar: React.FC<MiniCalendarProps> = ({ onSelect, dayStatus }) => {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [view, setView] = React.useState<ViewMode>("week");

  const days = React.useMemo(() => {
    if (view === "week") {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      });
    }
    if (view === "two-weeks") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = addDays(start, 13);
      return eachDayOfInterval({ start, end });
    }
    // month view: fill full weeks covering the month
    const sm = startOfMonth(currentDate);
    const em = endOfMonth(currentDate);
    const start = startOfWeek(sm, { weekStartsOn: 0 });
    const end = endOfWeek(em, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, view]);

  const handlePrev = () => {
    if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else if (view === "two-weeks") setCurrentDate((d) => subWeeks(d, 2));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else if (view === "two-weeks") setCurrentDate((d) => addWeeks(d, 2));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card text-card-foreground shadow">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-sm font-medium">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setView("week")}
          >
            1주
          </Button>
          <Button
            variant={view === "two-weeks" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setView("two-weeks")}
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
          const status = dayStatus ? dayStatus(day) : "none";

          return (
            <Button
              key={day.toString()}
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "h-9 w-9 p-0 font-normal",
                view === "month" && !isSameMonth(day, currentDate)
                  ? "opacity-50"
                  : "",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => {
                setSelectedDate(day);
                onSelect?.(day);
              }}
            >
              <time dateTime={format(day, "yyyy-MM-dd")}>
                {format(day, "d")}
              </time>
              {/* status dot */}
              <span
                className={cn(
                  "ml-1 inline-block h-1.5 w-1.5 rounded-full",
                  status === "available" && "bg-emerald-500",
                  status === "full" && "bg-rose-500",
                  status === "none" && "bg-transparent"
                )}
              />
            </Button>
          );
        })}
      </div>
    </div>
  );
};