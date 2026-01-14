"use client"

import type { WebsiteElement } from "@/lib/types/element";
import type { ServicesContent, Service } from "@asap/shared/src/types";
import { PropertySection } from "../property-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ServicesPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<WebsiteElement>) => Promise<void>;
}

export function ServicesProperties({ element, onUpdate }: ServicesPropertiesProps) {
  const content = (element.content as ServicesContent) || {};
  const services = content.services || content.items || [];
  const [isUpdating, setIsUpdating] = useState(false);

  const handleServiceChange = async (index: number, field: keyof Service, value: string) => {
    const updatedServices = [...services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, services: updatedServices }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFeaturesChange = async (index: number, featuresString: string) => {
    const features = featuresString.split('\n').map(f => f.trim()).filter(Boolean);
    const updatedServices = [...services];
    updatedServices[index] = { ...updatedServices[index], features };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, services: updatedServices }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddService = async () => {
    const newService: Service = {
      title: "New Service",
      description: "",
      features: [],
    };
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, services: [...services, newService] }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveService = async (index: number) => {
    const updatedServices = services.filter((_, i) => i !== index);
    
    setIsUpdating(true);
    try {
      await onUpdate({
        content: { ...content, services: updatedServices }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PropertySection title="Services">
      <div className="space-y-6">
        {services.map((service, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleRemoveService(index)}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div>
              <Label htmlFor={`service-title-${index}`}>Service Title</Label>
              <Input
                id={`service-title-${index}`}
                value={service.title || ""}
                onChange={(e) => handleServiceChange(index, "title", e.target.value)}
                disabled={isUpdating}
                placeholder="Web Development"
              />
            </div>

            <div>
              <Label htmlFor={`service-desc-${index}`}>Description</Label>
              <Textarea
                id={`service-desc-${index}`}
                value={service.description || ""}
                onChange={(e) => handleServiceChange(index, "description", e.target.value)}
                disabled={isUpdating}
                placeholder="Brief description of the service..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor={`service-icon-${index}`}>Icon (optional)</Label>
              <Input
                id={`service-icon-${index}`}
                value={service.icon || ""}
                onChange={(e) => handleServiceChange(index, "icon", e.target.value)}
                disabled={isUpdating}
                placeholder="Icon name or URL"
              />
            </div>

            <div>
              <Label htmlFor={`service-features-${index}`}>Features (one per line)</Label>
              <Textarea
                id={`service-features-${index}`}
                value={(service.features || []).join("\n")}
                onChange={(e) => handleFeaturesChange(index, e.target.value)}
                disabled={isUpdating}
                placeholder="Responsive design\nCustom animations\nSEO optimization"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor={`service-price-${index}`}>Price (optional)</Label>
              <Input
                id={`service-price-${index}`}
                value={service.price || ""}
                onChange={(e) => handleServiceChange(index, "price", e.target.value)}
                disabled={isUpdating}
                placeholder="$999"
              />
            </div>
          </div>
        ))}

        <Button
          onClick={handleAddService}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>
    </PropertySection>
  );
}
