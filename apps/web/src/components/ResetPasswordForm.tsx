import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { resetPasswordSchema, getPasswordStrength, type ResetPasswordFormData } from "@/lib/validations/auth";
import { authAPI } from "@/lib/api/auth";
import { RateLimitError } from "@/lib/api/client";

export default function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  // Extract token from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      } else {
        setIsInvalidToken(true);
      }
    }
  }, []);

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate with Zod
    const result = resetPasswordSchema.safeParse({ 
      token, 
      newPassword, 
      confirmPassword 
    });
    
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
      toast.success('Mot de passe réinitialisé !');
    } catch (error: any) {
      if (error instanceof RateLimitError) {
        toast.error(`Trop de tentatives. Réessayez dans ${error.retryAfter}s.`);
      } else {
        const message = error?.data?.error || error?.message || 'Erreur lors de la réinitialisation';
        if (message.includes('expired') || message.includes('invalid') || message.includes('already been used')) {
          setIsInvalidToken(true);
        }
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid or expired token state
  if (isInvalidToken) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Ce lien de réinitialisation est invalide ou a expiré. Les liens sont valables 1 heure et ne peuvent être utilisés qu'une seule fois.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <a href="/forgot-password">
              Demander un nouveau lien
            </a>
          </Button>
          <a 
            href="/login" 
            className="text-center text-sm text-muted-foreground hover:text-primary"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Mot de passe réinitialisé !</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
        </div>
        <Button asChild className="w-full">
          <a href="/login">
            Se connecter
          </a>
        </Button>
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
            <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
            <p className="text-center text-sm text-muted-foreground">
              Choisissez un nouveau mot de passe sécurisé pour votre compte.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  required
                  minLength={8}
                  disabled={isLoading}
                  aria-invalid={!!errors.newPassword}
                  aria-describedby="password-requirements"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          index <= passwordStrength.score
                            ? passwordStrength.color
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Force: {passwordStrength.label}
                  </p>
                </div>
              )}
              
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
              
              <p id="password-requirements" className="text-xs text-muted-foreground">
                Min. 8 caractères avec majuscule, minuscule et chiffre
              </p>
            </div>
            
            <div className="grid gap-2">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                required
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Réinitialiser le mot de passe
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        <a 
          href="/login" 
          className="hover:text-primary"
        >
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}
