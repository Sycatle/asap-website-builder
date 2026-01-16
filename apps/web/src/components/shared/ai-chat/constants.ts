import {
  Wand2,
  Plus,
  Trash2,
  Layout,
  Palette,
  Image,
  Sparkles,
  Zap,
  Database,
  Variable,
  Settings,
  Puzzle,
  FileText,
  Eye,
} from "lucide-react";

// Tool icons and labels
export const TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  'update_section': { icon: Wand2, label: 'Updating section', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'update_section_property': { icon: Wand2, label: 'Updating property', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'add_section': { icon: Plus, label: 'Adding section', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  'remove_section': { icon: Trash2, label: 'Removing section', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  'reorder_sections': { icon: Layout, label: 'Reordering', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  'update_theme': { icon: Palette, label: 'Updating theme', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  'generate_image': { icon: Image, label: 'Generating image', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  'generate_content': { icon: Sparkles, label: 'Generating content', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  'analyze': { icon: Sparkles, label: 'Analyzing', color: 'text-primary', bgColor: 'bg-primary/10' },
  'thinking': { icon: Sparkles, label: 'Thinking', color: 'text-primary', bgColor: 'bg-primary/10' },
  'default': { icon: Zap, label: 'Processing', color: 'text-primary', bgColor: 'bg-primary/10' },
};

// AI Data tools config (search tools)
export const AI_DATA_TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  'search_collections': { icon: Database, label: 'Collections' },
  'search_variables': { icon: Variable, label: 'Variables' },
  'get_website_sections': { icon: Layout, label: 'Sections' },
  'get_website_theme': { icon: Palette, label: 'Thème' },
  'get_website_settings': { icon: Settings, label: 'Paramètres' },
  'list_extensions': { icon: Puzzle, label: 'Extensions' },
  'get_page_content': { icon: FileText, label: 'Contenu de page' },
  'request_visual_analysis': { icon: Eye, label: 'Analyse visuelle' },
};
