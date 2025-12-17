"use client"

// V1 Stub - AddSectionModal not used in V1 fixed profile structure
interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd?: (data: unknown) => Promise<void>
  existingSectionsCount?: number
}

export function AddSectionModal({ isOpen, onClose }: AddSectionModalProps) {
  // In V1, we don't support adding custom sections
  return null
}
