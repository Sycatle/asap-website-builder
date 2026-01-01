// Initialize i18n before any React hooks
import '@/i18n';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/store/authStore';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { isValidRedirectUrl } from "@/lib/utils/security";
import { RateLimitError } from "@/lib/api/client";

export default function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation(['common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [searchParams, setSearchParams] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const { login, isLoading } = useAuthStore();

  // Get search params on client side only
  useEffect(() => {
    setSearchParams(window.location.search);
  }, []);

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) {
      setRateLimitCountdown(null);
      return;
    }
    
    const timer = setTimeout(() => {
      setRateLimitCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  // Get redirect URL from query params with security validation
  const getRedirectUrl = () => {
    const params = new URLSearchParams(searchParams);
    const redirect = params.get('redirect');
    // Validate that redirect is a safe internal URL
    if (redirect && isValidRedirectUrl(redirect)) {
      return redirect;
    }
    return '/';
  };

  // Format seconds to mm:ss
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Don't submit if rate limited
    if (rateLimitCountdown !== null && rateLimitCountdown > 0) {
      return;
    }
    
    // Validate with Zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Partial<LoginFormData> = {};
      for (const error of result.error.errors) {
        const field = error.path[0] as keyof LoginFormData;
        fieldErrors[field] = error.message;
      }
      setErrors(fieldErrors);
      return;
    }
    
    const loginPromise = async () => {
      await login(result.data.email, result.data.password, rememberMe);
      return result.data.email;
    };

    toast.promise(loginPromise(), {
      loading: t('auth.loggingIn'),
      success: () => {
        // Redirect on success
        const redirectUrl = getRedirectUrl();
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
        return t('auth.loginSuccess');
      },
      error: (err) => {
        // Handle rate limiting with countdown
        if (err instanceof RateLimitError) {
          setRateLimitCountdown(err.retryAfter);
          return t('auth.rateLimitWithTime', { time: formatCountdown(err.retryAfter) });
        }
        return err.message || t('auth.loginFailed');
      },
    });
  };

  const isRateLimited = rateLimitCountdown !== null && rateLimitCountdown > 0;

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
            <h1 className="text-xl font-bold">{t('auth.welcomeBack')}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.loginDescription')}
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
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isRateLimited}
                aria-invalid={!!errors.password}
              />
              {errors.password && <FieldError>{errors.password}</FieldError>}
              <div className="flex items-center justify-between">
                <Field orientation="horizontal">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isRateLimited}
                  />
                  <FieldLabel
                    htmlFor="remember-me"
                    className="font-normal text-muted-foreground cursor-pointer"
                  >
                    {t('auth.rememberMe')}
                  </FieldLabel>
                </Field>
                <a 
                  href="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  {t('auth.forgotPassword')}
                </a>
              </div>
            </Field>
            {isRateLimited && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{t('auth.rateLimitWithTime', { time: formatCountdown(rateLimitCountdown!) })}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isRateLimited}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('auth.loggingIn')}
                </>
              ) : isRateLimited ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  {t('auth.waitTime', { time: formatCountdown(rateLimitCountdown!) })}
                </>
              ) : (
                t('auth.signIn')
              )}
            </Button>
          </FieldGroup>
        </div>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <a href={`/signup${searchParams}`} className="underline underline-offset-4 hover:text-primary font-medium">
          {t('auth.createAccount')}
        </a>
      </div>
    </div>
  );
}
