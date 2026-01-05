import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api/auth';
import { filesAPI } from '@/lib/api/files';
import { apiClient } from '@/lib/api/client';

export default function ProfileSettings() {
  const { t } = useTranslation(['common']);
  const { user, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Load avatar from user data if available
      const userData = (user as any).data;
      if (userData?.avatar) {
        setAvatarUrl(userData.avatar);
      } else if (userData?.avatar_file_id) {
        setAvatarUrl(filesAPI.getUrl(userData.avatar_file_id));
      }
    }
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.profile.invalidFileType', 'Please select an image file'));
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('settings.profile.fileTooLarge', 'File must be less than 2MB'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Rename to avatar.{ext} for consistent naming
      const extension = file.name.split('.').pop() || 'png';
      const avatarFile = new File([file], `avatar.${extension}`, { type: file.type });
      
      // Upload to personal cloud with public visibility
      const uploadedFile = await filesAPI.upload(avatarFile, {
        visibility: 'public', // Avatar must be publicly accessible
        description: 'User avatar',
        // No website_id = personal cloud
      });

      const newAvatarUrl = filesAPI.getUrl(uploadedFile.id);
      setAvatarUrl(newAvatarUrl);
      
      // Update user data with new avatar URL
      await apiClient.put(`/accounts/${user?.id}`, { 
        data: { 
          avatar: newAvatarUrl,
          avatar_file_id: uploadedFile.id,
        } 
      });
      
      await fetchUser();
      toast.success(t('settings.profile.avatarUpdated', 'Avatar updated'));
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      toast.error(error.message || t('settings.profile.avatarUploadFailed', 'Failed to upload avatar'));
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement profile update API
      toast.success(t('settings.profile.saved'));
      await fetchUser();
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.personalInfo')}</CardTitle>
          <CardDescription>
            {t('settings.profile.personalInfoDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('settings.profile.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.profile.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.profile.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.profile.emailCannotChange')}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.avatar')}</CardTitle>
          <CardDescription>
            {t('settings.profile.avatarDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {(name || email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <Button 
                variant="outline" 
                size="sm"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingAvatar && <Spinner className="mr-2 h-4 w-4" />}
                {t('settings.profile.uploadAvatar')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('settings.profile.avatarHint')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
