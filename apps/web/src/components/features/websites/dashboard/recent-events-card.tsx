"use client"

import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  ChevronRight, 
  Eye, 
  Mail, 
  MessageSquare, 
  FileText, 
  Globe 
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "./utils";
import type { RecentEventsCardProps } from "./types";

interface Event {
  id: string;
  type: string;
  title: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

/**
 * Recent events card showing live activity
 */
export function RecentEventsCard({ websiteId }: RecentEventsCardProps) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const generateEvents = () => {
      const now = new Date();
      const eventTypes = [
        { type: 'visit', title: 'Nouvelle visite', icon: Eye, color: 'text-blue-500' },
        { type: 'subscriber', title: 'Nouvel abonné newsletter', icon: Mail, color: 'text-green-500' },
        { type: 'contact', title: 'Nouvelle demande de contact', icon: MessageSquare, color: 'text-amber-500' },
        { type: 'page_view', title: 'Page consultée: Accueil', icon: FileText, color: 'text-violet-500' },
        { type: 'visit', title: 'Visiteur depuis Google', icon: Globe, color: 'text-blue-500' },
      ];

      const newEvents: Event[] = [];
      for (let i = 0; i < 5; i++) {
        const eventTime = new Date(now.getTime() - Math.random() * 3600000); // Within last hour
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        newEvents.push({
          id: `event-${i}-${Date.now()}`,
          ...eventType,
          time: formatTimeAgo(eventTime),
        });
      }
      setEvents(newEvents);
    };

    generateEvents();
    const interval = setInterval(generateEvents, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="lg:col-span-7">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Activité récente
          </CardTitle>
          <Link href={`/app/${websiteId}/analytics`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Voir tout
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const EventIcon = event.icon;
            return (
              <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className={`p-1.5 rounded-full bg-muted`}>
                  <EventIcon className={`h-3.5 w-3.5 ${event.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{event.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
