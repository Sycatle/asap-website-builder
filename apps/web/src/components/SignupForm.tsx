import React, { useState } from 'react';
import { useAuthStore } from '../lib/store/authStore';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signupSchema, getPasswordStrength, type SignupFormData } from "@/lib/validations/auth";
import { isValidRedirectUrl } from "@/lib/utils/security";

export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [searchParams, setSearchParams] = useState('');
  const { signup, isLoading } = useAuthStore();

  // Get search params on client side only
  React.useEffect(() => {
    setSearchParams(window.location.search);
  }, []);

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

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
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
      error: (err) => err.message || 'Échec de la création du compte',
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
                minLength={8}
                aria-invalid={!!errors.password}
                aria-describedby="password-requirements"
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
                <p id="password-requirements" className="text-sm text-destructive">{errors.password}</p>
              ) : (
                <p id="password-requirements" className="text-xs text-muted-foreground">
                  Min. 8 caractères, majuscule, minuscule et chiffre
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </div>
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
