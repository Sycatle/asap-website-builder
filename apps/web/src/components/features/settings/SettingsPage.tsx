"use client"

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { websitesAPI, type Website, type UpdateWebsiteRequest } from '@/lib/api';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { FormActions } from "@/components/ui/form-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { 
  Settings, 
  Globe,
  Type,
  FileText,
  Link2,
  Search,
  Share2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  Rocket,
  Image,
  MessageSquare,
} from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { currentWebsite: website, currentWebsiteId, isLoading: contextLoading, refetch: refetchAll } = useWebsiteContext();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [favicon, setFavicon] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [isIndexable, setIsIndexable] = useState(true);
  
  // Initial values for dirty checking
  const [initialValues, setInitialValues] = useState({
    title: '',
    tagline: '',
    description: '',
    favicon: '',
    ogImage: '',
    isIndexable: true,
  });

  // Sync form state when website changes
  useEffect(() => {
    if (website) {
      const values = {
        title: website.title || '',
        tagline: website.tagline || '',
        description: website.description || '',
        favicon: website.favicon || '',
        ogImage: website.og_image || '',
        isIndexable: website.is_indexable !== false,
      };
      setTitle(values.title);
      setTagline(values.tagline);
      setDescription(values.description);
      setFavicon(values.favicon);
      setOgImage(values.ogImage);
      setIsIndexable(values.isIndexable);
      setInitialValues(values);
    }
  }, [website]);

  // Check if form is dirty
  const isFormDirty = 
    title !== initialValues.title ||
    tagline !== initialValues.tagline ||
    description !== initialValues.description ||
    favicon !== initialValues.favicon ||
    ogImage !== initialValues.ogImage ||
    isIndexable !== initialValues.isIndexable;

  const handleSave = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, {
        title,
        tagline,
        description,
        favicon,
        og_image: ogImage,
        is_indexable: isIndexable,
      } as UpdateWebsiteRequest);
      
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      refetchAll();
      
      // Update initial values
      setInitialValues({
        title,
        tagline,
        description,
        favicon,
        ogImage,
        isIndexable,
      });
      
      toast.success(t('settings:toast.saved'));
    } catch (error) {
      toast.error(t('settings:toast.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialValues.title);
    setTagline(initialValues.tagline);
    setDescription(initialValues.description);
    setFavicon(initialValues.favicon);
    setOgImage(initialValues.ogImage);
    setIsIndexable(initialValues.isIndexable);
  };

  const handlePublish = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'published' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      refetchAll();
      toast.success(t('settings:toast.published'));
    } catch (error) {
      toast.error(t('settings:toast.publishError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'draft' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      refetchAll();
      toast.success(t('settings:toast.unpublished'));
    } catch (error) {
      toast.error(t('settings:toast.unpublishError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!currentWebsiteId) return;
    
    setIsDeleting(true);
    try {
      await websitesAPI.delete(currentWebsiteId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      toast.success(t('settings:toast.deleted'));
      window.location.href = '/app';
    } catch (error) {
      toast.error(t('settings:toast.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('settings:website.title')}
        subtitle={t('settings:website.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
            <Settings className="h-5 w-5 text-white" />
          </div>
        }
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-semibold hidden sm:block">{t('settings:title')}</p>
            </div>
            {isFormDirty && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} className="h-8">
                  {t('common:actions.cancel')}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                  {isSaving ? <Spinner className="h-4 w-4 mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  {t('common:actions.save')}
                </Button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {t('settings:website.general.title')}
            </CardTitle>
            <CardDescription>
              {t('settings:website.general.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="slug" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.general.url')}
                </FieldLabel>
                <div className="flex items-center">
                  <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                    asap.cool/
                  </span>
                  <Input
                    id="slug"
                    value={website?.slug || ''}
                    disabled
                    className="rounded-l-none bg-muted"
                  />
                </div>
                <FieldDescription>{t('settings:website.general.urlDescription')}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="title" className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.general.siteTitle')}
                </FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mon super site"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tagline" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.general.tagline')}
                </FieldLabel>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t('settings:website.general.taglinePlaceholder')}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.general.descriptionLabel')}
                </FieldLabel>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('settings:website.general.descriptionPlaceholder')}
                  rows={3}
                />
                <FieldDescription>
                  {t('settings:website.general.descriptionHelp')}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* SEO & Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              {t('settings:website.seo.title')}
            </CardTitle>
            <CardDescription>
              {t('settings:website.seo.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="favicon" className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.seo.favicon')}
                </FieldLabel>
                <Input
                  id="favicon"
                  value={favicon}
                  onChange={(e) => setFavicon(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
                <FieldDescription>
                  {t('settings:website.seo.faviconDescription')}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="ogImage" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.seo.ogImage')}
                </FieldLabel>
                <Input
                  id="ogImage"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://example.com/og-image.jpg"
                />
                <FieldDescription>
                  {t('settings:website.seo.ogImageDescription')}
                </FieldDescription>
              </Field>
            </FieldGroup>

            <Separator />

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {t('settings:website.seo.indexing')}
                </FieldLabel>
                <FieldDescription>
                  {t('settings:website.seo.indexingDescription')}
                </FieldDescription>
              </FieldContent>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        checked={isIndexable}
                        onCheckedChange={setIsIndexable}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings:website.seo.indexingTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Field>
            {!isIndexable && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{t('settings:website.seo.notIndexedWarning')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {website?.status === 'published' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
            {t('settings:website.publication.title')}
          </CardTitle>
          <CardDescription>
            {t('settings:website.publication.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                website?.status === 'published' 
                  ? 'bg-green-500/10' 
                  : 'bg-amber-500/10'
              }`}>
                {website?.status === 'published' ? (
                  <Globe className="h-6 w-6 text-green-600" />
                ) : (
                  <EyeOff className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {website?.status === 'published' ? t('settings:website.publication.online') : t('settings:website.publication.draft')}
                  </span>
                  <Badge className={website?.status === 'published' 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }>
                    {website?.status === 'published' ? t('settings:website.publication.public') : t('settings:website.publication.private')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {website?.status === 'published' 
                    ? t('settings:website.publication.accessibleAt', { url: `${website?.slug}.asap.cool` })
                    : t('settings:website.publication.onlyYou')
                  }
                </p>
              </div>
            </div>
            
            {website?.status === 'published' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={handleUnpublish}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <EyeOff className="h-4 w-4 mr-2" />
                      )}
                      {t('settings:website.publication.unpublish')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings:website.publication.unpublishTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handlePublish}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Rocket className="h-4 w-4 mr-2" />
                      )}
                      {t('settings:website.publication.publish')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings:website.publication.publishTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('settings:website.danger.title')}
          </CardTitle>
          <CardDescription>
            {t('settings:website.danger.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">{t('settings:website.danger.deleteTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings:website.danger.deleteDescription')}
              </p>
            </div>
            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? (
                          <Spinner className="h-4 w-4 mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        {t('settings:website.danger.deleteButton')}
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings:website.danger.deleteWarning')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings:website.danger.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings:website.danger.deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteWebsite}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('settings:website.danger.deleteConfirmButton')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Sticky form actions */}
      <FormActions
        isDirty={isFormDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
