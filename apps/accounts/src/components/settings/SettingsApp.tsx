// Initialize i18n
import '@/i18n';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/lib/store/authStore';

// Settings tabs
import ProfileSettings from './tabs/ProfileSettings';
import SecuritySettings from './tabs/SecuritySettings';
import NotificationSettings from './tabs/NotificationSettings';
import BillingSettings from './tabs/BillingSettings';
import DangerSettings from './tabs/DangerSettings';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'billing' | 'danger';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const getNavItems = (t: (key: string) => string): NavItem[] => [
  {
    id: 'profile',
    label: t('settings.profile.title'),
    icon: User,
    description: t('settings.profile.description'),
  },
  {
    id: 'security',
    label: t('settings.security.title'),
    icon: Shield,
    description: t('settings.security.description'),
  },
  {
    id: 'notifications',
    label: t('settings.notifications.title'),
    icon: Bell,
    description: t('settings.notifications.description'),
  },
  {
    id: 'billing',
    label: t('settings.billing.title'),
    icon: CreditCard,
    description: t('settings.billing.description'),
  },
  {
    id: 'danger',
    label: t('settings.danger.title'),
    icon: AlertTriangle,
    description: t('settings.danger.description'),
  },
];

function getTabFromPath(path: string): SettingsTab {
  const segments = path.split('/').filter(Boolean);
  const tab = segments[1] || 'profile'; // /settings/[tab]
  if (['profile', 'security', 'notifications', 'billing', 'danger'].includes(tab)) {
    return tab as SettingsTab;
  }
  return 'profile';
}

export default function SettingsApp() {
  const { t } = useTranslation(['common']);
  const [currentTab, setCurrentTab] = useState<SettingsTab>(() => 
    getTabFromPath(typeof window !== 'undefined' ? window.location.pathname : '/settings/profile')
  );
  const { user, isLoading, fetchUser } = useAuthStore();
  const navItems = getNavItems(t);
  const appUrl = import.meta.env.PUBLIC_APP_URL || 'http://localhost:4321';

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = (tab: SettingsTab) => {
    const url = `/settings/${tab}`;
    window.history.pushState({}, '', url);
    setCurrentTab(tab);
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const currentNavItem = navItems.find(item => item.id === currentTab);

  return (
    <>
      <Toaster richColors position="top-center" />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center gap-4 max-w-5xl mx-auto px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = appUrl}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('settings.backToApp')}
            </Button>
            
            <div className="flex-1" />
            
            <a
              href={appUrl}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {t('settings.openApp')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </header>

        <div className="container max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation */}
            <nav className="md:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
                <ul className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const isDanger = item.id === 'danger';
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => navigateToTab(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? isDanger 
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                              : isDanger
                                ? "text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isActive && "stroke-[2.5]")} />
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">{currentNavItem?.label}</h2>
                <p className="text-sm text-muted-foreground">{currentNavItem?.description}</p>
              </div>

              <div className="space-y-6">
                {currentTab === 'profile' && <ProfileSettings />}
                {currentTab === 'security' && <SecuritySettings />}
                {currentTab === 'notifications' && <NotificationSettings />}
                {currentTab === 'billing' && <BillingSettings />}
                {currentTab === 'danger' && <DangerSettings />}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
