import '@/i18n';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";
import { authAPI } from "@/lib/api/auth";

export default function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation(['common']);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Partial<ForgotPasswordFormData> = {};
      for (const error of result.error.errors) {
        const field = error.path[0] as keyof ForgotPasswordFormData;
        fieldErrors[field] = error.message;
      }
      setErrors(fieldErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authAPI.forgotPassword({ email: result.data.email });
      setIsEmailSent(true);
      toast.success(t('auth.resetLinkSent'));
    } catch (err: any) {
      // Don't reveal if email exists or not
      setIsEmailSent(true);
      toast.success(t('auth.resetLinkSent'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t('auth.resetLinkSent')}</h1>
          <p className="text-sm text-muted-foreground">
            Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToLogin')}
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
            <h1 className="text-xl font-bold">{t('auth.forgotPasswordTitle')}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.forgotPasswordDescription')}
            </p>
          </div>

          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                aria-invalid={!!errors.email}
              />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('auth.sendingResetLink')}
                </>
              ) : (
                t('auth.sendResetLink')
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
