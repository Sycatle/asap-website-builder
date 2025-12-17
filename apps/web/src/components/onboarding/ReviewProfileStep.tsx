/**
 * V1 MVP: Review Profile Step
 * 
 * Step 3 of onboarding: Review and edit profile information.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, ArrowLeft, User, Briefcase, Code, Mail, 
  Plus, X, Eye, Sparkles, Lightbulb
} from 'lucide-react';
import type { FreelanceDevProfile, FreelanceService, FreelanceProject } from '@asap/shared';

interface ReviewProfileStepProps {
  profile: FreelanceDevProfile;
  onProfileChange: (profile: FreelanceDevProfile) => void;
  onNext: () => void;
  onBack: () => void;
  onPreview: () => void;
  isLoading?: boolean;
}

export function ReviewProfileStep({
  profile,
  onProfileChange,
  onNext,
  onBack,
  onPreview,
  isLoading = false,
}: ReviewProfileStepProps) {
  const [activeTab, setActiveTab] = React.useState('identity');

  // Helper to update nested profile fields
  const updateField = <K extends keyof FreelanceDevProfile>(
    section: K,
    updates: Partial<FreelanceDevProfile[K]>
  ) => {
    onProfileChange({
      ...profile,
      [section]: { ...(profile[section] as object), ...updates },
    });
  };

  // Helper for updating array fields
  const updateArrayField = <K extends 'services' | 'projects' | 'process' | 'stack' | 'proof'>(
    section: K,
    newArray: FreelanceDevProfile[K]
  ) => {
    onProfileChange({
      ...profile,
      [section]: newArray,
    });
  };

  // Calculate completion
  const completionItems = [
    { label: 'Nom & titre', done: !!profile.identity.name && !!profile.identity.title },
    { label: 'Photo', done: !!profile.identity.avatar },
    { label: 'Services', done: profile.services.length >= 2 },
    { label: 'Projets', done: profile.projects.length >= 1 },
    { label: 'Stack technique', done: profile.stack.length >= 1 },
    { label: 'Contact', done: !!profile.contact.email },
  ];
  const completedCount = completionItems.filter(item => item.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* Completion Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{completionPercent}%</span>
              </div>
              <div>
                <p className="font-medium">Profil {completionPercent === 100 ? 'complet' : 'en cours'}</p>
                <p className="text-sm text-muted-foreground">
                  {completedCount} / {completionItems.length} sections remplies
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {completionItems.map((item, i) => (
                <Badge 
                  key={i} 
                  variant={item.done ? 'default' : 'outline'}
                  className={!item.done ? 'opacity-50' : ''}
                >
                  {item.done ? '✓' : '○'} {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Editor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Identité</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Projets</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Votre identité
              </CardTitle>
              <CardDescription>
                Les informations de base qui apparaîtront sur votre portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={profile.identity.name}
                    onChange={(e) => updateField('identity', { name: e.target.value })}
                    placeholder="Marie Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Titre professionnel *</Label>
                  <Input
                    id="title"
                    value={profile.identity.title}
                    onChange={(e) => updateField('identity', { title: e.target.value })}
                    placeholder="Développeuse Full-Stack Freelance"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Phrase d'accroche</Label>
                <Textarea
                  id="tagline"
                  value={profile.identity.tagline || ''}
                  onChange={(e) => updateField('identity', { tagline: e.target.value })}
                  placeholder="Je transforme vos idées en applications web performantes..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Une phrase courte qui résume votre proposition de valeur
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    value={profile.identity.location || ''}
                    onChange={(e) => updateField('identity', { location: e.target.value })}
                    placeholder="Paris, France"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Disponibilité</Label>
                  <select
                    id="availability"
                    value={profile.identity.availability}
                    onChange={(e) => updateField('identity', { 
                      availability: e.target.value as 'available' | 'busy' | 'not-available' 
                    })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="available">Disponible</option>
                    <option value="busy">Occupé (missions en cours)</option>
                    <option value="not-available">Non disponible</option>
                  </select>
                </div>
              </div>

              {/* AI Suggestion */}
              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">💡 Suggestion</p>
                  <p className="text-sm text-muted-foreground">
                    Un titre professionnel clair et une phrase d'accroche impactante 
                    augmentent de 3x vos chances d'être contacté.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Vos services
              </CardTitle>
              <CardDescription>
                Définissez les services que vous proposez à vos clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesEditor
                services={profile.services}
                onChange={(services) => updateArrayField('services', services)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Vos projets
              </CardTitle>
              <CardDescription>
                Les projets qui seront mis en avant sur votre portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectsEditor
                projects={profile.projects}
                onChange={(projects) => updateArrayField('projects', projects)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact & réseaux
              </CardTitle>
              <CardDescription>
                Comment vos prospects peuvent vous contacter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.contact.email}
                    onChange={(e) => updateField('contact', { email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.contact.phone || ''}
                    onChange={(e) => updateField('contact', { phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={profile.contact.socials.github || ''}
                    onChange={(e) => updateField('contact', { 
                      socials: { ...profile.contact.socials, github: e.target.value }
                    })}
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={profile.contact.socials.linkedin || ''}
                    onChange={(e) => updateField('contact', { 
                      socials: { ...profile.contact.socials, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingUrl">Lien de prise de rendez-vous</Label>
                <Input
                  id="bookingUrl"
                  value={profile.contact.bookingUrl || ''}
                  onChange={(e) => updateField('contact', { bookingUrl: e.target.value })}
                  placeholder="https://calendly.com/username"
                />
                <p className="text-xs text-muted-foreground">
                  Calendly, Cal.com, ou tout autre outil de prise de rendez-vous
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPreview} className="gap-2">
            <Eye className="h-4 w-4" />
            Aperçu
          </Button>
          <Button onClick={onNext} disabled={isLoading} className="gap-2">
            Continuer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Services Editor Component
interface ServicesEditorProps {
  services: FreelanceService[];
  onChange: (services: FreelanceService[]) => void;
}

function ServicesEditor({ services, onChange }: ServicesEditorProps) {
  const addService = () => {
    onChange([
      ...services,
      {
        title: '',
        description: '',
        icon: 'code',
      },
    ]);
  };

  const updateService = (index: number, updates: Partial<FreelanceService>) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], ...updates };
    onChange(newServices);
  };

  const removeService = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  const PRESET_SERVICES: FreelanceService[] = [
    { title: 'Développement Web', description: 'Applications web modernes et performantes', icon: 'code' },
    { title: 'API & Backend', description: 'APIs RESTful et architectures robustes', icon: 'server' },
    { title: 'Consulting Technique', description: 'Audit, conseil et accompagnement', icon: 'consulting' },
  ];

  return (
    <div className="space-y-4">
      {services.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">
            Ajoutez vos services pour que vos clients sachent ce que vous proposez
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESET_SERVICES.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => onChange([...services, preset])}
              >
                + {preset.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {services.map((service, index) => (
        <div key={`service-${index}`} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Service {index + 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeService(index)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={service.title}
              onChange={(e) => updateService(index, { title: e.target.value })}
              placeholder="Titre du service"
            />
            <Input
              value={service.description}
              onChange={(e) => updateService(index, { description: e.target.value })}
              placeholder="Description courte"
            />
          </div>
        </div>
      ))}

      {services.length > 0 && services.length < 6 && (
        <Button variant="outline" onClick={addService} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un service
        </Button>
      )}
    </div>
  );
}

// Projects Editor Component
interface ProjectsEditorProps {
  projects: FreelanceProject[];
  onChange: (projects: FreelanceProject[]) => void;
}

function ProjectsEditor({ projects, onChange }: ProjectsEditorProps) {
  const updateProject = (index: number, updates: Partial<FreelanceProject>) => {
    const newProjects = [...projects];
    newProjects[index] = { ...newProjects[index], ...updates };
    onChange(newProjects);
  };

  const removeProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const toggleFeatured = (index: number) => {
    updateProject(index, { featured: !projects[index].featured });
  };

  if (projects.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <Code className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          Vos projets importés depuis GitHub apparaîtront ici.
          <br />
          Retournez à l'étape précédente pour en importer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project, index) => (
        <div key={project.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{project.title}</span>
              {project.featured && (
                <Badge variant="default" className="text-xs">
                  Mis en avant
                </Badge>
              )}
              {project.fromGithub && (
                <Badge variant="secondary" className="text-xs">
                  GitHub
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeatured(index)}
                className="text-xs"
              >
                {project.featured ? 'Retirer' : 'Mettre en avant'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeProject(index)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Textarea
            value={project.description}
            onChange={(e) => updateProject(index, { description: e.target.value })}
            placeholder="Description du projet"
            rows={2}
          />

          <div className="flex flex-wrap gap-1">
            {project.technologies.map((tech: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
