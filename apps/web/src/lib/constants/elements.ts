import { 
  Layout,
  Star,
  User,
  Briefcase,
  GraduationCap,
  Mail,
  BookOpen,
  Image,
  MessageSquare,
  Settings,
  DollarSign,
  HelpCircle,
  Code,
  FolderOpen,
} from "lucide-react";
import type { ElementType } from '@asap/shared';
import { getElementLabel as getSharedElementLabel, getElementDescription as getSharedElementDescription } from '@asap/shared';

/**
 * Element type icons mapping
 */
export const ELEMENT_ICONS: Record<ElementType, React.ElementType> = {
  hero: Star,
  about: User,
  projects: FolderOpen,
  skills: Code,
  experience: Briefcase,
  education: GraduationCap,
  contact: Mail,
  blog: BookOpen,
  gallery: Image,
  testimonials: MessageSquare,
  services: Settings,
  pricing: DollarSign,
  faq: HelpCircle,
  custom: Layout,
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
