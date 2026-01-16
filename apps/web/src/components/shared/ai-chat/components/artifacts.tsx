"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, Copy, Check, Play, Download, FileText, 
  CheckSquare, Square, ExternalLink, Code, Table, Clock,
  Image as ImageIcon, Diff
} from 'lucide-react';
import type { Artifact, ArtifactType } from '../types';

const ARTIFACT_ICONS: Record<ArtifactType, React.ElementType> = {
  code: Code,
  table: Table,
  checklist: CheckSquare,
  timeline: Clock,
  image: ImageIcon,
  diff: Diff,
  json: Code,
  markdown: FileText,
};

interface ArtifactCardProps {
  artifact: Artifact;
  onAction?: (actionId: string) => void;
}

export function ArtifactCard({ artifact, onAction }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const Icon = ARTIFACT_ICONS[artifact.type];
  
  const handleCopy = async () => {
    const text = typeof artifact.content === 'string' 
      ? artifact.content 
      : JSON.stringify(artifact.content, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <Icon className="w-4 h-4 text-muted-foreground" />
          {artifact.title || artifact.type}
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            !expanded && "-rotate-90"
          )} />
        </button>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Copier"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          
          {artifact.actions?.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={action.label}
            >
              {action.icon === 'play' && <Play className="w-3.5 h-3.5" />}
              {action.icon === 'download' && <Download className="w-3.5 h-3.5" />}
              {action.icon === 'external' && <ExternalLink className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      {expanded && (
        <div className="p-3">
          <ArtifactContent artifact={artifact} />
        </div>
      )}
    </div>
  );
}

function ArtifactContent({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case 'code':
    case 'json':
      return (
        <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-64">
          {typeof artifact.content === 'string' 
            ? artifact.content 
            : JSON.stringify(artifact.content, null, 2)
          }
        </pre>
      );
      
    case 'table':
      return <TableArtifact data={artifact.content as TableData} />;
      
    case 'checklist':
      return <ChecklistArtifact items={artifact.content as ChecklistItem[]} />;
      
    case 'timeline':
      return <TimelineArtifact events={artifact.content as TimelineEvent[]} />;
      
    case 'diff':
      return <DiffArtifact diff={artifact.content as DiffData} />;
      
    case 'image':
      return (
        <img 
          src={artifact.content as string} 
          alt={artifact.title || 'Generated image'}
          className="rounded-lg max-w-full h-auto"
        />
      );
      
    case 'markdown':
    default:
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {artifact.content as string}
        </div>
      );
  }
}

// Table artifact
interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

function TableArtifact({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {data.headers.map((header, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Checklist artifact
interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

function ChecklistArtifact({ items }: { items: ChecklistItem[] }) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(items.filter(i => i.checked).map(i => i.id))
  );
  
  const toggle = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const completed = checkedItems.size;
  const total = items.length;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{completed}/{total} complétés</span>
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
              checkedItems.has(item.id) ? "bg-emerald-500/10" : "hover:bg-muted/50"
            )}
          >
            {checkedItems.has(item.id) ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className={cn(
              "text-sm",
              checkedItems.has(item.id) && "text-muted-foreground line-through"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Timeline artifact
interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
}

function TimelineArtifact({ events }: { events: TimelineEvent[] }) {
  const statusColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };
  
  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mt-2",
              event.status ? statusColors[event.status] : "bg-muted-foreground"
            )} />
            {i < events.length - 1 && (
              <div className="w-px h-full bg-muted" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-xs text-muted-foreground">{event.time}</p>
            <p className="text-sm font-medium">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Diff artifact
interface DiffData {
  before: string;
  after: string;
  changes: { line: number; type: 'add' | 'remove' | 'change' }[];
}

function DiffArtifact({ diff }: { diff: DiffData }) {
  const [view, setView] = useState<'split' | 'unified'>('unified');
  
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button
          onClick={() => setView('unified')}
          className={cn(
            "px-2 py-1 text-xs rounded-md transition-colors",
            view === 'unified' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          Unifié
        </button>
        <button
          onClick={() => setView('split')}
          className={cn(
            "px-2 py-1 text-xs rounded-md transition-colors",
            view === 'split' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          Côte à côte
        </button>
      </div>
      
      {view === 'unified' ? (
        <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto">
          {diff.before.split('\n').map((line, i) => {
            const change = diff.changes.find(c => c.line === i);
            return (
              <div
                key={i}
                className={cn(
                  change?.type === 'add' && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                  change?.type === 'remove' && "bg-red-500/20 text-red-700 dark:text-red-300",
                  change?.type === 'change' && "bg-amber-500/20"
                )}
              >
                {change?.type === 'add' && '+ '}
                {change?.type === 'remove' && '- '}
                {!change && '  '}
                {line}
              </div>
            );
          })}
        </pre>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">Avant</p>
            <pre className="text-xs font-mono bg-red-500/10 rounded-lg p-3 overflow-x-auto">
              {diff.before}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600 mb-1">Après</p>
            <pre className="text-xs font-mono bg-emerald-500/10 rounded-lg p-3 overflow-x-auto">
              {diff.after}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
