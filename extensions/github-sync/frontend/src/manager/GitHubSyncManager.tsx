/**
 * GitHub Sync Manager
 *
 * Management interface for the github-sync extension.
 * Features a modern layout with hero profile, stats, contribution graph,
 * organizations, languages, gists, and repositories.
 */

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { extensionsAPI } from "@/lib/api";
import { collectionsAPI, variablesAPI } from "@/lib/api/collections";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Github,
  RefreshCw,
  Star,
  GitFork,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderGit2,
  TrendingUp,
  Link as LinkIcon,
  Building2,
  ArrowUpRight,
  Code2,
  FileCode,
  ChevronDown,
  Bookmark,
  Calendar,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  GitHubProfile,
  GitHubRepo,
  GitHubGist,
  GitHubOrg,
  GitHubStarred,
  LanguageStats,
  ContributionDay,
  SyncStatus,
} from "../types";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for extension manager components.
 * This interface is shared across all extension managers.
 */
export interface ExtensionManagerProps {
  websiteId: string;
  settings: Record<string, unknown>;
  onSettingsChange: (settings: Record<string, unknown>) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  isDirty?: boolean;
}

export type GitHubSyncManagerProps = ExtensionManagerProps;

// ============================================================================
// Constants
// ============================================================================

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Lua: "#000080",
  Zig: "#ec915c",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
};

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ============================================================================
// Sub-Components
// ============================================================================

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status.status === "syncing") {
    return (
      <Badge variant="secondary" className="gap-1.5 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        Synchronisation...
      </Badge>
    );
  }

  if (status.status === "success" && status.lastSync) {
    return (
      <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Synchronisé
      </Badge>
    );
  }

  if (status.status === "error") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="w-3 h-3" />
        Erreur
      </Badge>
    );
  }

  return null;
}

