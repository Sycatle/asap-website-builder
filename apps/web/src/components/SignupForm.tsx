import React, { useState } from 'react';
import { useAuthStore } from '../lib/store/authStore';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const signupPromise = async () => {
      await signup(email, password);
      return email;
    };

    toast.promise(signupPromise(), {
      loading: 'Création du compte...',
      success: () => {
        // Redirect on success
        setTimeout(() => {
          window.location.href = '/app/dashboard';
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
              />
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
              />
              <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
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
        <a href="/login" className="underline underline-offset-4 hover:text-primary font-medium">
          Se connecter
        </a>
      </div>
    </div>
  );
}
