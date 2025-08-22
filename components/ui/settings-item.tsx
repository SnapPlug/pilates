"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ExternalLink, Info } from "lucide-react";

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  showExternalLink?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SettingsItem = React.forwardRef<HTMLDivElement, SettingsItemProps>(
  ({ 
    title, 
    subtitle, 
    icon, 
    rightElement, 
    onPress, 
    showChevron = false, 
    showExternalLink = false,
    disabled = false,
    className,
    children
  }, ref) => {
    const isPressable = onPress && !disabled;
    
    return (
      <div
        ref={ref}
        className={cn(
          "group relative",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 transition-colors",
            isPressable && "cursor-pointer hover:bg-gray-50 active:bg-gray-100",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={isPressable ? onPress : undefined}
        >
          {/* 왼쪽 영역: 아이콘, 제목, 부제목 */}
          <div className="flex items-center flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 mr-3 text-gray-600">
                {icon}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium text-gray-900 truncate">
                {title}
              </div>
              {subtitle && (
                <div className="text-sm text-gray-500 truncate mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽 영역: 우측 요소, 화살표, 외부 링크 */}
          <div className="flex items-center flex-shrink-0 ml-3">
            {children}
            {rightElement}
            {showExternalLink && (
              <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
            )}
            {showChevron && (
              <ChevronRight className="w-4 h-4 text-gray-400 ml-2 group-hover:text-gray-600 transition-colors" />
            )}
          </div>
        </div>
      </div>
    );
  }
);

SettingsItem.displayName = "SettingsItem";

export { SettingsItem };
