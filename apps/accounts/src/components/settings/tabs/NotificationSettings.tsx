import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'security',
    label: 'settings.notifications.security',
    description: 'settings.notifications.securityDescription',
    email: true,
    push: true,
  },
  {
    id: 'updates',
    label: 'settings.notifications.updates',
    description: 'settings.notifications.updatesDescription',
    email: true,
    push: false,
  },
  {
    id: 'marketing',
    label: 'settings.notifications.marketing',
    description: 'settings.notifications.marketingDescription',
    email: false,
    push: false,
  },
];

export default function NotificationSettings() {
  const { t } = useTranslation(['common']);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);

  const handleToggle = (id: string, type: 'email' | 'push') => {
    setSettings(prev => prev.map(setting => {
      if (setting.id === id) {
        return { ...setting, [type]: !setting[type] };
      }
      return setting;
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement notification settings API
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(t('settings.notifications.saved'));
    } catch (error: any) {
      toast.error(error.message || t('settings.notifications.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.preferences')}
          </CardTitle>
          <CardDescription>
            {t('settings.notifications.preferencesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_80px] gap-4 items-center text-sm font-medium text-muted-foreground">
            <div></div>
            <div className="flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" />
              {t('settings.notifications.email')}
            </div>
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {t('settings.notifications.push')}
            </div>
          </div>
          
          <Separator />
          
          {/* Settings rows */}
          {settings.map((setting) => (
            <div 
              key={setting.id} 
              className="grid grid-cols-[1fr_80px_80px] gap-4 items-center"
            >
              <div>
                <Label className="text-sm font-medium">
                  {t(setting.label)}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(setting.description)}
                </p>
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={setting.email}
                  onCheckedChange={() => handleToggle(setting.id, 'email')}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={setting.push}
                  onCheckedChange={() => handleToggle(setting.id, 'push')}
                />
              </div>
            </div>
          ))}
          
          <Separator />
          
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
