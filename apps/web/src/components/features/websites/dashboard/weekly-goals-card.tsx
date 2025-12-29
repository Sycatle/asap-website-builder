"use client"

import { 
  Target, 
  Activity, 
  Mail, 
  MessageSquare, 
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WeeklyGoalsCardProps } from "./types";

/**
 * Weekly goals card showing progress towards weekly targets
 */
export function WeeklyGoalsCard({ 
  websiteId, 
  currentVisits, 
  currentSubscribers, 
  currentContacts 
}: WeeklyGoalsCardProps) {
  const goals = [
    { 
      id: 'visits', 
      label: 'Visites cette semaine', 
      current: currentVisits, 
      target: 1000, 
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500'
    },
    { 
      id: 'subscribers', 
      label: 'Nouveaux abonnés', 
      current: Math.min(currentSubscribers, 50), 
      target: 50, 
      icon: Mail,
      color: 'text-green-500',
      bgColor: 'bg-green-500'
    },
    { 
      id: 'contacts', 
      label: 'Demandes de contact', 
      current: Math.min(currentContacts, 10), 
      target: 10, 
      icon: MessageSquare,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500'
    },
  ];

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Objectifs de la semaine
          </CardTitle>
          <Link href={`/app/${websiteId}/analytics`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Détails
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
          const isCompleted = percentage >= 100;
          const GoalIcon = goal.icon;
          
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoalIcon className={`h-4 w-4 ${goal.color}`} />
                  <span className="text-sm">{goal.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' : ''}`}>
                    {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                  </span>
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className={`h-1.5 ${isCompleted ? '[&>div]:bg-green-500' : `[&>div]:${goal.bgColor}`}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
