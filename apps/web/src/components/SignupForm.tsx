import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/store/authStore';
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
import { Clock } from "lucide-react";
import { signupSchema, getPasswordStrength, type SignupFormData } from "@/lib/validations/auth";
import { isValidRedirectUrl } from "@/lib/utils/security";
import { RateLimitError } from "@/lib/api/client";

export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [searchParams, setSearchParams] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const { signup, isLoading } = useAuthStore();

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

  const passwordStrength = getPasswordStrength(password);
  const isRateLimited = rateLimitCountdown !== null && rateLimitCountdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Don't submit if rate limited
    if (isRateLimited) {
      return;
    }
    
    // Validate with Zod
    const result = signupSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Partial<SignupFormData> = {};
      for (const error of result.error.errors) {
        const field = error.path[0] as keyof SignupFormData;
        fieldErrors[field] = error.message;
      }
      setErrors(fieldErrors);
      return;
    }
    
    const signupPromise = async () => {
      await signup(result.data.email, result.data.password);
      return result.data.email;
    };

    toast.promise(signupPromise(), {
      loading: 'Création du compte...',
      success: () => {
        // Redirect on success
        const redirectUrl = getRedirectUrl();
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
        return 'Bienvenue ! Votre compte a été créé.';
      },
      error: (err) => {
        // Handle rate limiting with countdown
        if (err instanceof RateLimitError) {
          setRateLimitCountdown(err.retryAfter);
          return `Trop de tentatives. Réessayez dans ${formatCountdown(err.retryAfter)}.`;
        }
        return err.message || 'Échec de la création du compte';
      },
    });
  };

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
            <h1 className="text-xl font-bold">Créer votre compte</h1>
            <p className="text-center text-sm text-muted-foreground">
              Accédez à votre espace en quelques secondes
            </p>
          </div>

          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                aria-invalid={!!errors.email}
              />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isRateLimited}
                aria-invalid={!!errors.password}
              />
              {password.length > 0 && (
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
                    Force: {passwordStrength.label}
                  </p>
                </div>
              )}
              {errors.password ? (
                <FieldError>{errors.password}</FieldError>
              ) : (
                <FieldDescription>
                  Min. 8 caractères, majuscule, minuscule et chiffre
                </FieldDescription>
              )}
            </Field>
            {isRateLimited && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Trop de tentatives. Réessayez dans {formatCountdown(rateLimitCountdown!)}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isRateLimited}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Création...
                </>
              ) : isRateLimited ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Patientez {formatCountdown(rateLimitCountdown!)}
                </>
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </FieldGroup>
        </div>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        Déjà un compte?{' '}
        <a href={`/login${searchParams}`} className="underline underline-offset-4 hover:text-primary font-medium">
          Se connecter
        </a>
      </div>
    </div>
  );
}
