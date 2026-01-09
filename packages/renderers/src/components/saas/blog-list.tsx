/**
 * Blog List Section Component
 * 
 * Blog articles listing with multiple variants.
 * - grid: Articles in a grid
 * - list: Vertical list of articles
 * - featured: One featured article + grid
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { Icons } from '../icons';
import { BLOG_LIST_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Article {
  title: string;
  excerpt: string;
  image_url: string;
  category?: string;
  date?: string;
  author?: string;
  href: string;
}

export function BlogListSection({ section, className }: SectionProps) {
  const defaults = BLOG_LIST_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const columns = getData(section, 'columns', defaults.columns as string);
  const articles = getData(section, 'articles', defaults.articles as Article[]);
  const showCategory = getData(section, 'show_category', defaults.show_category as boolean);
  const showDate = getData(section, 'show_date', defaults.show_date as boolean);
  const showAuthor = getData(section, 'show_author', defaults.show_author as boolean);
  const showViewAll = getData(section, 'show_view_all', defaults.show_view_all as boolean);
  const viewAllText = getData(section, 'view_all_text', defaults.view_all_text as string);
  const viewAllHref = getData(section, 'view_all_href', defaults.view_all_href as string);

  // Article card component
  const ArticleCard = ({ article, featured = false }: { article: Article; featured?: boolean }) => (
    <article className={cn(
      "group",
      featured ? "grid md:grid-cols-2 gap-6" : ""
    )}>
      {/* Image */}
      <a href={article.href} className="block overflow-hidden rounded-lg">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className={cn(
              "w-full object-cover transition-transform duration-300 group-hover:scale-105",
              featured ? "aspect-video md:aspect-square" : "aspect-video"
            )}
          />
        ) : (
          <div className={cn(
            "w-full bg-muted flex items-center justify-center",
            featured ? "aspect-video md:aspect-square" : "aspect-video"
          )}>
            <Icons.image className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </a>
      
      {/* Content */}
      <div className={cn(
        featured ? "flex flex-col justify-center" : "mt-4"
      )}>
        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
          {showCategory && article.category && (
            <Badge variant="secondary" size="sm">
              {article.category}
            </Badge>
          )}
          {showDate && article.date && (
            <span>{article.date}</span>
          )}
        </div>
        
        {/* Title */}
        <a href={article.href}>
          <h3 className={cn(
            "font-semibold group-hover:text-primary transition-colors mb-2",
            featured ? "text-2xl md:text-3xl" : "text-lg"
          )}>
            {article.title}
          </h3>
        </a>
        
        {/* Excerpt */}
        <p className={cn(
          "text-muted-foreground",
          featured ? "text-base" : "text-sm line-clamp-2"
        )}>
          {article.excerpt}
        </p>
        
        {/* Author */}
        {showAuthor && article.author && (
          <p className="text-sm text-muted-foreground mt-3">
            Par <span className="font-medium text-foreground">{article.author}</span>
          </p>
        )}
        
        {/* Read more (featured only) */}
        {featured && (
          <Button href={article.href} variant="outline" className="mt-4 w-fit">
            Lire l'article
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </article>
  );

  // Grid variant
  if (variant === 'grid') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
            <div>
              {badgeText && (
                <Badge variant="secondary" size="lg" className="mb-4">
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className="text-muted-foreground max-w-2xl">
                  {subheadline}
                </p>
              )}
            </div>
            {showViewAll && (
              <Button href={viewAllHref} variant="outline">
                {viewAllText}
                <Icons.arrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Grid */}
          <div className={cn(
            "grid gap-8",
            columns === '2' && "md:grid-cols-2",
            columns === '3' && "md:grid-cols-2 lg:grid-cols-3"
          )}>
            {articles.map((article, index) => (
              <ArticleCard key={index} article={article} />
            ))}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container size="default">
          {/* Header */}
          <div className="text-center mb-12">
            {badgeText && (
              <Badge variant="secondary" size="lg" className="mb-4">
                {badgeText}
              </Badge>
            )}
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
          </div>

          {/* List */}
          <div className="divide-y">
            {articles.map((article, index) => (
              <article key={index} className="py-6 first:pt-0 last:pb-0 group">
                <div className="flex gap-6">
                  {/* Image */}
                  <a href={article.href} className="flex-none">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-24 bg-muted rounded-lg flex items-center justify-center">
                        <Icons.image className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </a>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1">
                      {showCategory && article.category && (
                        <Badge variant="secondary" size="sm">
                          {article.category}
                        </Badge>
                      )}
                      {showDate && article.date && (
                        <span>{article.date}</span>
                      )}
                    </div>
                    
                    {/* Title */}
                    <a href={article.href}>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors mb-1 line-clamp-1">
                        {article.title}
                      </h3>
                    </a>
                    
                    {/* Excerpt */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* View all */}
          {showViewAll && (
            <div className="text-center mt-8">
              <Button href={viewAllHref} variant="outline">
                {viewAllText}
                <Icons.arrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Container>
      </SectionWrapper>
    );
  }

  // Featured variant
  const [featuredArticle, ...restArticles] = articles;
  
  return (
    <SectionWrapper variant="default" padding="lg" className={className}>
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
          <div>
            {badgeText && (
              <Badge variant="secondary" size="lg" className="mb-4">
                {badgeText}
              </Badge>
            )}
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-muted-foreground max-w-2xl">
                {subheadline}
              </p>
            )}
          </div>
          {showViewAll && (
            <Button href={viewAllHref} variant="outline">
              {viewAllText}
              <Icons.arrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Featured article */}
        {featuredArticle && (
          <div className="mb-12">
            <ArticleCard article={featuredArticle} featured />
          </div>
        )}

        {/* Rest of articles */}
        {restArticles.length > 0 && (
          <div className={cn(
            "grid gap-8",
            columns === '2' && "md:grid-cols-2",
            columns === '3' && "md:grid-cols-2 lg:grid-cols-3"
          )}>
            {restArticles.map((article, index) => (
              <ArticleCard key={index} article={article} />
            ))}
          </div>
        )}
      </Container>
    </SectionWrapper>
  );
}
