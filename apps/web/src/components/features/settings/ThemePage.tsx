import { useEffect, useState, useMemo } from 'react';
import { useWebsitesQuery } from '@/lib/query';
import { PageHeader } from '@/components/shared/page-header';
import { PageIcon } from '@/lib/navigation-config';
import { 
  RefreshCw,
  Sun,
  Moon,
  Type,
  Paintbrush,
  Save,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  enable_dark_mode: boolean;
  border_radius: string;
}

const defaultTheme: ThemeSettings = {
  primary_color: '#3b82f6',
  secondary_color: '#8b5cf6',
  background_color: '#ffffff',
  text_color: '#1f2937',
  font_heading: 'Inter',
  font_body: 'Inter',
  enable_dark_mode: true,
  border_radius: 'md',
};

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const radiusOptions = [
  { value: 'none', label: 'Aucun', preview: '0px' },
  { value: 'sm', label: 'Petit', preview: '4px' },
  { value: 'md', label: 'Moyen', preview: '8px' },
  { value: 'lg', label: 'Grand', preview: '12px' },
  { value: 'full', label: 'Arrondi', preview: '9999px' },
];

export default function ThemePage() {
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesQuery();
  const currentWebsite = websites[0] || null;
  
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [originalTheme, setOriginalTheme] = useState<ThemeSettings>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load theme from website data
  useEffect(() => {
    const loadTheme = async () => {
      if (!currentWebsite) return;
      
      setIsLoading(true);
      try {
        const response = await apiClient.get<{ data: any }>(`/websites/${currentWebsite.id}/data`);
        const savedTheme = response.data?.theme || {};
        const mergedTheme = { ...defaultTheme, ...savedTheme };
        setTheme(mergedTheme);
        setOriginalTheme(mergedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [currentWebsite?.id]);

  // Check for changes using useMemo to avoid double JSON.stringify + setState overhead
  const hasChanges = useMemo(() => {
    // Fast path: referential equality
    if (theme === originalTheme) return false;
    // Slow path: deep comparison only when references differ
    return JSON.stringify(theme) !== JSON.stringify(originalTheme);
  }, [theme, originalTheme]);

  // Update theme value
  const updateTheme = (key: keyof ThemeSettings, value: any) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  // Save theme
  const handleSave = async () => {
    if (!currentWebsite) return;

    setIsSaving(true);
    try {
      await apiClient.patch(`/websites/${currentWebsite.id}/data`, {
        theme: theme
      });
      setOriginalTheme(theme);
      toast.success('Thème enregistré');
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setTheme(defaultTheme);
  };

  // Revert changes
  const handleRevert = () => {
    setTheme(originalTheme);
  };

  if (websitesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentWebsite) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Palette className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sélectionnez un site pour personnaliser le thème</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Thème"
        subtitle="Personnalisez l'apparence de votre site"
        icon={<PageIcon page="theme" />}
        backHref={currentWebsite ? `/${currentWebsite.id}` : '/'}
        actions={[
          ...(hasChanges ? [{
            label: 'Annuler',
            icon: <RotateCcw className="h-4 w-4 stroke-[2.5]" />,
            variant: 'outline' as const,
            onClick: handleRevert,
          }] : []),
          {
            label: 'Enregistrer',
            icon: isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
            onClick: handleSave,
            disabled: !hasChanges || isSaving,
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <PageIcon page="theme" size="md" />
              <p className="text-sm font-semibold hidden sm:block">Thème</p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleRevert} className="h-8">
                        <RotateCcw className="h-4 w-4 mr-1.5 stroke-[2.5]" />
                        <span className="hidden sm:inline">Annuler</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Annuler les modifications non enregistrées</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving} className="h-8">
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                      <span className="hidden sm:inline">Enregistrer</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sauvegarder les paramètres du thème</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        }
      />

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="colors" className="gap-2">
            <PaintBrush className="h-4 w-4" weight="fill" />
            Couleurs
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <TextT className="h-4 w-4" weight="bold" />
            Typographie
          </TabsTrigger>
          <TabsTrigger value="options" className="gap-2">
            <Sun className="h-4 w-4" weight="fill" />
            Options
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Couleurs principales</CardTitle>
                <CardDescription>
                  Définissez les couleurs de votre marque
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="primary">Couleur principale</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="primary"
                        type="color"
                        value={theme.primary_color}
                        onChange={(e) => updateTheme('primary_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.primary_color}
                        onChange={(e) => updateTheme('primary_color', e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="secondary">Couleur secondaire</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="secondary"
                        type="color"
                        value={theme.secondary_color}
                        onChange={(e) => updateTheme('secondary_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.secondary_color}
                        onChange={(e) => updateTheme('secondary_color', e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Couleurs de base</CardTitle>
                <CardDescription>
                  Arrière-plan et texte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="background">Arrière-plan</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="background"
                        type="color"
                        value={theme.background_color}
                        onChange={(e) => updateTheme('background_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.background_color}
                        onChange={(e) => updateTheme('background_color', e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="text">Couleur du texte</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="text"
                        type="color"
                        value={theme.text_color}
                        onChange={(e) => updateTheme('text_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.text_color}
                        onChange={(e) => updateTheme('text_color', e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: theme.background_color,
                  color: theme.text_color 
                }}
              >
                <h3 
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: theme.font_heading }}
                >
                  Titre d'exemple
                </h3>
                <p 
                  className="mb-4"
                  style={{ fontFamily: theme.font_body }}
                >
                  Voici un exemple de texte avec votre thème personnalisé.
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    Bouton principal
                  </button>
                  <button
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: theme.secondary_color }}
                  >
                    Bouton secondaire
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Police des titres</CardTitle>
                <CardDescription>
                  Utilisée pour les titres et en-têtes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={theme.font_heading} 
                  onValueChange={(value) => updateTheme('font_heading', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem 
                        key={font.value} 
                        value={font.value}
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p 
                  className="mt-4 text-2xl font-bold"
                  style={{ fontFamily: theme.font_heading }}
                >
                  Aperçu du titre
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Police du texte</CardTitle>
                <CardDescription>
                  Utilisée pour le contenu principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={theme.font_body} 
                  onValueChange={(value) => updateTheme('font_body', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem 
                        key={font.value} 
                        value={font.value}
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p 
                  className="mt-4"
                  style={{ fontFamily: theme.font_body }}
                >
                  Voici un aperçu du texte avec la police sélectionnée. 
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mode sombre</CardTitle>
                <CardDescription>
                  Permettre aux visiteurs de basculer en mode sombre
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {theme.enable_dark_mode ? (
                      <Moon className="h-5 w-5 text-muted-foreground" weight="fill" />
                    ) : (
                      <Sun className="h-5 w-5 text-muted-foreground" weight="fill" />
                    )}
                    <span>Mode sombre {theme.enable_dark_mode ? 'activé' : 'désactivé'}</span>
                  </div>
                  <Switch
                    checked={theme.enable_dark_mode}
                    onCheckedChange={(checked) => updateTheme('enable_dark_mode', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bordures arrondies</CardTitle>
                <CardDescription>
                  Style des coins des éléments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={theme.border_radius} 
                  onValueChange={(value) => updateTheme('border_radius', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {radiusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 bg-primary"
                            style={{ borderRadius: option.preview }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Réinitialiser</CardTitle>
              <CardDescription>
                Revenir aux paramètres par défaut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleReset}>
                <ArrowCounterClockwise className="h-4 w-4 mr-2" />
                Réinitialiser le thème
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
