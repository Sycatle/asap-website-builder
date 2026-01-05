import '@/i18n';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordFormData, getPasswordStrength } from "@/lib/validations/auth";
import { authAPI } from "@/lib/api/auth";

export default function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation(['common']);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resetPasswordSchema.safeParse({ token, newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: Partial<ResetPasswordFormData> = {};
      for (const error of result.error.errors) {
        const field = error.path[0] as keyof ResetPasswordFormData;
        fieldErrors[field] = error.message;
      }
      setErrors(fieldErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authAPI.resetPassword({ 
        token: result.data.token, 
        new_password: result.data.newPassword 
      });
      setIsSuccess(true);
      toast.success(t('auth.passwordResetSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold">{t('auth.passwordResetSuccess')}</h1>
          <p className="text-sm text-muted-foreground">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {t('auth.signIn')}
          </a>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-bold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <a 
            href="/forgot-password" 
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Demander un nouveau lien
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xl">
                A
              </div>
              <span className="sr-only">ASAP</span>
            </a>
            <h1 className="text-xl font-bold">{t('auth.resetPasswordTitle')}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.resetPasswordDescription')}
            </p>
          </div>

          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.newPassword}>
              <FieldLabel htmlFor="newPassword">{t('auth.newPassword')}</FieldLabel>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                aria-invalid={!!errors.newPassword}
              />
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.passwordStrength')}: {passwordStrength.label}
                  </p>
                </div>
              )}
              {errors.newPassword && <FieldError>{errors.newPassword}</FieldError>}
              <FieldDescription>{t('auth.passwordRequirements')}</FieldDescription>
            </Field>
            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">{t('auth.confirmPassword')}</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <FieldError>{errors.confirmPassword}</FieldError>}
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('auth.resettingPassword')}
                </>
              ) : (
                t('auth.resetPassword')
              )}
            </Button>
          </FieldGroup>
        </div>
      </form>
      <div className="text-center">
        <a 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToLogin')}
        </a>
      </div>
    </div>
  );
}
