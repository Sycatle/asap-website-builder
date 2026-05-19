"use client"

import React from "react"
import { useTranslation } from 'react-i18next'
import type { WebsiteElement, UpdateElementRequest } from "@/lib/api"
import { getElementLabel } from "@/lib/constants/elements"
import { ELEMENT_LAYOUTS } from "@asap/shared"
import type { ElementType } from "@asap/shared"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Save } from "lucide-react"
import { useFormDirty, useElementForm } from "@/hooks/useFormDirty"
import {
  TextField,
  TextareaField,
  SwitchField,
  SelectField,
  ImageUrlField,
  CtaField,
  StringList,
  EditableList,
  PropertySectionHeader,
  DeleteButton,
  EDITOR_STYLES,
} from "./shared/property-fields"

// ============================================
// Types
// ============================================

interface PropertyEditorProps {
  element: WebsiteElement
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<WebsiteElement>
  isUpdating?: boolean
}

type ContentData = Record<string, unknown>

// Helper to safely get string/array value
function getString(data: ContentData, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

function getArray<T>(data: ContentData, key: string): T[] {
  const value = data[key]
  return Array.isArray(value) ? value : []
}

// ============================================
// Base Property Editor - Common fields
// ============================================

function BasePropertyEditor({ 
  element, 
  onUpdate, 
  isUpdating, 
  children 
}: PropertyEditorProps & { children?: React.ReactNode }) {
  const { t } = useTranslation(['common', 'editor'])
  
  const layouts = ELEMENT_LAYOUTS[element.element_type as ElementType] || [
    { value: 'default', label: t('editor:properties.layout.default') }
  ]

  const { values, setValue, isDirty, save, isSaving } = useFormDirty({
    initialValues: {
      title: element.title,
      layout: element.layout,
      visible: element.visible ?? true,
    },
    onSave: async (vals) => {
      await onUpdate(element.id, vals)
    },
    successMessage: 'editor:messages.saved',
  })

  return (
    <div className="space-y-6">
      {/* Element header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{getElementLabel(element.element_type)}</h3>
          <Button 
            size="sm" 
            onClick={save}
            disabled={!isDirty || isSaving || isUpdating}
          >
            {isSaving ? (
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
          <TextField
            name="title"
            label={t('editor:properties.elementTitle')}
            value={values.title}
            onChange={(v) => setValue('title', v)}
            placeholder={t('editor:properties.elementTitle')}
          />
          
          {layouts.length > 1 && (
            <SelectField
              name="layout"
              label={t('editor:properties.style.layout')}
              value={values.layout}
              onChange={(v) => setValue('layout', v)}
              options={layouts}
            />
          )}
          
          <SwitchField
            name="visible"
            label={t('editor:properties.visible')}
            value={values.visible}
            onChange={(v) => setValue('visible', v)}
          />
        </div>
      </div>
      
      <Separator />
      
      {children}
    </div>
  )
}

// ============================================
// Hero Element Editor
// ============================================

export function HeroPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const { t } = useTranslation(['common', 'editor'])
  const initialData = (element.content || element.data || {}) as ContentData
  
  const { values, setValue, isDirty, save, isSaving } = useElementForm({
    elementId: element.id,
    initialData,
    onUpdate,
  })

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <PropertySectionHeader
          title={t('editor:properties.tabs.content')}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={save}
        />
        
        <div className="space-y-3">
          <TextField
            name="name"
            label={t('editor:properties.hero.name')}
            value={getString(values, 'name')}
            onChange={(v) => setValue('name', v)}
            placeholder={t('editor:properties.hero.namePlaceholder')}
          />
          
          <TextField
            name="title"
            label={t('editor:properties.hero.title')}
            value={getString(values, 'title')}
            onChange={(v) => setValue('title', v)}
            placeholder={t('editor:properties.hero.titlePlaceholder')}
          />
          
          <TextareaField
            name="subtitle"
            label={t('editor:properties.hero.subtitle')}
            value={getString(values, 'subtitle')}
            onChange={(v) => setValue('subtitle', v)}
            placeholder={t('editor:properties.hero.subtitlePlaceholder')}
            rows={2}
          />
          
          <Separator />
          
          <CtaField
            label={t('editor:properties.hero.ctaButton')}
            textValue={getString(values, 'cta_text')}
            linkValue={getString(values, 'cta_link')}
            onTextChange={(v) => setValue('cta_text', v)}
            onLinkChange={(v) => setValue('cta_link', v)}
            textPlaceholder={t('editor:properties.hero.ctaTextPlaceholder')}
          />
          
          <ImageUrlField
            name="background_image"
            label={t('editor:properties.hero.backgroundImage')}
            value={getString(values, 'background_image')}
            onChange={(v) => setValue('background_image', v)}
            placeholder="https://..."
          />
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
  const initialData = (element.content || element.data || {}) as ContentData
  
  const { values, setValue, isDirty, save, isSaving } = useElementForm({
    elementId: element.id,
    initialData,
    onUpdate,
  })

  const highlights = getArray<string>(values, 'highlights')

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <PropertySectionHeader
          title={t('editor:properties.tabs.content')}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={save}
        />
        
        <div className="space-y-3">
          <TextareaField
            name="description"
            label={t('editor:properties.about.description')}
            value={getString(values, 'description')}
            onChange={(v) => setValue('description', v)}
            placeholder={t('editor:properties.about.descriptionPlaceholder')}
            rows={4}
          />
          
          <ImageUrlField
            name="image"
            label={t('editor:properties.about.photo')}
            value={getString(values, 'image')}
            onChange={(v) => setValue('image', v)}
            placeholder="https://..."
          />
          
          <Separator />
          
          <div className="space-y-2">
            <label className={EDITOR_STYLES.label}>
              {t('editor:properties.about.highlights')}
            </label>
            <StringList
              items={highlights}
              onChange={(items) => setValue('highlights', items)}
              placeholder={t('editor:properties.about.highlightPlaceholder', { number: '' })}
              addLabel={t('common:actions.add')}
            />
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
  const initialData = (element.content || element.data || {}) as ContentData
  
  const { values, setValue, isDirty, save, isSaving } = useElementForm({
    elementId: element.id,
    initialData,
    onUpdate,
  })

  const categories = getArray<SkillCategory>(values, 'categories')

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <PropertySectionHeader
          title={t('editor:properties.skills.categories')}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={save}
        />
        
        <EditableList
          items={categories}
          onChange={(items) => setValue('categories', items)}
          createItem={() => ({ name: t('editor:properties.skills.newCategory'), skills: [] })}
          addLabel={t('editor:properties.skills.category')}
          renderItem={(category, index, { update, remove }) => (
            <>
              <div className="flex items-center gap-2 mb-3">
                <TextField
                  name={`category-${index}`}
                  value={category.name}
                  onChange={(v) => update('name', v)}
                  placeholder={t('editor:properties.skills.categoryName')}
                  className="flex-1"
                />
                <DeleteButton onClick={remove} />
              </div>
              <StringList
                items={category.skills}
                onChange={(skills) => update('skills', skills)}
                placeholder={t('editor:properties.skills.skill')}
                addLabel={t('editor:properties.skills.skill')}
              />
            </>
          )}
        />
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
  const initialData = (element.content || element.data || {}) as ContentData
  
  const { values, setValue, isDirty, save, isSaving } = useElementForm({
    elementId: element.id,
    initialData,
    onUpdate,
  })

  const services = getArray<Service>(values, 'services')

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <PropertySectionHeader
          title={t('editor:properties.services.title')}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={save}
        />
        
        <EditableList
          items={services}
          onChange={(items) => setValue('services', items)}
          createItem={() => ({ title: t('editor:properties.services.newService'), description: '' })}
          addLabel={t('editor:properties.services.service')}
          renderItem={(service, index, { update, remove }) => (
            <>
              <div className="flex items-center gap-2 mb-2">
                <TextField
                  name={`service-title-${index}`}
                  value={service.title}
                  onChange={(v) => update('title', v)}
                  placeholder={t('editor:properties.services.serviceName')}
                  className="flex-1"
                />
                <DeleteButton onClick={remove} />
              </div>
              <TextareaField
                name={`service-desc-${index}`}
                value={service.description}
                onChange={(v) => update('description', v)}
                placeholder={t('editor:properties.services.serviceDescription')}
                rows={2}
              />
            </>
          )}
        />
      </div>
    </BasePropertyEditor>
  )
}

// ============================================
// Contact Element Editor
// ============================================

interface Social {
  platform: string
  url: string
}

const SOCIAL_PLATFORMS = [
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'website', label: 'Site web' },
]

export function ContactPropertyEditor({ element, onUpdate, isUpdating }: PropertyEditorProps) {
  const { t } = useTranslation(['common', 'editor'])
  const initialData = (element.content || element.data || {}) as ContentData
  
  const { values, setValue, isDirty, save, isSaving } = useElementForm({
    elementId: element.id,
    initialData,
    onUpdate,
  })

  const socials = getArray<Social>(values, 'socials')

  return (
    <BasePropertyEditor element={element} onUpdate={onUpdate} isUpdating={isUpdating}>
      <div className="space-y-4">
        <PropertySectionHeader
          title={t('editor:properties.contact.info')}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={save}
        />
        
        <div className="space-y-3">
          <TextField
            name="email"
            label={t('editor:properties.contact.email')}
            type="email"
            value={getString(values, 'email')}
            onChange={(v) => setValue('email', v)}
            placeholder="contact@example.com"
          />
          
          <TextField
            name="phone"
            label={t('editor:properties.contact.phone')}
            type="tel"
            value={getString(values, 'phone')}
            onChange={(v) => setValue('phone', v)}
            placeholder="+33 6 12 34 56 78"
          />
          
          <TextField
            name="location"
            label={t('editor:properties.contact.location')}
            value={getString(values, 'location')}
            onChange={(v) => setValue('location', v)}
            placeholder="Paris, France"
          />
          
          <Separator />
          
          <div className="space-y-2">
            <label className={EDITOR_STYLES.label}>
              {t('editor:properties.contact.socials')}
            </label>
            <EditableList
              items={socials}
              onChange={(items) => setValue('socials', items)}
              createItem={() => ({ platform: '', url: '' })}
              addLabel={t('common:actions.add')}
              maxHeight={200}
              renderItem={(social, index, { update, remove }) => (
                <div className="flex items-center gap-2">
                  <SelectField
                    name={`social-platform-${index}`}
                    value={social.platform}
                    onChange={(v) => update('platform', v)}
                    options={SOCIAL_PLATFORMS}
                    placeholder={t('editor:properties.contact.type')}
                    className="w-24"
                  />
                  <TextField
                    name={`social-url-${index}`}
                    value={social.url}
                    onChange={(v) => update('url', v)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <DeleteButton onClick={remove} />
                </div>
              )}
            />
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
