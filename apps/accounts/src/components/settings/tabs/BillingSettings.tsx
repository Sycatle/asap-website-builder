import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/authStore';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0€',
    period: '/mois',
    features: [
      '1 site web',
      '100 Mo de stockage',
      'Domaine asap.cool',
      'Support communautaire',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9€',
    period: '/mois',
    features: [
      '5 sites web',
      '10 Go de stockage',
      'Domaine personnalisé',
      'Support prioritaire',
      'Statistiques avancées',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '29€',
    period: '/mois',
    features: [
      'Sites illimités',
      '100 Go de stockage',
      'Multi-domaines',
      'Support dédié',
      'API avancée',
      'SSO & équipes',
    ],
  },
];

export default function BillingSettings() {
  const { t } = useTranslation(['common']);
  const { user } = useAuthStore();
  const currentPlan = user?.plan || 'free';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('settings.billing.currentPlan')}
          </CardTitle>
          <CardDescription>
            {t('settings.billing.currentPlanDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold capitalize">{currentPlan}</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan === 'free' 
                  ? t('settings.billing.freeDescription')
                  : t('settings.billing.paidDescription')
                }
              </p>
            </div>
            {currentPlan !== 'free' && (
              <Button variant="outline" size="sm">
                {t('settings.billing.manageSubscription')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.billing.availablePlans')}</CardTitle>
          <CardDescription>
            {t('settings.billing.availablePlansDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border p-4 ${
                    plan.popular ? 'border-primary shadow-sm' : ''
                  } ${isCurrent ? 'bg-muted/50' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 right-4">
                      {t('settings.billing.popular')}
                    </Badge>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <div className="mt-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrent}
                  >
                    {isCurrent 
                      ? t('settings.billing.currentPlanBadge')
                      : plan.id === 'free'
                        ? t('settings.billing.downgrade')
                        : t('settings.billing.upgrade')
                    }
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.billing.invoices')}</CardTitle>
          <CardDescription>
            {t('settings.billing.invoicesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'free' ? (
            <p className="text-sm text-muted-foreground">
              {t('settings.billing.noInvoices')}
            </p>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="gap-2">
                {t('settings.billing.viewInvoices')}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
