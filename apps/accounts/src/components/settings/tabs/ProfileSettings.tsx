import React, { useState, useEffect } from 'react';
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

export default function ProfileSettings() {
  const { t } = useTranslation(['common']);
  const { user, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Name would come from extended user data
    }
  }, [user]);

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
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {(name || email || '?')[0].toUpperCase()}
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
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
