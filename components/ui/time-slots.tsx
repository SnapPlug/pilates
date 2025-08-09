"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TimeSlotsProps = {
  dateLabel?: string;
  selectedTime?: string | null;
  onSelect?: (time: string) => void;
  // 24h HH:mm formatted strings
  slots?: string[];
  disabled?: string[];
};

const DEFAULT_SLOTS = [
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "18:00",
  "19:00",
];

export function TimeSlots({
  dateLabel,
  selectedTime,
  onSelect,
  slots = DEFAULT_SLOTS,
  disabled = [],
}: TimeSlotsProps) {
  const disabledSet = React.useMemo(() => new Set(disabled), [disabled]);

  return (
    <div className="space-y-3">
      {dateLabel && (
        <p className="text-sm text-muted-foreground">{dateLabel} 가능한 시간</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {slots.map((time) => {
          const isDisabled = disabledSet.has(time);
          const isSelected = selectedTime === time;
          return (
            <Button
              key={time}
              type="button"
              variant={isSelected ? "default" : "outline"}
              disabled={isDisabled}
              className={cn("h-10", isSelected && "shadow-md")}
              onClick={() => onSelect?.(time)}
            >
              {time}
            </Button>
          );
        })}
      </div>
    </div>
  );
}


