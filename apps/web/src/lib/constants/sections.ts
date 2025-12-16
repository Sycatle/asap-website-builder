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
import { SECTION_TYPES, type SectionTypeValue } from '@/hooks/useSections';

/**
 * Section type icons mapping
 */
export const SECTION_ICONS: Record<SectionTypeValue, React.ElementType> = {
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
  return SECTION_ICONS[sectionType as SectionTypeValue] || Layout;
}

/**
 * Get section label by type
 */
export function getSectionLabel(sectionType: string): string {
  const type = SECTION_TYPES.find(t => t.value === sectionType);
  return type?.label || sectionType;
}

/**
 * Get section description by type
 */
export function getSectionDescription(sectionType: string): string {
  const type = SECTION_TYPES.find(t => t.value === sectionType);
  return type?.description || '';
}

/**
 * Get section type info
 */
export function getSectionTypeInfo(sectionType: string) {
  const type = SECTION_TYPES.find(t => t.value === sectionType);
  return {
    label: type?.label || sectionType,
    description: type?.description || '',
    icon: getSectionIcon(sectionType),
  };
}
