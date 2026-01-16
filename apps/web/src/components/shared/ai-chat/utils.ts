import type { AIAction } from "@/lib/api/ai";

// Helper to format action labels for display
export function formatActionLabel(action: AIAction): string {
  switch (action.type) {
    case 'update_section':
    case 'update_property':
      return `Update ${action.property || 'section'}`;
    case 'add_section':
      return `Add ${action.section_type || 'section'}`;
    case 'remove_section':
      return 'Remove section';
    case 'reorder_sections':
      return 'Reorder sections';
    case 'duplicate_section':
      return 'Duplicate section';
    case 'update_theme':
      return 'Update theme';
    case 'update_metadata':
      return 'Update metadata';
    case 'generate_content':
      return 'Generate content';
    default:
      return action.type.replace(/_/g, ' ');
  }
}
