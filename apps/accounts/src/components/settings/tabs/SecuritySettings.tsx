import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield, Smartphone, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { authAPI } from '@/lib/api/auth';

export default function SecuritySettings() {
  const { t } = useTranslation(['common']);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.security.passwordMismatch'));
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error(t('settings.security.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(t('settings.security.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || t('settings.security.passwordChangeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('settings.security.changePassword')}
          </CardTitle>
          <CardDescription>
            {t('settings.security.changePasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('settings.security.currentPassword')}</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('settings.security.newPassword')}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('settings.security.confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleChangePassword} 
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            >
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {t('settings.security.updatePassword')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('settings.security.twoFactor')}
          </CardTitle>
          <CardDescription>
            {t('settings.security.twoFactorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('settings.security.twoFactorStatus')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.security.twoFactorDisabled')}</p>
            </div>
            <Button variant="outline" disabled>
              {t('settings.security.enable2FA')}
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t('settings.security.twoFactorComingSoon')}
          </p>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.security.activeSessions')}
          </CardTitle>
          <CardDescription>
            {t('settings.security.activeSessionsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{t('settings.security.currentSession')}</p>
                <p className="text-xs text-muted-foreground">
                  {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'Unknown'}...
                </p>
              </div>
              <span className="text-xs text-green-600 font-medium">{t('settings.security.active')}</span>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={async () => {
                try {
                  await authAPI.logoutAll();
                  toast.success(t('settings.security.allSessionsRevoked'));
                  // Redirect to login
                  window.location.href = '/login';
                } catch (error) {
                  toast.error(t('settings.security.revokeSessionsFailed'));
                }
              }}
            >
              {t('settings.security.logoutAllDevices')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
