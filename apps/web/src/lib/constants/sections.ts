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
import type { SectionType } from '@asap/shared';
import { getSectionLabel as getSharedSectionLabel, getSectionDescription as getSharedSectionDescription } from '@asap/shared';

// Re-export SectionType for backward compatibility
export type { SectionType as SectionTypeValue } from '@asap/shared';

/**
 * Section type icons mapping
 */
export const SECTION_ICONS: Record<SectionType, React.ElementType> = {
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
 * Get section icon by type
 */
export function getSectionIcon(sectionType: string): React.ElementType {
  return SECTION_ICONS[sectionType as SectionType] || Layout;
}

/**
 * Get section label by type (delegates to @asap/shared)
 */
export const getSectionLabel = getSharedSectionLabel;

/**
 * Get section description by type (delegates to @asap/shared)
 */
export const getSectionDescription = getSharedSectionDescription;

/**
 * Get section type info
 */
export function getSectionTypeInfo(sectionType: string) {
  return {
    label: getSectionLabel(sectionType),
    description: getSectionDescription(sectionType),
    icon: getSectionIcon(sectionType),
  };
}
