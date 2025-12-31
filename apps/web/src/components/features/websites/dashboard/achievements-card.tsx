"use client"

import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  FileText, 
  Layers, 
  Rocket, 
  Puzzle, 
  TrendingUp, 
  Star, 
  Lock, 
  CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AchievementsCardProps } from "./types";

/**
 * Achievements/gamification card showing unlocked badges
 */
export function AchievementsCard({ 
  websiteId, 
  pagesCount, 
  sectionsCount, 
  extensionsCount, 
  isPublished, 
  totalVisits, 
  newsletterSubs 
}: AchievementsCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  const achievements = [
    { 
      id: 'first-page', 
      label: t('dashboard:dashboard.achievements.firstPage'), 
      description: t('dashboard:dashboard.achievements.firstPageDescription'),
      icon: FileText, 
      unlocked: pagesCount > 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      id: 'builder', 
      label: t('dashboard:dashboard.achievements.builder'), 
      description: t('dashboard:dashboard.achievements.builderDescription'),
      icon: Layers, 
      unlocked: sectionsCount >= 5,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    { 
      id: 'live', 
      label: t('dashboard:dashboard.achievements.live'), 
      description: t('dashboard:dashboard.achievements.liveDescription'),
      icon: Rocket, 
      unlocked: isPublished,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      id: 'power-user', 
      label: t('dashboard:dashboard.achievements.powerUser'), 
      description: t('dashboard:dashboard.achievements.powerUserDescription'),
      icon: Puzzle, 
      unlocked: extensionsCount >= 3,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    { 
      id: 'popular', 
      label: t('dashboard:dashboard.achievements.popular'), 
      description: t('dashboard:dashboard.achievements.popularDescription'),
      icon: TrendingUp, 
      unlocked: totalVisits >= 1000,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    { 
      id: 'influencer', 
      label: t('dashboard:dashboard.achievements.influencer'), 
      description: t('dashboard:dashboard.achievements.influencerDescription'),
      icon: Star, 
      unlocked: newsletterSubs >= 100,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {t('dashboard:dashboard.achievements.title')}
          </CardTitle>
          <Badge variant="outline">
            {unlockedCount}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((achievement) => {
            const AchievementIcon = achievement.icon;
            return (
              <div
                key={achievement.id}
                className={`relative group flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  achievement.unlocked 
                    ? `${achievement.bgColor} border-transparent` 
                    : 'bg-muted/30 border-dashed opacity-50'
                }`}
                title={achievement.description}
              >
                <div className={`p-2 rounded-full ${achievement.unlocked ? achievement.bgColor : 'bg-muted'}`}>
                  {achievement.unlocked ? (
                    <AchievementIcon className={`h-4 w-4 ${achievement.color}`} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${
                  achievement.unlocked ? '' : 'text-muted-foreground'
                }`}>
                  {achievement.label}
                </span>
                {achievement.unlocked && (
                  <div className="absolute -top-1 -right-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
