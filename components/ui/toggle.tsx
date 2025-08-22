"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onCheckedChange, disabled = false, className, size = "md" }, ref) => {
    const sizeClasses = {
      sm: "w-9 h-5",
      md: "w-11 h-6",
      lg: "w-14 h-7"
    };

    const thumbSizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6"
    };

    const thumbTranslateClasses = {
      sm: checked ? "translate-x-4" : "translate-x-0.5",
      md: checked ? "translate-x-5" : "translate-x-0.5",
      lg: checked ? "translate-x-7" : "translate-x-0.5"
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked 
            ? "bg-blue-600 hover:bg-blue-700" 
            : "bg-gray-200 hover:bg-gray-300",
          sizeClasses[size],
          className
        )}
      >
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            thumbSizeClasses[size],
            thumbTranslateClasses[size]
          )}
        />
      </button>
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle };
