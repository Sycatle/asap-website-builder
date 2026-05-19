"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";

interface KnobSpec {
  name: string;
  type: "string" | "number" | "boolean";
  default?: string | number | boolean;
}

interface Props {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
}

function readKnobs(schema: unknown): KnobSpec[] {
  if (!schema || typeof schema !== "object") return [];
  const obj = schema as { knobs?: unknown };
  if (!Array.isArray(obj.knobs)) return [];
  return obj.knobs
    .map((raw): KnobSpec | null => {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as Partial<KnobSpec>;
      if (!r.name || typeof r.name !== "string") return null;
      if (r.type !== "string" && r.type !== "number" && r.type !== "boolean") return null;
      return { name: r.name, type: r.type, default: r.default };
    })
    .filter((k): k is KnobSpec => k !== null);
}

function knobValue(
  knob: KnobSpec,
  settings: Record<string, unknown> | undefined,
): string | number | boolean {
  const stored = settings?.[knob.name];
  if (stored !== undefined && typeof stored === knob.type) {
    return stored as string | number | boolean;
  }
  return knob.default ?? defaultFor(knob.type);
}

function defaultFor(type: KnobSpec["type"]): string | number | boolean {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
  }
}

/**
 * Renders the AI-extracted knobs (the literal-default props from the section
 * component) as directly editable inputs. Saving the panel does a vanilla
 * PATCH on `settings` — no LLM round-trip, no recompile.
 */
export function SectionKnobsPanel({ element, onUpdate }: Props) {
  const knobs = useMemo(() => readKnobs(element.knobs_schema), [element.knobs_schema]);

  // Local working copy keyed by knob name so the user can tweak several
  // values before saving the bundle.
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>(
    () =>
      Object.fromEntries(
        knobs.map((k) => [k.name, knobValue(k, element.settings)]),
      ),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        knobs.map((k) => [k.name, knobValue(k, element.settings)]),
      ),
    );
  }, [element.id, knobs, element.settings]);

  if (knobs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aucun knob détecté. Pour exposer un contrôle direct, ajoute une prop
        avec une valeur par défaut littérale au composant (ex.{" "}
        <code className="font-mono">{`function Hero({ headline = "..." }) {}`}</code>).
      </p>
    );
  }

  const dirty = knobs.some((k) => draft[k.name] !== knobValue(k, element.settings));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextSettings: Record<string, unknown> = {
        ...(element.settings ?? {}),
      };
      for (const k of knobs) {
        nextSettings[k.name] = draft[k.name];
      }
      await onUpdate({ settings: nextSettings });
      toast.success("Knobs sauvegardés.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde des knobs.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Knobs ({knobs.length})
        </p>
        <p className="text-xs text-muted-foreground">
          Édition directe sans appel à l'IA. Les valeurs sont stockées dans{" "}
          <code className="font-mono">settings</code> et passées comme props
          au runtime.
        </p>
      </div>

      <div className="space-y-3">
        {knobs.map((knob) => (
          <KnobControl
            key={knob.name}
            knob={knob}
            value={draft[knob.name]}
            onChange={(v) =>
              setDraft((prev) => ({ ...prev, [knob.name]: v }))
            }
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!dirty || isSaving}
          size="sm"
          variant="secondary"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Sauvegarde…
            </>
          ) : (
            "Sauvegarder les knobs"
          )}
        </Button>
      </div>
    </div>
  );
}

interface KnobControlProps {
  knob: KnobSpec;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}

function KnobControl({ knob, value, onChange }: KnobControlProps) {
  const id = `knob-${knob.name}`;
  switch (knob.type) {
    case "string":
      return (
        <div className="space-y-1">
          <Label htmlFor={id} className="text-xs font-medium">
            {knob.name}
          </Label>
          <Input
            id={id}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-1">
          <Label htmlFor={id} className="text-xs font-medium">
            {knob.name}
          </Label>
          <Input
            id={id}
            type="number"
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="font-mono text-xs"
          />
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-xs font-medium">
            {knob.name}
          </Label>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
        </div>
      );
  }
}
