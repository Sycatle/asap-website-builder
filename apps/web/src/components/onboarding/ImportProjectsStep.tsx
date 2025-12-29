/**
 * V1 MVP: Import Projects Step
 * 
 * Step 2 of onboarding: Select GitHub repositories to import as projects.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { ArrowRight, ArrowLeft, Star, GitFork, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { GitHubRepo } from '@/lib/api/onboarding';
import { sortReposByRelevance } from '@/lib/api/onboarding';

interface ImportProjectsStepProps {
  repos: GitHubRepo[];
  selectedRepoIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  isImporting?: boolean;
}

export function ImportProjectsStep({
  repos,
  selectedRepoIds,
  onSelectionChange,
  onNext,
  onBack,
  isLoading = false,
  isImporting = false,
}: ImportProjectsStepProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Sort repos by relevance
  const sortedRepos = React.useMemo(() => sortReposByRelevance(repos), [repos]);
  
  // Filter repos by search
  const filteredRepos = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedRepos;
    const query = searchQuery.toLowerCase();
    return sortedRepos.filter(
      repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query) ||
        repo.topics.some(t => t.toLowerCase().includes(query))
    );
  }, [sortedRepos, searchQuery]);

  const toggleRepo = (repoId: number) => {
    if (selectedRepoIds.includes(repoId)) {
      onSelectionChange(selectedRepoIds.filter(id => id !== repoId));
    } else {
      onSelectionChange([...selectedRepoIds, repoId]);
    }
  };

  const selectRecommended = () => {
    // Select top 6 non-fork repos with most stars
    const recommended = sortedRepos
      .filter(r => !r.fork)
      .slice(0, 6)
      .map(r => r.id);
    onSelectionChange(recommended);
  };

  const selectAll = () => {
    onSelectionChange(filteredRepos.map(r => r.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Chargement de vos repositories...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Sélectionnez vos projets</CardTitle>
              <CardDescription className="mt-1">
                Choisissez les repositories à afficher dans votre portfolio
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {selectedRepoIds.length} / {repos.length} sélectionnés
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un repository..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectRecommended}>
                Recommandés
              </Button>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Tout
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Aucun
              </Button>
            </div>
          </div>

          {/* Repos List */}
          <ScrollArea className="h-[400px] rounded-lg border">
            <div className="p-4 space-y-2">
              {filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun repository trouvé
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <RepoItem
                    key={repo.id}
                    repo={repo}
                    isSelected={selectedRepoIds.includes(repo.id)}
                    onToggle={() => toggleRepo(repo.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">💡 Conseil :</span>{' '}
              Sélectionnez 3 à 6 projets représentatifs de vos compétences. 
              Privilégiez la qualité sur la quantité.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button 
          onClick={onNext} 
          disabled={selectedRepoIds.length === 0 || isImporting}
          className="gap-2"
        >
          {isImporting ? (
            <>
              <Spinner className="h-4 w-4" />
              Import en cours...
            </>
          ) : (
            <>
              Importer {selectedRepoIds.length} projet{selectedRepoIds.length > 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Repo Item Component
interface RepoItemProps {
  repo: GitHubRepo;
  isSelected: boolean;
  onToggle: () => void;
}

function RepoItem({ repo, isSelected, onToggle }: RepoItemProps) {
  const pushedDate = new Date(repo.pushed_at);
  const isRecent = Date.now() - pushedDate.getTime() < 90 * 24 * 60 * 60 * 1000; // 90 days

  return (
    <label
      className={`
        flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{repo.name}</span>
          {repo.fork && (
            <Badge variant="secondary" className="text-xs gap-1">
              <GitFork className="h-3 w-3" />
              Fork
            </Badge>
          )}
          {isRecent && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
              Récent
            </Badge>
          )}
        </div>
        
        {repo.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {repo.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {repo.language}
            </span>
          )}
          {repo.stargazers_count > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stargazers_count}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {pushedDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {repo.topics.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {repo.topics.slice(0, 4).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
            {repo.topics.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{repo.topics.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
