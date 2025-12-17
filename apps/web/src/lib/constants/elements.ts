import { 
  Layout,
  Star,
  User,
  Briefcase,
  Mail,
  Settings,
  Code,
  FolderOpen,
  Workflow,
  Award,
} from "lucide-react";
import type { ElementType } from '@asap/shared';
import { getElementLabel as getSharedElementLabel, getElementDescription as getSharedElementDescription } from '@asap/shared';

/**
 * Element type icons mapping (V1 simplified)
 * Only includes active V1 element types
 */
export const ELEMENT_ICONS: Record<ElementType, React.ElementType> = {
  hero: Star,
  about: User,
  services: Briefcase,
  projects: FolderOpen,
  process: Workflow,
  skills: Code,
  proof: Award,
  contact: Mail,
};

/**
 * Get element icon by type
 */
export function getElementIcon(elementType: string): React.ElementType {
  return ELEMENT_ICONS[elementType as ElementType] || Layout;
}

/**
 * Get element label by type (delegates to @asap/shared)
 */
export const getElementLabel = getSharedElementLabel;

/**
 * Get element description by type (delegates to @asap/shared)
 */
export const getElementDescription = getSharedElementDescription;

/**
 * Get element type info
 */
export function getElementTypeInfo(elementType: string) {
  return {
    label: getElementLabel(elementType),
    description: getElementDescription(elementType),
    icon: getElementIcon(elementType),
  };
}
