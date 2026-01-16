"use client"

import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";

// Helper to clean AI response content
// Removes section property dumps that AI sometimes includes
function cleanAIContent(content: string): string {
  // Remove lists of section properties (property_name: value format)
  // Pattern: lines that start with bullet and contain technical property names
  const technicalPropertyNames = [
    'cta_primary', 'cta_secondary', 'headline_line', 'badge_text', 'dashboard_',
    'social_proof', 'subheadline', 'nav_links', 'show_', 'avatar_'
  ];
  
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let skipPropertyBlock = false;
  let propertyBlockCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect start of property dump (multiple consecutive property-like lines)
    if (trimmed.match(/^[-*•]\s*\w+.*:\s*.+$/) && 
        technicalPropertyNames.some(prop => trimmed.toLowerCase().includes(prop))) {
      propertyBlockCount++;
      if (propertyBlockCount >= 2) {
        skipPropertyBlock = true;
      }
      continue;
    } else {
      propertyBlockCount = 0;
      skipPropertyBlock = false;
    }
    
    if (!skipPropertyBlock) {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * MarkdownContent - Simple markdown renderer component
 * Memoized to prevent re-parsing on every token update during streaming
 */
export const MarkdownContent = React.memo(function MarkdownContent({ 
  content, 
  className 
}: MarkdownContentProps) {
  // Memoize the parsed content to avoid re-parsing on every render
  const parsedContent = useMemo(() => {
    // Clean the content first to remove property dumps
    const cleanedContent = cleanAIContent(content);
    
    const parseInline = (text: string): React.ReactNode => {
      // Parse inline elements: bold, italic, code, links
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;
      
      while (remaining) {
        // Bold **text** or __text__
        const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.*?)\2(.*)$/s);
        if (boldMatch) {
          if (boldMatch[1]) parts.push(boldMatch[1]);
          parts.push(<strong key={key++} className="font-semibold">{parseInline(boldMatch[3])}</strong>);
          remaining = boldMatch[4];
          continue;
        }
        
        // Italic *text* or _text_
        const italicMatch = remaining.match(/^(.*?)(\*|_)([^*_]+)\2(.*)$/s);
        if (italicMatch && !italicMatch[1].endsWith('*') && !italicMatch[1].endsWith('_')) {
          if (italicMatch[1]) parts.push(italicMatch[1]);
          parts.push(<em key={key++} className="italic">{italicMatch[3]}</em>);
          remaining = italicMatch[4];
          continue;
        }
        
        // Inline code `code`
        const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
        if (codeMatch) {
          if (codeMatch[1]) parts.push(codeMatch[1]);
          parts.push(<code key={key++} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{codeMatch[2]}</code>);
          remaining = codeMatch[3];
          continue;
        }
        
        // Links [text](url)
        const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);
        if (linkMatch) {
          if (linkMatch[1]) parts.push(linkMatch[1]);
          parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">{linkMatch[2]}</a>);
          remaining = linkMatch[4];
          continue;
        }
        
        parts.push(remaining);
        break;
      }
      
      return parts.length === 1 ? parts[0] : parts;
    };

    const elements: React.ReactNode[] = [];
    const lines = cleanedContent.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    
    // Track the starting number for ordered lists to maintain continuity
    let olStartNumber = 1;
    
    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        if (listType === 'ol') {
          elements.push(
            <ol key={`list-${elements.length}`} start={olStartNumber} className="list-decimal pl-4 my-2 space-y-1">
              {listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
            </ol>
          );
          // Update start number for next ol segment
          olStartNumber += listItems.length;
        } else {
          elements.push(
            <ListTag key={`list-${elements.length}`} className="list-disc pl-4 my-2 space-y-1">
              {listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
            </ListTag>
          );
        }
        listItems = [];
        listType = null;
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Code block start/end
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushList();
          // Skip JSON blocks that look like AI actions (contain "type": with action keywords)
          const isAIActionBlock = codeBlockLang === 'json' && 
            codeBlockContent.includes('"type"') && 
            /("type"\s*:\s*"(update_section|update_property|add_section|remove_section|reorder_sections|duplicate_section|update_theme|update_metadata|generate_content|UPDATE_SECTION_PROPERTY)"|"section_id"|"property")/i.test(codeBlockContent);
          
          if (!isAIActionBlock) {
            elements.push(
              <pre key={`code-${elements.length}`} className="my-2 p-3 bg-muted rounded-lg overflow-x-auto">
                <code className="text-xs font-mono">{codeBlockContent.trim()}</code>
              </pre>
            );
          }
          codeBlockContent = '';
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }
      
      // Headers - reset ordered list counter as headers start new sections
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        flushList();
        olStartNumber = 1; // Reset counter for new section
        const level = headerMatch[1].length;
        const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-medium', 'text-xs font-medium'];
        elements.push(<div key={`h-${elements.length}`} className={`${sizes[level-1]} my-2`}>{parseInline(headerMatch[2])}</div>);
        continue;
      }
      
      // Unordered list
      const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (listType !== 'ul') flushList();
        listType = 'ul';
        listItems.push(ulMatch[1]);
        continue;
      }
      
      // Ordered list
      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (olMatch) {
        if (listType !== 'ol') flushList();
        listType = 'ol';
        listItems.push(olMatch[1]);
        continue;
      }
      
      // Horizontal rule
      if (line.match(/^[-*_]{3,}$/)) {
        flushList();
        elements.push(<hr key={`hr-${elements.length}`} className="my-3 border-border" />);
        continue;
      }
      
      // Blockquote
      if (line.startsWith('>')) {
        flushList();
        elements.push(
          <blockquote key={`bq-${elements.length}`} className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
            {parseInline(line.slice(1).trim())}
          </blockquote>
        );
        continue;
      }
      
      // Empty line
      if (!line.trim()) {
        flushList();
        continue;
      }
      
      // Regular paragraph
      flushList();
      elements.push(<p key={`p-${elements.length}`} className="my-1">{parseInline(line)}</p>);
    }
    
    flushList();
    return elements;
  }, [content]); // Only re-parse when content changes

  return <div className={cn("prose-sm", className)}>{parsedContent}</div>;
});

export default MarkdownContent;
