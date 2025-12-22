import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/store/authStore';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { isValidRedirectUrl } from "@/lib/utils/security";
import { RateLimitError } from "@/lib/api/client";

export default function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    return '/app';
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
      await login(result.data.email, result.data.password);
      return result.data.email;
    };

    toast.promise(loginPromise(), {
      loading: 'Connexion en cours...',
      success: () => {
        // Redirect on success
        const redirectUrl = getRedirectUrl();
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
        return 'Connexion réussie !';
      },
      error: (err) => {
        // Handle rate limiting with countdown
        if (err instanceof RateLimitError) {
          setRateLimitCountdown(err.retryAfter);
          return `Trop de tentatives. Réessayez dans ${formatCountdown(err.retryAfter)}.`;
        }
        return err.message || 'Échec de la connexion';
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
            <h1 className="text-xl font-bold">Bienvenue sur ASAP</h1>
            <p className="text-center text-sm text-muted-foreground">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isRateLimited}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">{errors.password}</p>
              )}
              <div className="text-right">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  Mot de passe oublié ?
                </a>
              </div>
            </div>
            {isRateLimited && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Trop de tentatives. Réessayez dans {formatCountdown(rateLimitCountdown!)}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isRateLimited}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : isRateLimited ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Patientez {formatCountdown(rateLimitCountdown!)}
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        Pas encore de compte?{' '}
        <a href={`/signup${searchParams}`} className="underline underline-offset-4 hover:text-primary font-medium">
          Créer un compte
        </a>
      </div>
    </div>
  );
}
