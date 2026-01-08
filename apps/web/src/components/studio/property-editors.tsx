"use client"

import { useState, useCallback } from "react"
import { useTranslation } from 'react-i18next'
import type { WebsiteElement, UpdateElementRequest } from "@/lib/api"
import { getElementLabel } from "@/lib/constants/elements"
import { ELEMENT_LAYOUTS } from "@asap/shared"
import type { ElementType } from "@asap/shared"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
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
import { Spinner } from "@/components/ui/spinner"
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Image,
  Link as LinkIcon,
  Type,
  AlignLeft,
  Palette,
  Save,
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
  const { t } = useTranslation(['common', 'editor'])
  const [title, setTitle] = useState(element.title)
  const [layout, setLayout] = useState(element.layout)
  const [visible, setVisible] = useState(element.visible)
  const [isDirty, setIsDirty] = useState(false)

  const layouts = ELEMENT_LAYOUTS[element.element_type as ElementType] || [{ value: 'default', label: t('editor:properties.layout.default') }]

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    try {
      await onUpdate(element.id, { title, layout, visible })
      setIsDirty(false)
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
    }
  }, [element.id, title, layout, visible, isDirty, onUpdate, t])

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
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {t('common:actions.save')}
              </>
            )}
          </Button>
        </div>
        
        <div className="space-y-3">
          <Field>
            <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <Type className="h-3 w-3" /> {t('editor:properties.elementTitle')}
            </FieldLabel>
            <Input 
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('editor:properties.elementTitle')}
              className="h-9"
            />
          </Field>
          
          {layouts.length > 1 && (
            <Field>
              <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" /> {t('editor:properties.style.layout')}
              </FieldLabel>
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
          </Field>
          )}
          
          <Field orientation="horizontal" className="py-2">
            <FieldLabel className="text-sm">{t('editor:properties.visible')}</FieldLabel>
            <Switch checked={visible} onCheckedChange={handleVisibleChange} />
          </Field>
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
  const { t } = useTranslation(['common', 'editor'])
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
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
    }
  }

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{t('editor:properties.tabs.content')}</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Spinner className="h-3 w-3" /> : t('common:actions.apply')}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.hero.name')}</FieldLabel>
            <Input 
              value={getString(data, 'name')}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('editor:properties.hero.namePlaceholder')}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.hero.title')}</FieldLabel>
            <Input 
              value={getString(data, 'title')}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('editor:properties.hero.titlePlaceholder')}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.hero.subtitle')}</FieldLabel>
            <Textarea 
              value={getString(data, 'subtitle')}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder={t('editor:properties.hero.subtitlePlaceholder')}
              className="resize-none"
              rows={2}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> {t('editor:properties.hero.ctaButton')}
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Input 
                value={getString(data, 'cta_text')}
                onChange={(e) => updateField('cta_text', e.target.value)}
                placeholder={t('editor:properties.hero.ctaTextPlaceholder')}
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
            <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" /> {t('editor:properties.hero.backgroundImage')}
            </FieldLabel>
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
  const { t } = useTranslation(['common', 'editor'])
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
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
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
          <h4 className="text-sm font-medium">{t('editor:properties.tabs.content')}</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Spinner className="h-3 w-3" /> : t('common:actions.apply')}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <AlignLeft className="h-3 w-3" /> {t('editor:properties.about.description')}
            </FieldLabel>
            <Textarea 
              value={getString(data, 'description')}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t('editor:properties.about.descriptionPlaceholder')}
              className="resize-none"
              rows={4}
            />
          </div>
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" /> {t('editor:properties.about.photo')}
            </FieldLabel>
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
              <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.about.highlights')}</FieldLabel>
              <Button size="sm" variant="ghost" onClick={addHighlight} className="h-7 px-2">
                <Plus className="h-3 w-3 mr-1" /> {t('common:actions.add')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Input 
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    placeholder={t('editor:properties.about.highlightPlaceholder', { number: index + 1 })}
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
  const { t } = useTranslation(['common', 'editor'])
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
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
    }
  }

  const addCategory = () => {
    updateCategories([...categories, { name: t('editor:properties.skills.newCategory'), skills: [] }])
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
          <h4 className="text-sm font-medium">{t('editor:properties.skills.categories')}</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSaveData}
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? <Spinner className="h-3 w-3" /> : t('common:actions.apply')}
            </Button>
            <Button size="sm" variant="ghost" onClick={addCategory} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> {t('editor:properties.skills.category')}
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
                    placeholder={t('editor:properties.skills.categoryName')}
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
                        placeholder={t('editor:properties.skills.skill')}
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
                    <Plus className="h-3 w-3 mr-1" /> {t('editor:properties.skills.skill')}
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
  const { t } = useTranslation(['common', 'editor'])
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
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
    }
  }

  const addService = () => {
    updateServices([...services, { title: t('editor:properties.services.newService'), description: '' }])
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
          <h4 className="text-sm font-medium">{t('editor:properties.services.title')}</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSaveData}
              disabled={!isDirty || isUpdating}
            >
              {isUpdating ? <Spinner className="h-3 w-3" /> : t('common:actions.apply')}
            </Button>
            <Button size="sm" variant="ghost" onClick={addService} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> {t('editor:properties.services.service')}
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
                    placeholder={t('editor:properties.services.serviceName')}
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
                  placeholder={t('editor:properties.services.serviceDescription')}
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
  const { t } = useTranslation(['common', 'editor'])
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
      toast.success(t('editor:messages.saved'))
    } catch {
      toast.error(t('common:errors.update'))
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
          <h4 className="text-sm font-medium">{t('editor:properties.contact.info')}</h4>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSaveData}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? <Spinner className="h-3 w-3" /> : t('common:actions.apply')}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.contact.email')}</FieldLabel>
            <Input 
              type="email"
              value={getString(data, 'email')}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contact@example.com"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.contact.phone')}</FieldLabel>
            <Input 
              value={getString(data, 'phone')}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.contact.location')}</FieldLabel>
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
              <FieldLabel className="text-xs text-muted-foreground">{t('editor:properties.contact.socials')}</FieldLabel>
              <Button size="sm" variant="ghost" onClick={addSocial} className="h-7 px-2">
                <Plus className="h-3 w-3 mr-1" /> {t('common:actions.add')}
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
                      <SelectValue placeholder={t('editor:properties.contact.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="website">{t('editor:properties.contact.website')}</SelectItem>
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
  const { t } = useTranslation(['common', 'editor'])
  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">{t('editor:properties.generic.advancedSoon')}</p>
        <p className="text-xs mt-1">{t('editor:properties.generic.basicEditable')}</p>
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Landing SaaS Property Editor (Schema-based)
// ============================================
import { LandingSaaSPropertyEditor } from "./landing-saas-property-editors"
import { getSectionSchema } from "@asap/shared"

// Landing SaaS element types that use the schema-based editor
const LANDING_SAAS_TYPES = [
  'navigation',
  'features', 
  'how-it-works',
  'pricing',
  'testimonials',
  'cta',
  'footer',
]

/**
 * Detect if a Hero element is from Landing SaaS context
 * Landing SaaS heroes have specific settings like headline_line1, badge_text, etc.
 */
function isLandingSaaSHero(element: WebsiteElement): boolean {
  const settings = element.settings as Record<string, unknown> | undefined
  if (!settings) return false
  
  // Landing SaaS Hero has these specific keys
  return !!(
    settings.headline_line1 !== undefined ||
    settings.badge_text !== undefined ||
    settings.cta_primary_text !== undefined ||
    settings.show_dashboard_preview !== undefined
  )
}

// ============================================
// Property Editor Router
// ============================================
export function PropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  // Check if this is a Landing SaaS element type
  if (LANDING_SAAS_TYPES.includes(element.element_type)) {
    return (
      <LandingSaaSPropertyEditor
        element={element}
        onUpdate={onUpdate}
        isUpdating={isUpdating}
      />
    )
  }
  
  // Special case for Hero: detect context (Portfolio vs Landing SaaS)
  if (element.element_type === 'hero' && isLandingSaaSHero(element)) {
    // Check if schema exists for this type
    const schema = getSectionSchema('hero')
    if (schema) {
      return (
        <LandingSaaSPropertyEditor
          element={element}
          onUpdate={onUpdate}
          isUpdating={isUpdating}
        />
      )
    }
  }
  
  // Portfolio/Freelance element editors
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
