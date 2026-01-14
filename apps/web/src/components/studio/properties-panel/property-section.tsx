"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertySectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PropertySection({
  title,
  defaultOpen = false,
  children,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px]" : "max-h-0"
        )}
      >
        <div className="space-y-3 p-3 pt-0">{children}</div>
      </div>
    </div>
  );
}
