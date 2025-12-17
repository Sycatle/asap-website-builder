"use client"

import { useState, useCallback } from "react"
import type { WebsiteElement, UpdateElementRequest } from "@/lib/api"
import { getElementLabel } from "@/lib/constants/elements"
import { ELEMENT_LAYOUTS } from "@asap/shared"
import type { ElementType } from "@asap/shared"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Image,
  Link2,
  Type,
  AlignLeft,
  Palette,
  Save,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface PropertyEditorProps {
  element: WebsiteElement
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<WebsiteElement>
  isUpdating?: boolean
}

// Type alias for content data
type ContentData = Record<string, unknown>

// Helper to update nested data
function updateData(data: ContentData, key: string, value: unknown): ContentData {
  return { ...data, [key]: value }
}

// Helper to safely get string value
function getString(data: ContentData, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

// ============================================
// Base Property Editor - Common fields
// ============================================
function BasePropertyEditor({ element, onUpdate, isUpdating, children }: PropertyEditorProps & { children?: React.ReactNode }) {
  const [title, setTitle] = useState(element.title)
  const [layout, setLayout] = useState(element.layout)
  const [visible, setVisible] = useState(element.visible)
  const [isDirty, setIsDirty] = useState(false)

  const layouts = ELEMENT_LAYOUTS[element.element_type as ElementType] || [{ value: 'default', label: 'Par défaut' }]

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    try {
      await onUpdate(element.id, { title, layout, visible })
      setIsDirty(false)
      toast.success('Élément mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }, [element.id, title, layout, visible, isDirty, onUpdate])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    setIsDirty(true)
  }

  const handleLayoutChange = (value: string) => {
    setLayout(value)
    setIsDirty(true)
  }

  const handleVisibleChange = (value: boolean) => {
    setVisible(value)
    setIsDirty(true)
  }

  return (
    <div className="space-y-6">
      {/* Element header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{getElementLabel(element.element_type)}</h3>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Sauver
              </>
            )}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Type className="h-3 w-3" /> Titre de l'élément
            </Label>
            <Input 
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Titre de l'élément"
              className="h-9"
            />
          </div>
          
          {layouts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" /> Mise en page
              </Label>
              <Select value={layout} onValueChange={handleLayoutChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm">Visible</Label>
            <Switch checked={visible} onCheckedChange={handleVisibleChange} />
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Custom fields */}
      {children}
    </div>
  )
}

// ============================================
// Hero Element Editor
// ============================================
export function HeroPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const [data, setData] = useState<ContentData>(element.content || element.data || {})
  const [isDirty, setIsDirty] = useState(false)

  const updateField = (key: string, value: string) => {
    setData(prev => updateData(prev, key, value))
    setIsDirty(true)
  }

  const handleSaveData = async () => {
    try {
      await onUpdate(element.id, { data })
      setIsDirty(false)
      toast.success('Contenu mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Contenu</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Appliquer'}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom / Titre principal</Label>
            <Input 
              value={getString(data, 'name')}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Votre Nom"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Titre / Rôle</Label>
            <Input 
              value={getString(data, 'title')}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Développeur Full Stack"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea 
              value={getString(data, 'subtitle')}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="Une courte description..."
              className="resize-none"
              rows={2}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Bouton d'action
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input 
                value={getString(data, 'cta_text')}
                onChange={(e) => updateField('cta_text', e.target.value)}
                placeholder="Texte du bouton"
                className="h-9"
              />
              <Input 
                value={getString(data, 'cta_link')}
                onChange={(e) => updateField('cta_link', e.target.value)}
                placeholder="#section"
                className="h-9"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" /> Image de fond (URL)
            </Label>
            <Input 
              value={getString(data, 'background_image')}
              onChange={(e) => updateField('background_image', e.target.value)}
              placeholder="https://..."
              className="h-9"
            />
          </div>
        </div>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// About Element Editor
// ============================================
export function AboutPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const [data, setData] = useState<ContentData>(element.content || element.data || {})
  const [isDirty, setIsDirty] = useState(false)

  const updateField = (key: string, value: unknown) => {
    setData(prev => updateData(prev, key, value))
    setIsDirty(true)
  }

  const handleSaveData = async () => {
    try {
      await onUpdate(element.id, { data })
      setIsDirty(false)
      toast.success('Contenu mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const highlights = (data.highlights || []) as string[]
  
  const addHighlight = () => {
    updateField('highlights', [...highlights, ''])
  }
  
  const updateHighlight = (index: number, value: string) => {
    const updated = [...highlights]
    updated[index] = value
    updateField('highlights', updated)
  }
  
  const removeHighlight = (index: number) => {
    updateField('highlights', highlights.filter((_, i) => i !== index))
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Contenu</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Appliquer'}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <AlignLeft className="h-3 w-3" /> Description
            </Label>
            <Textarea 
              value={getString(data, 'description')}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Votre description..."
              className="resize-none"
              rows={4}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" /> Photo (URL)
            </Label>
            <Input 
              value={getString(data, 'image')}
              onChange={(e) => updateField('image', e.target.value)}
              placeholder="https://..."
              className="h-9"
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Points forts</Label>
              <Button size="sm" variant="ghost" onClick={addHighlight} className="h-7 px-2">
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </div>
            
            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Input 
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    placeholder={`Point ${index + 1}`}
                    className="h-8 flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeHighlight(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Skills Element Editor
// ============================================
interface SkillCategory {
  name: string
  skills: string[]
}

export function SkillsPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const [data, setData] = useState<ContentData>(element.content || element.data || {})
  const [isDirty, setIsDirty] = useState(false)

  const categories = (data.categories || []) as SkillCategory[]

  const updateCategories = (updated: SkillCategory[]) => {
    setData(prev => updateData(prev, 'categories', updated))
    setIsDirty(true)
  }

  const handleSaveData = async () => {
    try {
      await onUpdate(element.id, { data })
      setIsDirty(false)
      toast.success('Contenu mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const addCategory = () => {
    updateCategories([...categories, { name: 'Nouvelle catégorie', skills: [] }])
  }

  const updateCategory = (index: number, field: 'name' | 'skills', value: string | string[]) => {
    const updated = [...categories]
    updated[index] = { ...updated[index], [field]: value }
    updateCategories(updated)
  }

  const removeCategory = (index: number) => {
    updateCategories(categories.filter((_, i) => i !== index))
  }

  const addSkill = (catIndex: number) => {
    const updated = [...categories]
    updated[catIndex].skills = [...updated[catIndex].skills, '']
    updateCategories(updated)
  }

  const updateSkill = (catIndex: number, skillIndex: number, value: string) => {
    const updated = [...categories]
    updated[catIndex].skills[skillIndex] = value
    updateCategories(updated)
  }

  const removeSkill = (catIndex: number, skillIndex: number) => {
    const updated = [...categories]
    updated[catIndex].skills = updated[catIndex].skills.filter((_, i) => i !== skillIndex)
    updateCategories(updated)
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Catégories</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSaveData}
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Appliquer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={addCategory} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> Catégorie
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {categories.map((category, catIndex) => (
              <div key={catIndex} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    value={category.name}
                    onChange={(e) => updateCategory(catIndex, 'name', e.target.value)}
                    placeholder="Nom de la catégorie"
                    className="h-8 font-medium"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeCategory(catIndex)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-2 pl-2">
                  {category.skills.map((skill, skillIndex) => (
                    <div key={skillIndex} className="flex items-center gap-2">
                      <Input 
                        value={skill}
                        onChange={(e) => updateSkill(catIndex, skillIndex, e.target.value)}
                        placeholder="Compétence"
                        className="h-7 text-sm"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeSkill(catIndex, skillIndex)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => addSkill(catIndex)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Compétence
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Services Element Editor
// ============================================
interface Service {
  title: string
  description: string
  icon?: string
}

export function ServicesPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const [data, setData] = useState<ContentData>(element.content || element.data || {})
  const [isDirty, setIsDirty] = useState(false)

  const services = (data.services || []) as Service[]

  const updateServices = (updated: Service[]) => {
    setData(prev => updateData(prev, 'services', updated))
    setIsDirty(true)
  }

  const handleSaveData = async () => {
    try {
      await onUpdate(element.id, { data })
      setIsDirty(false)
      toast.success('Contenu mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const addService = () => {
    updateServices([...services, { title: 'Nouveau service', description: '' }])
  }

  const updateService = (index: number, field: keyof Service, value: string) => {
    const updated = [...services]
    updated[index] = { ...updated[index], [field]: value }
    updateServices(updated)
  }

  const removeService = (index: number) => {
    updateServices(services.filter((_, i) => i !== index))
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Services</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSaveData}
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Appliquer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={addService} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> Service
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    value={service.title}
                    onChange={(e) => updateService(index, 'title', e.target.value)}
                    placeholder="Nom du service"
                    className="h-8 font-medium flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeService(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea 
                  value={service.description}
                  onChange={(e) => updateService(index, 'description', e.target.value)}
                  placeholder="Description du service"
                  className="resize-none text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Contact Element Editor
// ============================================
export function ContactPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const [data, setData] = useState<ContentData>(element.content || element.data || {})
  const [isDirty, setIsDirty] = useState(false)

  const updateField = (key: string, value: unknown) => {
    setData(prev => updateData(prev, key, value))
    setIsDirty(true)
  }

  const handleSaveData = async () => {
    try {
      await onUpdate(element.id, { data })
      setIsDirty(false)
      toast.success('Contenu mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const socials = (data.socials || []) as { platform: string; url: string }[]

  const addSocial = () => {
    updateField('socials', [...socials, { platform: '', url: '' }])
  }

  const updateSocial = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socials]
    updated[index] = { ...updated[index], [field]: value }
    updateField('socials', updated)
  }

  const removeSocial = (index: number) => {
    updateField('socials', socials.filter((_, i) => i !== index))
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Informations</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Appliquer'}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input 
              type="email"
              value={getString(data, 'email')}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contact@example.com"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Téléphone</Label>
            <Input 
              value={getString(data, 'phone')}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Localisation</Label>
            <Input 
              value={getString(data, 'location')}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Paris, France"
              className="h-9"
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Réseaux sociaux</Label>
              <Button size="sm" variant="ghost" onClick={addSocial} className="h-7 px-2">
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </div>
            
            <div className="space-y-2">
              {socials.map((social, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select 
                    value={social.platform} 
                    onValueChange={(value) => updateSocial(index, 'platform', value)}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="website">Site web</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={social.url}
                    onChange={(e) => updateSocial(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="h-8 flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeSocial(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Generic Property Editor for other elements
// ============================================
export function GenericPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Éditeur avancé bientôt disponible</p>
        <p className="text-xs mt-1">Les propriétés de base sont modifiables ci-dessus</p>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Property Editor Router
// ============================================
export function PropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const editors: Record<string, React.ComponentType<PropertyEditorProps>> = {
    hero: HeroPropertyEditor,
    about: AboutPropertyEditor,
    skills: SkillsPropertyEditor,
    services: ServicesPropertyEditor,
    contact: ContactPropertyEditor,
  }

  const Editor = editors[element.element_type] || GenericPropertyEditor
  
  return <Editor element={element} onUpdate={onUpdate} isUpdating={isUpdating} />
}
