"use client";

import { WebsiteElement, UpdateElementRequest } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface GenericPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function GenericProperties({
  element,
  onUpdate,
  isUpdating,
}: GenericPropertiesProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Property editor for <strong>{element.element_type}</strong> is coming soon.
          <br />
          <span className="text-xs text-muted-foreground mt-1 block">
            Use the general properties above to manage basic settings.
          </span>
        </AlertDescription>
      </Alert>

      {/* Show raw content as JSON for debugging */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Current Content (read-only)</div>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[200px]">
          {JSON.stringify(element.content, null, 2)}
        </pre>
      </div>
    </div>
  );
}
