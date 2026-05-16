"use client";

/**
 * Variant Picker — studio properties panel.
 *
 * Lets the user choose a variant_key for the selected section and edit the
 * variant's typed parameters. Persists into `element.settings.variant_key`
 * and `element.settings.variant_params` so the renderer's
 * `withVariantFields()` helper picks them up at render time without a DB
 * migration.
 */

import { useMemo } from "react";
import { variantsForSection, type VariantSpec } from "@asap/renderers";
import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function VariantPicker({ element, onUpdate, isUpdating }: Props) {
  const variants = useMemo(
    () => variantsForSection(element.element_type),
    [element.element_type],
  );

  if (variants.length === 0) {
    return null;
  }

  // Prefer the native columns; fall back to the legacy `settings.variant_*`
  // for elements written before the migration that promoted them to columns.
  const settings = (element.settings ?? {}) as Record<string, unknown>;
  const legacyKey =
    typeof settings.variant_key === "string" ? (settings.variant_key as string) : undefined;
  const legacyParams =
    settings.variant_params && typeof settings.variant_params === "object" && !Array.isArray(settings.variant_params)
      ? (settings.variant_params as Record<string, unknown>)
      : undefined;

  const currentKey = element.variant_key ?? legacyKey ?? variants[0].key;
  const currentParams =
    (element.variant_params as Record<string, unknown> | undefined) ?? legacyParams ?? {};
  const activeVariant = variants.find((v) => v.key === currentKey) ?? variants[0];

  async function setVariant(nextKey: string) {
    await onUpdate({
      variant_key: nextKey,
      variant_params: filterParamsForVariant(
        variants.find((v) => v.key === nextKey),
        currentParams,
      ),
    });
  }

  async function setParam(key: string, value: unknown) {
    await onUpdate({
      variant_params: { ...currentParams, [key]: value },
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Variant</Label>
        <Select value={currentKey} onValueChange={setVariant} disabled={isUpdating}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.key} value={v.key}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeVariant.description && (
          <p className="text-xs text-muted-foreground">{activeVariant.description}</p>
        )}
      </div>

      {activeVariant.params.length > 0 && (
        <div className="space-y-3 border-t border-border pt-3">
          {activeVariant.params.map((param) => (
            <VariantParamControl
              key={param.key}
              spec={param}
              value={currentParams[param.key]}
              onChange={(v) => setParam(param.key, v)}
              disabled={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// Param control — renders the appropriate input for the spec type.
// --------------------------------------------------------------------

function VariantParamControl({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: VariantSpec["params"][number];
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  if (spec.type === "select") {
    const v = typeof value === "string" ? value : (spec.default as string | undefined) ?? "";
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{spec.label}</Label>
        <Select value={v} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(spec.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (spec.type === "boolean") {
    const v = typeof value === "boolean" ? value : Boolean(spec.default);
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs">{spec.label}</Label>
        <Switch checked={v} onCheckedChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (spec.type === "number") {
    const v = typeof value === "number" ? value : (spec.default as number | undefined) ?? spec.min ?? 0;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{spec.label}</Label>
        <Input
          type="number"
          value={v}
          min={spec.min}
          max={spec.max}
          step={spec.min !== undefined && spec.max !== undefined && spec.max - spec.min <= 2 ? 0.05 : 1}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        />
      </div>
    );
  }

  // string
  const v = typeof value === "string" ? value : (spec.default as string | undefined) ?? "";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{spec.label}</Label>
      <Input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={spec.label}
      />
    </div>
  );
}

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

function filterParamsForVariant(
  spec: VariantSpec | undefined,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (!spec) return {};
  const allowed = new Set(spec.params.map((p) => p.key));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}
