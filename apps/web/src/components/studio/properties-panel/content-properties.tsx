"use client";

import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { HeroProperties } from "./element-properties/hero-properties";
import { AboutProperties } from "./element-properties/about-properties";
import { ContactProperties } from "./element-properties/contact-properties";
import { ProjectsProperties } from "./element-properties/projects-properties";
import { SkillsProperties } from "./element-properties/skills-properties";
import { ServicesProperties } from "./element-properties/services-properties";
import { GenericProperties } from "./element-properties/generic-properties";

interface ContentPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function ContentProperties({
  element,
  onUpdate,
  isUpdating,
}: ContentPropertiesProps) {
  // Route to specific property editor based on element type
  switch (element.element_type) {
    case "hero":
      return <HeroProperties element={element} onUpdate={onUpdate} isUpdating={isUpdating} />;
    case "about":
      return <AboutProperties element={element} onUpdate={onUpdate} isUpdating={isUpdating} />;
    case "contact":
      return <ContactProperties element={element} onUpdate={onUpdate} isUpdating={isUpdating} />;
    case "projects":
      return <ProjectsProperties element={element} onUpdate={onUpdate} />;
    case "skills":
      return <SkillsProperties element={element} onUpdate={onUpdate} />;
    case "services":
      return <ServicesProperties element={element} onUpdate={onUpdate} />;
    // Add more cases as we implement more element-specific property editors
    default:
      return <GenericProperties element={element} onUpdate={onUpdate} isUpdating={isUpdating} />;
  }
}
