# Plan d'Action Court Terme - ASAP v2

**Date :** 15 décembre 2025  
**Période :** 4 semaines (Sprint 1-4)  
**Objectif :** MVP utilisable avec dashboard fonctionnel

---

## 📊 État Actuel

### ✅ Complété (Phase 1-4)
- Backend Core API (Rust/Axum) - 100%
- Worker avec event processor - 100%
- WebSocket + Redis Pub/Sub - 100%
- Notifications (in-app + push) - 100%
- PWA (score 93/100) - 100%
- Paiements Stripe - 100%
- 7 migrations SQL appliquées
- 15,000 lignes Rust, 100+ tests

### 🔨 En cours (Phase 5)
- Frontend Astro + React - 35%
- Landing page ✅
- Signup/Login ✅
- Client API TypeScript ✅
- Dashboard principal 🚧

### ❌ Manquant pour MVP utilisable
- Dashboard complet (liste websites, création)
- Sélecteur de presets
- Éditeur de sections basique
- Prévisualisation website
- Pages publiques ([slug])

---

## 🎯 Sprint 1 (Semaine 1) : Dashboard Fonctionnel

**Objectif :** Dashboard avec liste et création de websites

### Tâches Backend (si nécessaire)

#### 1. Vérifier endpoints essentiels
```bash
# Tester les endpoints nécessaires
curl http://localhost:3000/presets
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/websites
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/websites/:id
```

**Endpoints requis :**
- ✅ `GET /presets` - Liste presets disponibles
- ✅ `GET /websites` - Liste websites du compte
- ✅ `POST /websites/from-preset` - Créer depuis preset
- ✅ `GET /websites/:id` - Détails d'un website
- ✅ `PUT /websites/:id` - Modifier website
- ✅ `DELETE /websites/:id` - Supprimer website

**Action :** Si manquants, ajouter les routes dans `apps/api/src/routes/`

### Tâches Frontend (Prioritaire)

#### 1.1 Composants de base (Jour 1)
```typescript
// apps/web/src/components/ui/

// Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Card.tsx
export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Badge.tsx
export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

// LoadingSpinner.tsx
export const LoadingSpinner = ({ size = 'md' }) => { ... }
```

**Fichiers à créer :**
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Badge.tsx`
- `apps/web/src/components/ui/LoadingSpinner.tsx`
- `apps/web/src/components/ui/EmptyState.tsx`

#### 1.2 Hooks utilitaires (Jour 1)
```typescript
// apps/web/src/hooks/

// useWebsites.ts
export const useWebsites = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchWebsites = async () => { ... }
  const createWebsite = async (data: CreateWebsiteInput) => { ... }
  const deleteWebsite = async (id: string) => { ... }
  
  return { websites, loading, error, fetchWebsites, createWebsite, deleteWebsite };
}

// usePresets.ts
export const usePresets = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  // ...
}
```

**Fichiers à créer :**
- `apps/web/src/hooks/useWebsites.ts`
- `apps/web/src/hooks/usePresets.ts`
- `apps/web/src/hooks/useToast.ts`

#### 1.3 Dashboard principal (Jour 2-3)
```typescript
// apps/web/src/pages/app/dashboard.tsx

