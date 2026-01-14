"use client"

import type { WebsiteElement } from "@/lib/types/element";
import type { ProjectsContent, Project } from "@asap/shared/src/types";
import { PropertySection } from "../property-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ProjectsPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<WebsiteElement>) => Promise<void>;
}

export function ProjectsProperties({ element, onUpdate }: ProjectsPropertiesProps) {
  const content = (element.content as ProjectsContent) || {};
  const projects = content.projects || [];
  const [isUpdating, setIsUpdating] = useState(false);

  const handleProjectChange = async (index: number, field: keyof Project, value: string) => {
    const updatedProjects = [...projects];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, projects: updatedProjects }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddProject = async () => {
    const newProject: Project = {
      title: "New Project",
      description: "",
      tags: [],
    };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, projects: [...projects, newProject] }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveProject = async (index: number) => {
    const updatedProjects = projects.filter((_, i) => i !== index);
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, projects: updatedProjects }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTagsChange = async (index: number, tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    const updatedProjects = [...projects];
    updatedProjects[index] = { ...updatedProjects[index], tags };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, projects: updatedProjects }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PropertySection title="Projects">
      <div className="space-y-6">
        {projects.map((project, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleRemoveProject(index)}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div>
              <Label htmlFor={`project-title-${index}`}>Project Title</Label>
              <Input
                id={`project-title-${index}`}
                value={project.title || ""}
                onChange={(e) => handleProjectChange(index, "title", e.target.value)}
                disabled={isUpdating}
                placeholder="My Awesome Project"
              />
            </div>

            <div>
              <Label htmlFor={`project-desc-${index}`}>Description</Label>
              <Textarea
                id={`project-desc-${index}`}
                value={project.description || ""}
                onChange={(e) => handleProjectChange(index, "description", e.target.value)}
                disabled={isUpdating}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor={`project-image-${index}`}>Image URL</Label>
              <Input
                id={`project-image-${index}`}
                value={project.image || project.imageUrl || ""}
                onChange={(e) => handleProjectChange(index, "image", e.target.value)}
                disabled={isUpdating}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor={`project-tags-${index}`}>Tags (comma-separated)</Label>
              <Input
                id={`project-tags-${index}`}
                value={(project.tags || []).join(", ")}
                onChange={(e) => handleTagsChange(index, e.target.value)}
                disabled={isUpdating}
                placeholder="React, TypeScript, Next.js"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`project-link-${index}`}>Live URL</Label>
                <Input
                  id={`project-link-${index}`}
                  value={project.link || project.liveUrl || ""}
                  onChange={(e) => handleProjectChange(index, "link", e.target.value)}
                  disabled={isUpdating}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor={`project-github-${index}`}>GitHub URL</Label>
                <Input
                  id={`project-github-${index}`}
                  value={project.github || project.githubUrl || ""}
                  onChange={(e) => handleProjectChange(index, "github", e.target.value)}
                  disabled={isUpdating}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          onClick={handleAddProject}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>
    </PropertySection>
  );
}
