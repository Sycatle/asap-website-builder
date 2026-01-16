"use client"

import React from "react"
import { Settings } from "lucide-react"

/**
 * PropertiesPanelPlaceholder - Temporary placeholder for properties panel
 * Will be replaced with full implementation in Task 1.2.1
 */
export function PropertiesPanelPlaceholder() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="font-semibold">Properties</h2>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-sm text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Properties panel</p>
          <p className="mt-2 text-xs">(Task 1.2.1)</p>
        </div>
      </div>
    </div>
  )
}

export default PropertiesPanelPlaceholder