export default function DashboardPage() {
  const { websites, loading } = useWebsites();
  
  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mes Websites</h1>
          <Button onClick={handleCreate}>Créer un website</Button>
        </div>
        
        {loading ? (
          <LoadingSpinner />
        ) : websites.length === 0 ? (
          <EmptyState
            title="Aucun website"
            description="Créez votre premier website en quelques clics"
            action={<Button>Créer mon premier site</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map(website => (
              <WebsiteCard key={website.id} website={website} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/pages/app/dashboard.tsx`
- `apps/web/src/components/dashboard/WebsiteCard.tsx`
- `apps/web/src/components/dashboard/WebsiteStats.tsx`

#### 1.4 Modale création website (Jour 3-4)
```typescript
// apps/web/src/components/dashboard/CreateWebsiteModal.tsx

export const CreateWebsiteModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'preset' | 'details'>('preset');
  const { presets } = usePresets();
  const { createWebsite } = useWebsites();
  
  const handleSubmit = async (data) => {
    await createWebsite({
      preset_id: selectedPreset.id,
      slug: data.slug,
      title: data.title
    });
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {step === 'preset' ? (
        <PresetSelector
          presets={presets}
          onSelect={handlePresetSelect}
        />
      ) : (
        <WebsiteDetailsForm
          onSubmit={handleSubmit}
          onBack={() => setStep('preset')}
        />
      )}
    </Modal>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/dashboard/CreateWebsiteModal.tsx`
- `apps/web/src/components/dashboard/PresetSelector.tsx`
- `apps/web/src/components/dashboard/WebsiteDetailsForm.tsx`
- `apps/web/src/components/ui/Modal.tsx`

#### 1.5 Tests unitaires (Jour 4-5)
```typescript
// apps/web/src/hooks/__tests__/useWebsites.test.ts

describe('useWebsites', () => {
  it('should fetch websites on mount', async () => { ... });
  it('should create website successfully', async () => { ... });
  it('should handle errors', async () => { ... });
});
```

**Fichiers à créer :**
- `apps/web/src/hooks/__tests__/useWebsites.test.ts`
- `apps/web/src/components/__tests__/WebsiteCard.test.tsx`

### Critères d'acceptation Sprint 1
- [ ] Utilisateur authentifié voit la liste de ses websites
- [ ] Utilisateur peut créer un website depuis un preset
- [ ] Utilisateur peut supprimer un website
- [ ] Interface responsive (mobile, tablet, desktop)
- [ ] Messages d'erreur clairs
- [ ] Loading states appropriés

---

## 🎯 Sprint 2 (Semaine 2) : Édition Website Basique

**Objectif :** Modifier informations website et gérer sections

### Tâches Frontend

#### 2.1 Page détails website (Jour 1-2)
```typescript
// apps/web/src/pages/app/websites/[id].tsx

export default function WebsiteDetailsPage() {
  const { id } = useParams();
  const { website, loading, updateWebsite } = useWebsite(id);
  const { sections } = useSections(id);
  
  return (
    <AppLayout>
      <WebsiteHeader website={website} />
      
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <WebsiteDetailsTab website={website} onUpdate={updateWebsite} />
        </TabsContent>
        
        <TabsContent value="sections">
          <SectionsTab sections={sections} websiteId={id} />
        </TabsContent>
        
        {/* ... */}
      </Tabs>
    </AppLayout>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/pages/app/websites/[id].tsx`
- `apps/web/src/components/website/WebsiteHeader.tsx`
- `apps/web/src/components/website/WebsiteDetailsTab.tsx`
- `apps/web/src/components/ui/Tabs.tsx`

#### 2.2 Gestion sections (Jour 2-4)
```typescript
// apps/web/src/components/website/SectionsTab.tsx

export const SectionsTab = ({ sections, websiteId }) => {
  const { createSection, updateSection, deleteSection, reorderSections } = useSections(websiteId);
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2>Sections ({sections.length})</h2>
        <Button onClick={handleAddSection}>Ajouter une section</Button>
      </div>
      
      <SortableList
        items={sections}
        onReorder={reorderSections}
        renderItem={(section) => (
          <SectionCard
            section={section}
            onEdit={() => handleEdit(section)}
            onDelete={() => deleteSection(section.id)}
          />
        )}
      />
    </div>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/website/SectionsTab.tsx`
- `apps/web/src/components/sections/SectionCard.tsx`
- `apps/web/src/components/sections/SectionEditor.tsx`
- `apps/web/src/components/sections/AddSectionModal.tsx`
- `apps/web/src/components/ui/SortableList.tsx`
- `apps/web/src/hooks/useSections.ts`

#### 2.3 Éditeur section basique (Jour 4-5)
```typescript
// apps/web/src/components/sections/SectionEditor.tsx

export const SectionEditor = ({ section, onSave }) => {
  const [formData, setFormData] = useState(section);
  
  const handleSave = async () => {
    await onSave(formData);
  };
  
  return (
    <form onSubmit={handleSave}>
      <Input
        label="Titre de la section"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      
      <Select
        label="Type de section"
        value={formData.section_type}
        options={SECTION_TYPES}
        disabled // Type non modifiable après création
      />
      
      <Select
        label="Layout"
        value={formData.layout}
        options={getLayoutsForType(formData.section_type)}
        onChange={(value) => setFormData({ ...formData, layout: value })}
      />
      
      <Toggle
        label="Visible"
        checked={formData.visible}
        onChange={(checked) => setFormData({ ...formData, visible: checked })}
      />
      
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/sections/SectionEditor.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Select.tsx`
- `apps/web/src/components/ui/Toggle.tsx`
- `apps/web/src/lib/constants/sections.ts`

### Critères d'acceptation Sprint 2
- [ ] Utilisateur peut modifier titre et tagline d'un website
- [ ] Utilisateur voit la liste des sections de son website
- [ ] Utilisateur peut ajouter une nouvelle section
- [ ] Utilisateur peut modifier une section existante
- [ ] Utilisateur peut supprimer une section
- [ ] Utilisateur peut réordonner les sections (drag & drop)
- [ ] Utilisateur peut activer/désactiver la visibilité d'une section

---

## 🎯 Sprint 3 (Semaine 3) : Prévisualisation & Pages Publiques

**Objectif :** Voir son website en preview et publier

### Tâches Backend

#### 3.1 Optimisation projection (si nécessaire)
```rust
// Vérifier que le module projections génère bien les fichiers
// apps/worker/src/modules/projections/mod.rs

// Vérifier endpoint public
// apps/api/src/routes/public.rs
```

**Action :** Tester génération projections manuellement
```bash
# Publier un website
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/websites/:id/publish

# Vérifier fichier généré
ls -la data/sites/
cat data/sites/mon-site.json
```

### Tâches Frontend

#### 3.1 Prévisualisation inline (Jour 1-2)
```typescript
// apps/web/src/components/website/PreviewPanel.tsx

export const PreviewPanel = ({ websiteId, sections }) => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Écouter les changements via WebSocket
  useWebSocketSync(websiteId, (event) => {
    if (event.type === 'website_updated') {
      // Recharger preview
      iframeRef.current?.contentWindow?.location.reload();
    }
  });
  
  return (
    <div className="preview-container">
      <div className="preview-toolbar">
        <DeviceSelector value={device} onChange={setDevice} />
        <Button onClick={handleRefresh}>Rafraîchir</Button>
        <Button onClick={handleOpenInNewTab}>Ouvrir dans un nouvel onglet</Button>
      </div>
      
      <div className={`preview-frame ${device}`}>
        <iframe
          ref={iframeRef}
          src={`/preview/${websiteId}`}
          title="Preview"
        />
      </div>
    </div>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/website/PreviewPanel.tsx`
- `apps/web/src/components/website/DeviceSelector.tsx`
- `apps/web/src/pages/preview/[id].astro` (route preview)

#### 3.2 Pages publiques (Jour 3-5)
```astro
---
// apps/web/src/pages/[slug].astro
import { getWebsiteBySlug } from '@/lib/api/websites';

const { slug } = Astro.params;
const website = await getWebsiteBySlug(slug);

if (!website || website.status !== 'published') {
  return Astro.redirect('/404');
}

const sections = website.sections || [];
---

<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{website.title}</title>
    <meta name="description" content={website.tagline} />
  </head>
  <body>
    {sections.map(section => (
      <Section type={section.section_type} data={section} />
    ))}
  </body>
</html>
```

**Fichiers à créer :**
- `apps/web/src/pages/[slug].astro`
- `apps/web/src/components/public/Section.astro`
- `apps/web/src/components/public/sections/Hero.astro`
- `apps/web/src/components/public/sections/About.astro`
- `apps/web/src/components/public/sections/Projects.astro`
- `apps/web/src/lib/api/public.ts`

#### 3.3 Bouton publication (Jour 5)
```typescript
// apps/web/src/components/website/PublishButton.tsx

export const PublishButton = ({ website }) => {
  const [publishing, setPublishing] = useState(false);
  const { publishWebsite, unpublishWebsite } = useWebsite(website.id);
  
  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (website.status === 'published') {
        await unpublishWebsite();
        toast.success('Website dépublié');
      } else {
        await publishWebsite();
        toast.success('Website publié !');
        // Ouvrir dans nouvel onglet
        window.open(`/${website.slug}`, '_blank');
      }
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };
  
  return (
    <Button
      onClick={handlePublish}
      loading={publishing}
      variant={website.status === 'published' ? 'secondary' : 'primary'}
    >
      {website.status === 'published' ? 'Dépublier' : 'Publier'}
    </Button>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/website/PublishButton.tsx`

### Critères d'acceptation Sprint 3
- [ ] Utilisateur peut prévisualiser son website dans le dashboard
- [ ] Preview responsive (mobile, tablet, desktop)
- [ ] Preview se met à jour en temps réel (WebSocket)
- [ ] Utilisateur peut publier son website
- [ ] Website publié accessible via `/{slug}`
- [ ] SEO meta tags présents (title, description)
- [ ] Performance optimale (SSG)

---

## 🎯 Sprint 4 (Semaine 4) : Configuration Modules & Polissage

**Objectif :** Activer modules et finaliser MVP

### Tâches Frontend

#### 4.1 Tab modules (Jour 1-2)
```typescript
// apps/web/src/components/website/ModulesTab.tsx

export const ModulesTab = ({ websiteId, activeModules }) => {
  const { catalog } = useModuleCatalog();
  const { activateModule, deactivateModule, configureModule } = useModules(websiteId);
  
  return (
    <div>
      <h2>Modules activés</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map(module => {
          const isActive = activeModules.find(m => m.module_id === module.id);
          
          return (
            <ModuleCard
              key={module.id}
              module={module}
              isActive={!!isActive}
              onToggle={() => isActive 
                ? deactivateModule(isActive.id)
                : activateModule(module.id)
              }
              onConfigure={() => handleConfigure(module)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/website/ModulesTab.tsx`
- `apps/web/src/components/modules/ModuleCard.tsx`
- `apps/web/src/components/modules/ModuleConfigModal.tsx`
- `apps/web/src/hooks/useModules.ts`

#### 4.2 Configuration GitHub (Jour 2-3)
```typescript
// apps/web/src/components/modules/GitHubConfigModal.tsx

export const GitHubConfigModal = ({ onSave }) => {
  const [username, setUsername] = useState('');
  const { updateIntegration } = useAccount();
  
  const handleSave = async () => {
    await updateIntegration('github', { username });
    onSave();
  };
  
  return (
    <Modal>
      <h3>Configuration GitHub</h3>
      <p>Connectez votre compte GitHub pour importer automatiquement vos projets.</p>
      
      <Input
        label="Nom d'utilisateur GitHub"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="octocat"
      />
      
      <Button onClick={handleSave}>Enregistrer</Button>
    </Modal>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/modules/GitHubConfigModal.tsx`
- `apps/web/src/hooks/useAccount.ts`

#### 4.3 Upload fichiers (Jour 3-4)
```typescript
// apps/web/src/components/files/FileUpload.tsx

export const FileUpload = () => {
  const { uploadFile, files, deleteFile } = useFiles();
  const { quota } = useQuota();
  
  const handleDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  };
  
  return (
    <div>
      <QuotaIndicator current={quota.used} total={quota.total} />
      
      <Dropzone onDrop={handleDrop}>
        <p>Glissez-déposez vos fichiers ici</p>
      </Dropzone>
      
      <FileList files={files} onDelete={deleteFile} />
    </div>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/files/FileUpload.tsx`
- `apps/web/src/components/files/FileList.tsx`
- `apps/web/src/components/files/QuotaIndicator.tsx`
- `apps/web/src/hooks/useFiles.ts`
- `apps/web/src/hooks/useQuota.ts`

#### 4.4 Notifications UI (Jour 4-5)
```typescript
// apps/web/src/components/notifications/NotificationDropdown.tsx

export const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dropdown isOpen={isOpen} onToggle={setIsOpen}>
      <DropdownTrigger>
        <button className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1">
              {unreadCount}
            </Badge>
          )}
        </button>
      </DropdownTrigger>
      
      <DropdownContent>
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <EmptyState message="Aucune notification" />
          ) : (
            notifications.map(notif => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onClick={() => markAsRead(notif.id)}
              />
            ))
          )}
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
```

**Fichiers à créer :**
- `apps/web/src/components/notifications/NotificationDropdown.tsx`
- `apps/web/src/components/notifications/NotificationItem.tsx`
- `apps/web/src/hooks/useNotifications.ts`
- `apps/web/src/components/ui/Dropdown.tsx`

#### 4.5 Polissage & Tests (Jour 5)
- Vérifier tous les flows utilisateur
- Corriger bugs visuels
- Améliorer messages d'erreur
- Optimiser loading states
- Tester sur mobile

### Critères d'acceptation Sprint 4
- [ ] Utilisateur peut activer/désactiver des modules
- [ ] Utilisateur peut configurer le module GitHub
- [ ] Utilisateur peut uploader des fichiers
- [ ] Utilisateur voit son quota de stockage
- [ ] Utilisateur reçoit et voit les notifications
- [ ] Interface cohérente et polie
- [ ] Pas de bugs bloquants

---

## 📦 Livrables Finaux (Fin Semaine 4)

### Fonctionnalités MVP
- ✅ Authentification (signup, login, logout)
- ✅ Dashboard avec liste websites
- ✅ Création website depuis preset
- ✅ Édition website (titre, tagline)
- ✅ Gestion sections (CRUD, réordonnancement)
- ✅ Prévisualisation temps réel
- ✅ Publication website
- ✅ Pages publiques performantes
- ✅ Activation modules
- ✅ Configuration GitHub
- ✅ Upload fichiers avec quotas
- ✅ Notifications UI

### Qualité
- [ ] Tests unitaires (composants clés)
- [ ] Tests E2E (parcours principaux)
- [ ] Performance (Lighthouse >90)
- [ ] Responsive design
- [ ] Messages d'erreur clairs
- [ ] Documentation utilisateur basique

### Infrastructure
- [ ] CI/CD basique (GitHub Actions)
- [ ] Build automatique
- [ ] Deploy staging automatique
- [ ] Monitoring erreurs (Sentry)

---

## 🚀 Commandes de Développement

### Backend
```bash
# Lancer API
cd apps/api && cargo run

# Lancer Worker
cd apps/worker && cargo run

# Lancer tests
cargo test

# Lancer Redis (si pas Docker)
redis-server
```

### Frontend
```bash
# Installer dépendances
cd apps/web && npm install

# Développement
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Tests
npm run test

# Linter
npm run lint
```

### Docker (Environnement complet)
```bash
# Lancer tout
docker compose -f infra/docker-compose.yml up

# Logs
docker compose logs -f api
docker compose logs -f worker

# Rebuild
docker compose build
```

---

## 📊 Métriques de Succès

### Technique
- [ ] Temps de build <2min
- [ ] Temps de chargement page <2s
- [ ] Score Lighthouse >90
- [ ] 0 erreurs console
- [ ] 0 warnings TypeScript

### Fonctionnel
- [ ] Création website <1min
- [ ] Publication website <5s
- [ ] Preview temps réel <100ms
- [ ] Upload fichier <10s

### Utilisateur
- [ ] Onboarding <5min
- [ ] Parcours complet <10min
- [ ] 0 bugs bloquants
- [ ] Interface intuitive

---

## 🔧 Stack Technique Confirmée

### Backend
- **Rust 1.70+** - Axum, Tokio, SQLx
- **PostgreSQL 15+** - Base de données
- **Redis 7+** - Cache + Pub/Sub
- **Docker** - Containerisation

### Frontend
- **Astro 4+** - Framework SSG/SSR
- **React 18+** - Composants UI
- **TypeScript 5+** - Typage strict
- **TailwindCSS 3+** - Styling
- **Zustand** - State management
- **React Query** - Data fetching

### DevOps
- **GitHub Actions** - CI/CD
- **Docker Compose** - Local dev
- **Vercel/Railway** - Hosting (à décider)

---

## 📝 Notes Importantes

### Priorités
1. **Fonctionnel avant beau** - MVP utilisable > UI parfaite
2. **Tests critiques uniquement** - Couvrir parcours principaux
3. **Itératif** - Livrer fonctionnalité par fonctionnalité
4. **Feedback rapide** - Tester avec utilisateurs dès semaine 2

### Décisions Techniques
- Utiliser composants headless UI (Radix, HeadlessUI) pour accélérer
- Pas de design system complet pour MVP
- SSG par défaut, SSR si nécessaire
- WebSocket optionnel pour MVP (polling acceptable)
- Pas d'optimisation prématurée

### Risques Identifiés
- **Temps serré** - 4 semaines ambitieux → focus MVP strict
- **Scope creep** - Résister à l'ajout de features
- **Intégration backend/frontend** - Tester tôt
- **Performance pages publiques** - Tester avec 100+ websites

---

## 📅 Calendrier Détaillé

| Semaine | Sprint | Livrable | Demo |
|---------|--------|----------|------|
| Semaine 1 | Sprint 1 | Dashboard avec CRUD websites | ✅ Vendredi |
| Semaine 2 | Sprint 2 | Édition sections | ✅ Vendredi |
| Semaine 3 | Sprint 3 | Preview + Pages publiques | ✅ Vendredi |
| Semaine 4 | Sprint 4 | Modules + Polissage | ✅ Vendredi |

**Demo finale MVP : Fin semaine 4**

---

## ✅ Checklist de Validation MVP

### Must Have
- [ ] Un utilisateur peut s'inscrire
- [ ] Un utilisateur peut se connecter
- [ ] Un utilisateur peut créer un website depuis un preset
- [ ] Un utilisateur peut modifier son website
- [ ] Un utilisateur peut ajouter/modifier/supprimer des sections
- [ ] Un utilisateur peut prévisualiser son website
- [ ] Un utilisateur peut publier son website
- [ ] Un website publié est accessible publiquement
- [ ] Un utilisateur peut activer le module GitHub
- [ ] Un utilisateur peut uploader des fichiers

### Nice to Have (si temps)
- [ ] Drag & drop sections
- [ ] Édition inline sections
- [ ] Historique modifications
- [ ] Export website
- [ ] Thèmes personnalisables

### Won't Have (Post-MVP)
- ❌ A/B testing
- ❌ Analytics avancées
- ❌ AI Generator
- ❌ Custom domains
- ❌ Multi-langue
- ❌ Équipe collaborative
- ❌ Facturation

---

**Document de travail - Mise à jour quotidienne pendant les sprints**
