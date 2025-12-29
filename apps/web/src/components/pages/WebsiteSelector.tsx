import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { useWebsitesQuery, queryKeys } from "@/lib/query"
import { useQueryClient } from "@tanstack/react-query"
import { navigate } from "@/components/app-router"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"
import { CheckCircle2, Clock, Globe, Plus, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getWebsiteDisplayUrl } from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"

export default function WebsiteSelector() {
  const { t } = useTranslation(['common'])
  const { data: websites = [], isLoading } = useWebsitesQuery()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Auto-redirect if only one website
  useEffect(() => {
    if (!isLoading && websites.length === 1) {
      navigate(`/app/${websites[0].id}`)
    }
  }, [isLoading, websites])

  const handleCreateSuccess = (websiteId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.websites.all })
    setShowCreateModal(false)
    navigate(`/app/${websiteId}`)
  }

  const handleSelectWebsite = (websiteId: string) => {
    navigate(`/app/${websiteId}`)
  }

  const getStatusInfo = (status: string) => {
    if (status === 'published') {
      return { icon: CheckCircle2, label: t('website.statusOnline'), className: 'text-green-500' }
    }
    return { icon: Clock, label: t('website.statusDraft'), className: 'text-muted-foreground' }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            A
          </div>
          <span className="text-xl font-semibold">ASAP</span>
        </a>

        <Card>
          <CardContent className="p-6">
            {websites.length === 0 ? (
              <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Globe className="h-12 w-12 text-muted-foreground" />
                  <h1 className="text-2xl font-bold">{t('website.welcomeToAsap')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('website.createFirstSite')}
                  </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('website.createMyFirstSite')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-xl font-bold">{t('website.selectSite')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('website.selectSiteDesc')}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {websites.map((website) => {
                    const statusInfo = getStatusInfo(website.status)
                    const StatusIcon = statusInfo.icon
                    return (
                      <button
                        key={website.id}
                        onClick={() => handleSelectWebsite(website.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                          {website.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{website.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{getWebsiteDisplayUrl(website.slug)}</span>
                            <StatusIcon className={cn("h-3 w-3 shrink-0", statusInfo.className)} />
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </button>
                    )
                  })}
                </div>

                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-card px-2 text-muted-foreground">
                    {t('website.or')}
                  </span>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('website.createNewSite')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          {t('website.sitesAvailable', { count: websites.length })}
        </div>
      </div>

      <OnboardingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
