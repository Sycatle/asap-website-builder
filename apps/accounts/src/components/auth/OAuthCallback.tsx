import '@/i18n';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { authAPI } from '@/lib/api/auth';
import { isValidRedirectUrl, getAppUrl } from '@/lib/utils/security';
import { CheckCircle, XCircle } from 'lucide-react';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function OAuthCallback() {
  const { t } = useTranslation(['common']);
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const errorParam = urlParams.get('error');
      
      // Check for OAuth error from provider
      if (errorParam) {
        const errorDescription = urlParams.get('error_description') || 'Authentication was cancelled';
        throw new Error(errorDescription);
      }
      
      if (!code || !state) {
        throw new Error('Invalid OAuth callback - missing code or state');
      }
      
      // Determine provider from URL path
      const pathParts = window.location.pathname.split('/');
      const provider = pathParts[pathParts.length - 2] || 'google';
      
      // Exchange code for tokens via our API
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/auth/oauth/${provider}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OAuth authentication failed');
      }
      
      // Store tokens
      if (data.access_token) {
        authAPI.setToken(data.access_token);
      }
      if (data.refresh_token) {
        authAPI.setRefreshToken(data.refresh_token);
      }
      
      setIsNewUser(data.is_new_user || false);
      setStatus('success');
      
      // Redirect after a short delay
      setTimeout(() => {
        // Use redirect_url from backend (preserved from initial OAuth request)
        // This ensures the same behavior as non-OAuth flows
        let redirectUrl = data.redirect_url;
        
        // Fallback: new users go to onboarding, existing users to app
        if (!redirectUrl) {
          redirectUrl = data.is_new_user ? getAppUrl('/onboarding') : getAppUrl('/');
        }
        
        // Validate redirect URL
        if (!isValidRedirectUrl(redirectUrl)) {
          redirectUrl = data.is_new_user ? getAppUrl('/onboarding') : getAppUrl('/');
        }
        
        // Add tokens to hash for cross-origin redirect
        const accessToken = authAPI.getToken();
        const refreshToken = authAPI.getRefreshToken();
        
        if (accessToken && refreshToken) {
          try {
            const url = new URL(redirectUrl);
            if (url.origin !== window.location.origin) {
              url.hash = `auth=${encodeURIComponent(accessToken)}&refresh=${encodeURIComponent(refreshToken)}`;
              redirectUrl = url.toString();
            }
          } catch {
            // Relative URL, keep as is
          }
        }
        
        window.location.href = redirectUrl;
      }, 1500);
      
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    window.location.href = '/login';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xl">
            A
          </div>
          
          {status === 'loading' && (
            <>
              <Spinner className="h-8 w-8" />
              <div>
                <h2 className="text-lg font-semibold">{t('auth.oauthLoading', 'Connexion en cours...')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.oauthLoadingDescription', 'Veuillez patienter pendant que nous finalisons votre connexion.')}
                </p>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold">
                  {isNewUser 
                    ? t('auth.oauthWelcome', 'Bienvenue !') 
                    : t('auth.oauthSuccess', 'Connexion réussie !')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isNewUser
                    ? t('auth.oauthNewUserRedirect', 'Votre compte a été créé. Redirection vers l\'onboarding...')
                    : t('auth.oauthSuccessRedirect', 'Redirection en cours...')}
                </p>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold text-destructive">
                  {t('auth.oauthError', 'Erreur de connexion')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {error || t('auth.oauthErrorDescription', 'Une erreur est survenue lors de la connexion.')}
                </p>
              </div>
              <Button onClick={handleRetry} className="mt-4">
                {t('auth.backToLogin', 'Retour à la connexion')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
