import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";
import { authAPI } from "@/lib/api/auth";
import { RateLimitError } from "@/lib/api/client";

export default function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate with Zod
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
      setIsSuccess(true);
      toast.success('Email envoyé !');
    } catch (error: any) {
      if (error instanceof RateLimitError) {
        toast.error(`Trop de tentatives. Réessayez dans ${error.retryAfter}s.`);
      } else {
        // Always show success message to prevent email enumeration
        setIsSuccess(true);
        toast.success('Email envoyé !');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - show confirmation message
  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Email envoyé !</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Vérifiez également votre dossier spam si vous ne recevez pas l'email.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsSuccess(false);
              setEmail('');
            }}
            className="w-full"
          >
            Réessayer avec une autre adresse
          </Button>
          <a 
            href="/login" 
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
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
            <h1 className="text-xl font-bold">Mot de passe oublié ?</h1>
            <p className="text-center text-sm text-muted-foreground">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                disabled={isLoading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer le lien
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-center">
        <a 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}
