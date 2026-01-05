import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';

export default function DangerSettings() {
  const { t } = useTranslation(['common']);
  const { user, logout } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      toast.error(t('settings.danger.emailMismatch'));
      return;
    }

    setIsDeleting(true);
    try {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      await apiClient.delete(`/accounts/${user.id}`);

      toast.success(t('settings.danger.accountDeleted'));
      // Wait a moment for user to see the success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Logout and clear all data
      await logout(true);
      // Redirect to home or login page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Delete account error:', error);
      const errorMessage = error.data?.error || error.message || t('settings.danger.deleteFailed');
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.danger.exportData')}</CardTitle>
          <CardDescription>
            {t('settings.danger.exportDataDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            {t('settings.danger.downloadData')}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('settings.danger.exportDataHint')}
          </p>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('settings.danger.deleteAccount')}
          </CardTitle>
          <CardDescription>
            {t('settings.danger.deleteAccountDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showConfirm ? (
            <Button 
              variant="destructive" 
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('settings.danger.deleteMyAccount')}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">
                  {t('settings.danger.deleteWarning')}
                </p>
                <ul className="mt-2 text-sm text-destructive/80 list-disc list-inside space-y-1">
                  <li>{t('settings.danger.deleteWarning1')}</li>
                  <li>{t('settings.danger.deleteWarning2')}</li>
                  <li>{t('settings.danger.deleteWarning3')}</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  {t('settings.danger.confirmEmail', { email: user?.email })}
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmEmail('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmEmail !== user?.email}
                >
                  {isDeleting && <Spinner className="mr-2 h-4 w-4" />}
                  {t('settings.danger.permanentlyDelete')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