function ProfileHero({ profile }: { profile: GitHubProfile }) {
  const memberSince = profile.created_at 
    ? format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <img
        src={profile.avatar_url}
        alt={profile.name || profile.login}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-2 ring-border shadow-lg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-lg sm:text-xl">{profile.name || profile.login}</h2>
          <a
            href={`https://github.com/${profile.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            @{profile.login}
            <ArrowUpRight className="w-3 h-3" />
          </a>
          {profile.hireable && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 text-[10px]">
              <Briefcase className="w-3 h-3 mr-1" />
              Disponible
            </Badge>
          )}
        </div>
        
        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
        )}
        
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
          {profile.company && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {profile.company}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {profile.location}
            </span>
          )}
          {profile.blog && (
            <a
              href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Website
            </a>
          )}
          {memberSince && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Membre depuis {memberSince}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEmptyState({ onSync, isSyncing, canSync }: { onSync: () => void; isSyncing: boolean; canSync: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center mb-6">
        <Github className="w-12 h-12 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Connectez votre GitHub</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {canSync 
          ? "Lancez une synchronisation pour importer vos données GitHub."
          : "Configurez votre nom d'utilisateur dans l'onglet Configuration puis lancez une synchronisation."}
      </p>
      <Button onClick={onSync} disabled={isSyncing || !canSync}>
        {isSyncing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        {canSync ? "Synchroniser" : "Configurez d'abord le username"}
      </Button>
    </div>
  );
}

function StatsGrid({ variables, profile }: { variables: Record<string, unknown>; profile: GitHubProfile }) {
  const stats = [
    { label: "Repos", value: variables.github_total_repos ?? profile.public_repos ?? 0, icon: FolderGit2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Stars", value: variables.github_total_stars ?? 0, icon: Star, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Forks", value: variables.github_total_forks ?? 0, icon: GitFork, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Followers", value: profile.followers ?? 0, icon: Users, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
    { label: "Gists", value: variables.github_gists_count ?? profile.public_gists ?? 0, icon: FileCode, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
    { label: "Starred", value: variables.github_starred_count ?? 0, icon: Bookmark, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:bg-muted/30 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-3">
            <div className={cn("p-1.5 rounded-lg mb-1.5", stat.color)}>
              <stat.icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-base sm:text-lg font-bold tabular-nums leading-none">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : String(stat.value)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Contribution Graph
// ============================================================================

function ContributionGraph({ contributions }: { contributions: ContributionDay[] }) {
  const contributionData = React.useMemo(() => {
    if (!contributions || contributions.length === 0) return [];
    const data: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];
    contributions.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        data.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) data.push(currentWeek);
    return data;
  }, [contributions]);

  const months = React.useMemo(() => {
    if (!contributionData.length) return [];
    const result: { month: string; colSpan: number }[] = [];
    let currentMonth = -1;
    let currentColSpan = 0;

    contributionData.forEach((week) => {
      const firstDay = week[0];
      if (firstDay) {
        const monthIndex = new Date(firstDay.date).getMonth();
        if (monthIndex !== currentMonth) {
          if (currentMonth !== -1) {
            result.push({ month: MONTHS_FR[currentMonth], colSpan: currentColSpan });
          }
          currentMonth = monthIndex;
          currentColSpan = 1;
        } else {
          currentColSpan++;
        }
      }
    });
    if (currentMonth !== -1) {
      result.push({ month: MONTHS_FR[currentMonth], colSpan: currentColSpan });
    }
    return result;
  }, [contributionData]);

  if (!contributions || contributions.length === 0) {
    return null;
  }

  const levelColors = [
    "bg-muted/50",
    "bg-emerald-200 dark:bg-emerald-900",
    "bg-emerald-300 dark:bg-emerald-700",
    "bg-emerald-400 dark:bg-emerald-600",
    "bg-emerald-500 dark:bg-emerald-500",
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit mx-auto">
        <div className="flex gap-[3px] text-[10px] text-muted-foreground mb-1">
          {months.map((m, i) => (
            <div key={i} style={{ width: `${m.colSpan * 13}px` }} className="text-left truncate">
              {m.month}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {contributionData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <TooltipProvider key={dayIndex}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-[10px] h-[10px] rounded-[2px] transition-colors",
                          levelColors[day.level]
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{day.count} contributions</p>
                      <p className="text-muted-foreground">{format(new Date(day.date), "d MMM yyyy", { locale: fr })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
          <span>Moins</span>
          {levelColors.map((color, i) => (
            <div key={i} className={cn("w-[10px] h-[10px] rounded-[2px]", color)} />
          ))}
          <span>Plus</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Languages Section
// ============================================================================

function LanguagesSection({ languages }: { languages: LanguageStats[] }) {
  if (!languages || languages.length === 0) return null;

  const topLanguages = languages.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-500" />
          Langages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topLanguages.map((lang) => (
          <div key={lang.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || "#6e7681" }}
                />
                <span className="font-medium">{lang.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{lang.repo_count} repos</span>
                <span>{lang.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <Progress value={lang.percentage} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Organizations Section
// ============================================================================

function OrganizationsSection({ organizations }: { organizations: GitHubOrg[] }) {
  if (!organizations || organizations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-violet-500" />
          Organisations ({organizations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {organizations.map((org) => (
            <TooltipProvider key={org.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={org.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <img
                      src={org.avatar_url}
                      alt={org.name || org.login}
                      className="w-6 h-6 rounded"
                    />
                    <span className="text-sm font-medium">{org.name || org.login}</span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  {org.description || `Organisation: ${org.name || org.login}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Gists Section
// ============================================================================

function GistsSection({ gists }: { gists: GitHubGist[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!gists || gists.length === 0) return null;

  const displayedGists = isOpen ? gists : gists.slice(0, 4);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-500" />
                Gists ({gists.length})
              </CardTitle>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {displayedGists.map((gist) => (
              <a
                key={gist.id}
                href={gist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <FileCode className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {gist.files[0]?.filename || "Gist"}
                    </span>
                    {gist.file_count > 1 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{gist.file_count - 1} fichiers
                      </Badge>
                    )}
                  </div>
                  {gist.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{gist.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    {gist.language && <span>{gist.language}</span>}
                    <span>{formatDistanceToNow(new Date(gist.updated_at), { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>
                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          {gists.length > 4 && (
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {gists.slice(4).map((gist) => (
                  <a
                    key={gist.id}
                    href={gist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <FileCode className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {gist.files[0]?.filename || "Gist"}
                        </span>
                        {gist.file_count > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{gist.file_count - 1} fichiers
                          </Badge>
                        )}
                      </div>
                      {gist.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{gist.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {gist.language && <span>{gist.language}</span>}
                        <span>{formatDistanceToNow(new Date(gist.updated_at), { addSuffix: true, locale: fr })}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// Starred Repos Section
// ============================================================================

function StarredSection({ starred }: { starred: GitHubStarred[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!starred || starred.length === 0) return null;

  const displayedStarred = isOpen ? starred : starred.slice(0, 4);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-orange-500" />
                Starred ({starred.length})
              </CardTitle>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {displayedStarred.map((repo) => (
              <a
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-6 h-6 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{repo.full_name}</span>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#6e7681" }}
                        />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3" />
                      {repo.stars.toLocaleString()}
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          {starred.length > 4 && (
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {starred.slice(4).map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <img
                      src={repo.owner.avatar_url}
                      alt={repo.owner.login}
                      className="w-6 h-6 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{repo.full_name}</span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#6e7681" }}
                            />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3" />
                          {repo.stars.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// Repositories Section
// ============================================================================

function RepositoriesSection({ repos }: { repos: GitHubRepo[] }) {
  if (!repos || repos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-blue-500" />
          Repositories ({repos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] -mx-2 px-2">
          <div className="space-y-2 pr-4">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <FolderGit2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{repo.name}</span>
                    {repo.is_archived && (
                      <Badge variant="secondary" className="text-[10px]">Archivé</Badge>
                    )}
                    {repo.is_fork && (
                      <Badge variant="outline" className="text-[10px]">Fork</Badge>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#6e7681" }}
                        />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" />
                      {repo.stars.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <GitFork className="w-3 h-3" />
                      {repo.forks.toLocaleString()}
                    </span>
                    {repo.pushed_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(repo.pushed_at), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {repo.topics.slice(0, 5).map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {topic}
                        </Badge>
                      ))}
                      {repo.topics.length > 5 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{repo.topics.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-20 h-20 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GitHubSyncManager({ websiteId, settings }: GitHubSyncManagerProps) {
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle" });
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [languages, setLanguages] = useState<LanguageStats[]>([]);
  const [organizations, setOrganizations] = useState<GitHubOrg[]>([]);
  const [gists, setGists] = useState<GitHubGist[]>([]);
  const [starred, setStarred] = useState<GitHubStarred[]>([]);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  
  // Get username from extension settings
  const username = (settings?.github_username as string) || null;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load collections (use .get with slug, handle 404s gracefully)
      const fetchCollection = async (slug: string) => {
        try {
          return await collectionsAPI.get(websiteId, slug);
        } catch {
          return null;
        }
      };

      const [reposRes, langsRes, orgsRes, gistsRes, starredRes] = await Promise.all([
        fetchCollection("github_repos"),
        fetchCollection("github_languages"),
        fetchCollection("github_organizations"),
        fetchCollection("github_gists"),
        fetchCollection("github_starred"),
      ]);

      if (reposRes?.items) {
        setRepos(reposRes.items.map((item) => item.data as unknown as GitHubRepo));
      }
      if (langsRes?.items) {
        setLanguages(langsRes.items.map((item) => item.data as unknown as LanguageStats));
      }
      if (orgsRes?.items) {
        setOrganizations(orgsRes.items.map((item) => item.data as unknown as GitHubOrg));
      }
      if (gistsRes?.items) {
        setGists(gistsRes.items.map((item) => item.data as unknown as GitHubGist));
      }
      if (starredRes?.items) {
        setStarred(starredRes.items.map((item) => item.data as unknown as GitHubStarred));
      }

      // Load variables
      const varsRes = await variablesAPI.list(websiteId);
      if (varsRes) {
        const varsMap: Record<string, unknown> = {};
        const varsList = Array.isArray(varsRes) ? varsRes : varsRes.variables || [];
        for (const v of varsList) {
          varsMap[v.key] = v.value;
        }
        setVariables(varsMap);

        // Build profile from variables
        if (varsMap.github_username) {
          setProfile({
            login: varsMap.github_username as string,
            name: varsMap.github_name as string || undefined,
            avatar_url: varsMap.github_avatar_url as string || `https://github.com/${varsMap.github_username}.png`,
            bio: varsMap.github_bio as string || undefined,
            location: varsMap.github_location as string || undefined,
            company: varsMap.github_company as string || undefined,
            blog: varsMap.github_blog as string || undefined,
            twitter_username: varsMap.github_twitter as string || undefined,
            email: varsMap.github_email as string || undefined,
            public_repos: varsMap.github_total_repos as number || 0,
            public_gists: varsMap.github_gists_count as number || 0,
            followers: varsMap.github_followers as number || 0,
            following: varsMap.github_following as number || 0,
            created_at: varsMap.github_created_at as string || undefined,
            hireable: varsMap.github_hireable as boolean || false,
          });

          // Set sync status
          if (varsMap.github_last_sync) {
            setSyncStatus({
              status: "success",
              lastSync: varsMap.github_last_sync as string,
              repoCount: varsMap.github_total_repos as number || 0,
            });
          }
        }

        // Load contributions from variable (stored as github_contributions)
        const contributionData = varsMap.github_contributions || varsMap.github_contribution_calendar;
        if (contributionData) {
          try {
            const calendar = typeof contributionData === 'string'
              ? JSON.parse(contributionData)
              : contributionData;
            if (calendar.contributions && calendar.contributions.length > 0) {
              setContributions(calendar.contributions);
              setTotalContributions(calendar.total || 0);
            }
          } catch (e) {
            console.error('[GitHubSync] Failed to parse contributions:', e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load GitHub data:", error);
      toast.error("Erreur lors du chargement des données GitHub");
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = useCallback(async () => {
    if (!username) {
      toast.error("Configurez votre nom d'utilisateur GitHub dans l'onglet Configuration");
      return;
    }

    try {
      setSyncStatus({ status: "syncing" });
      await extensionsAPI.executeAction(websiteId, "github-sync", "sync");
      toast.success("Synchronisation lancée", {
        description: "Les données seront mises à jour dans quelques instants.",
      });
      // Reload data after a short delay
      setTimeout(loadData, 3000);
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus({ status: "error", error: "La synchronisation a échoué" });
      toast.error("Erreur lors de la synchronisation");
    }
  }, [websiteId, username, loadData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // No profile yet - show empty state
  if (!profile) {
    return (
      <ProfileEmptyState
        onSync={handleSync}
        isSyncing={syncStatus.status === "syncing"}
        canSync={!!username}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with profile and sync button */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <ProfileHero profile={profile} />
            <div className="flex items-center gap-2 shrink-0">
              <SyncStatusBadge status={syncStatus} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncStatus.status === "syncing"}
              >
                {syncStatus.status === "syncing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <StatsGrid variables={variables} profile={profile} />

      {/* Contributions + Languages row - Contributions fits content, Languages expands */}
      <div className="flex flex-col lg:flex-row gap-4">
        {contributions.length > 0 && (
          <Card className="shrink-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Contributions
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {totalContributions.toLocaleString()} contributions cette année
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ContributionGraph contributions={contributions} />
            </CardContent>
          </Card>
        )}
        <div className="flex-1 min-w-0">
          <LanguagesSection languages={languages} />
        </div>
      </div>

      {/* Organizations - standalone for visibility */}
      <OrganizationsSection organizations={organizations} />

      {/* Repositories - full width, main content */}
      <RepositoriesSection repos={repos} />

      {/* Gists and Starred row - secondary content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GistsSection gists={gists} />
        <StarredSection starred={starred} />
      </div>

      {/* Last sync info */}
      {syncStatus.lastSync && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Dernière synchronisation: {formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true, locale: fr })}
        </p>
      )}
    </div>
  );
}

export default GitHubSyncManager;
