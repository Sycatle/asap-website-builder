"use client"

import { useState } from 'react';
import { useWebsites } from '@/hooks/useCache';
import type { Website } from '@/lib/api';
import { WebsiteCard } from './WebsiteCard';
import { OnboardingModal } from './onboarding/OnboardingModal';
import { EmptyState } from './EmptyState';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Globe,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface WebsitesListProps {
  onSelectWebsite?: (website: Website) => void;
}

export function WebsitesList({ onSelectWebsite }: WebsitesListProps) {
  const { websites, isLoading, refetch } = useWebsites();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleRefresh = async () => {
    await refetch(true);
  };

  const handleWebsiteCreated = (_websiteId: string) => {
    // Refresh the list after creation
    refetch(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <Skeleton className="h-4 w-full mb-3" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Mes sites</h2>
          <Badge variant="outline" className="text-xs">
            {websites.length} site{websites.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un site
          </Button>
        </div>
      </div>

      {/* Content */}
      {websites.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-12 w-12" />}
          title="Aucun site web"
          description="Créez votre premier site en quelques clics à partir d'un template professionnel."
          action={
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Créer mon premier site
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((website, index) => (
            <div 
              key={website.id} 
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
            >
              <WebsiteCard 
                website={website} 
                onSelect={onSelectWebsite}
              />
            </div>
          ))}
          
          {/* Add new site card */}
          <Card 
            className="border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 animate-fade-in-up"
            style={{ animationDelay: `${websites.length * 0.05}s`, animationFillMode: 'both' }}
            onClick={() => setShowCreateModal(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Créer un nouveau site</p>
                <p className="text-sm text-muted-foreground">À partir d'un template</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding modal */}
      <OnboardingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWebsiteCreated}
      />
    </div>
  );
}
