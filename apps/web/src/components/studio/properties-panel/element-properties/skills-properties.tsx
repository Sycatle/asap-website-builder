"use client"

import type { WebsiteElement } from "@/lib/types/element";
import type { SkillsContent, SkillCategory } from "@asap/shared/src/types";
import { PropertySection } from "../property-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface SkillsPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<WebsiteElement>) => Promise<void>;
}

export function SkillsProperties({ element, onUpdate }: SkillsPropertiesProps) {
  const content = (element.content as SkillsContent) || {};
  const categories = content.categories || [];
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCategoryNameChange = async (index: number, name: string) => {
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...updatedCategories[index], name };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, categories: updatedCategories }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkillsChange = async (index: number, skillsString: string) => {
    const skills = skillsString.split(',').map(s => s.trim()).filter(Boolean);
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...updatedCategories[index], skills };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, categories: updatedCategories }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCategory = async () => {
    const newCategory: SkillCategory = {
      name: "New Category",
      skills: [],
    };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, categories: [...categories, newCategory] }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveCategory = async (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, categories: updatedCategories }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PropertySection title="Skills">
      <div className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleRemoveCategory(index)}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div>
              <Label htmlFor={`category-name-${index}`}>Category Name</Label>
              <Input
                id={`category-name-${index}`}
                value={category.name || ""}
                onChange={(e) => handleCategoryNameChange(index, e.target.value)}
                disabled={isUpdating}
                placeholder="Frontend, Backend, Tools..."
              />
            </div>

            <div>
              <Label htmlFor={`category-skills-${index}`}>Skills (comma-separated)</Label>
              <Input
                id={`category-skills-${index}`}
                value={(category.skills || []).join(", ")}
                onChange={(e) => handleSkillsChange(index, e.target.value)}
                disabled={isUpdating}
                placeholder="React, TypeScript, Node.js"
              />
            </div>
          </div>
        ))}

        <Button
          onClick={handleAddCategory}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
    </PropertySection>
  );
}
