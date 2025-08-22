"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const SettingsSection = React.forwardRef<HTMLDivElement, SettingsSectionProps>(
  ({ title, children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-1", className)}
      >
        {title && (
          <div className="px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {title}
            </h3>
          </div>
        )}
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }
);

SettingsSection.displayName = "SettingsSection";

export { SettingsSection };
