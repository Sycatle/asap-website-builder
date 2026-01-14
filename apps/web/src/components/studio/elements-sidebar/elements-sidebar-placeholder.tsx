"use client"

import React from "react"
import { Layers } from "lucide-react"

/**
 * ElementsSidebarPlaceholder - Temporary placeholder for elements sidebar
 * Will be replaced with full implementation in Task 1.1.2
 */
export function ElementsSidebarPlaceholder() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h2 className="font-semibold">Elements</h2>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-sm text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Elements sidebar</p>
          <p className="mt-2 text-xs">(Task 1.1.2)</p>
        </div>
      </div>
    </div>
  )
}

export default ElementsSidebarPlaceholder
