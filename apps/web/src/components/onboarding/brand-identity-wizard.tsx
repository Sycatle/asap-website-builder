"use client";

/**
 * Brand Identity Wizard — Sprint 2.4
 *
 * A 3-step wizard that derives a `DesignTokens` set for a website:
 *   1. Pick a seed color (color input).
 *   2. Provide a short brand brief: sector, tone, formality, harmony, mode.
 *   3. Preview the derived tokens. On confirm, persist into website metadata.
 *
 * The wizard is intentionally self-contained: it talks to
 *   POST /websites/onboarding/derive-tokens (stateless)
 * and to
 *   PUT  /websites/:id  (to persist into metadata.tokens).
 */

import { useState } from "react";
import type {
  DesignTokens,
  WebsiteMetadata,
} from "@asap/shared";
import type { JsonObject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  onboardingAPI,
  type ColorModeChoice,
  type FormalityChoice,
  type HarmonyChoice,
} from "@/lib/api/onboarding";
import { websitesAPI } from "@/lib/api/websites";

type Step = "color" | "brief" | "preview";

interface Props {
  websiteId: string;
  initialMetadata?: WebsiteMetadata;
  onComplete?: (tokens: DesignTokens) => void;
}

export function BrandIdentityWizard({
  websiteId,
  initialMetadata,
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>("color");
  const [seedColor, setSeedColor] = useState("#6366f1");
  const [sector, setSector] = useState("");
  const [tone, setTone] = useState("");
  const [formality, setFormality] = useState<FormalityChoice>("neutral");
  const [mode, setMode] = useState<ColorModeChoice>("dark");
  const [harmony, setHarmony] = useState<HarmonyChoice>("analogous");
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function derive() {
    setBusy(true);
    setError(null);
    try {
      const result = await onboardingAPI.deriveTokens({
        seed_color: seedColor,
        sector: sector || undefined,
        tone: tone || undefined,
        formality,
        mode,
        harmony,
      });
      setTokens(result);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to derive tokens");
    } finally {
      setBusy(false);
    }
  }

  async function applyTokens() {
    if (!tokens) return;
    setBusy(true);
    setError(null);
    try {
      const nextMetadata: WebsiteMetadata = {
        ...(initialMetadata ?? {}),
        tokens,
      };
      await websitesAPI.update(websiteId, {
        metadata: nextMetadata as unknown as Record<string, unknown> as JsonObject,
      });
      onComplete?.(tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tokens");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Brand identity</CardTitle>
        <CardDescription>
          Build a coherent visual identity for your site in three short steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StepIndicator step={step} />

        {step === "color" && (
          <ColorStep seedColor={seedColor} onChange={setSeedColor} />
        )}

        {step === "brief" && (
          <BriefStep
            sector={sector}
            tone={tone}
            formality={formality}
            mode={mode}
            harmony={harmony}
            onSector={setSector}
            onTone={setTone}
            onFormality={setFormality}
            onMode={setMode}
            onHarmony={setHarmony}
          />
        )}

        {step === "preview" && tokens && <PreviewStep tokens={tokens} />}

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          disabled={step === "color" || busy}
          onClick={() => setStep(step === "preview" ? "brief" : "color")}
        >
          Back
        </Button>
        {step === "color" && (
          <Button onClick={() => setStep("brief")}>Continue</Button>
        )}
        {step === "brief" && (
          <Button onClick={derive} disabled={busy}>
            {busy ? "Generating…" : "Generate preview"}
          </Button>
        )}
        {step === "preview" && tokens && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={derive} disabled={busy}>
              Regenerate
            </Button>
            <Button onClick={applyTokens} disabled={busy}>
              {busy ? "Saving…" : "Apply to site"}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// --------------------------------------------------------------------
// Step indicator
// --------------------------------------------------------------------

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "color", label: "Color" },
    { id: "brief", label: "Brief" },
    { id: "preview", label: "Preview" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 text-xs text-muted-foreground">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={
              "inline-flex h-6 w-6 items-center justify-center rounded-full border " +
              (i <= activeIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border")
            }
          >
            {i + 1}
          </span>
          <span className={i === activeIndex ? "text-foreground" : ""}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span aria-hidden>›</span>}
        </li>
      ))}
    </ol>
  );
}

// --------------------------------------------------------------------
// Step: color
// --------------------------------------------------------------------

function ColorStep({
  seedColor,
  onChange,
}: {
  seedColor: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label htmlFor="seed-color">Seed color</Label>
      <p className="text-sm text-muted-foreground">
        This becomes the primary color of your site. Other colors are derived
        from it.
      </p>
      <div className="flex items-center gap-3">
        <input
          id="seed-color"
          type="color"
          value={seedColor}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-16 rounded border border-border bg-transparent"
        />
        <Input
          value={seedColor}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="font-mono"
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Step: brief
// --------------------------------------------------------------------

function BriefStep(props: {
  sector: string;
  tone: string;
  formality: FormalityChoice;
  mode: ColorModeChoice;
  harmony: HarmonyChoice;
  onSector: (v: string) => void;
  onTone: (v: string) => void;
  onFormality: (v: FormalityChoice) => void;
  onMode: (v: ColorModeChoice) => void;
  onHarmony: (v: HarmonyChoice) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sector">Sector</Label>
        <Input
          id="sector"
          placeholder="e.g. saas, restaurant, law firm, creative studio"
          value={props.sector}
          onChange={(e) => props.onSector(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Drives typography and spacing.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Input
          id="tone"
          placeholder="e.g. warm, precise, bold, calm"
          value={props.tone}
          onChange={(e) => props.onTone(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Formality</Label>
          <Select
            value={props.formality}
            onValueChange={(v) => props.onFormality(v as FormalityChoice)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select
            value={props.mode}
            onValueChange={(v) => props.onMode(v as ColorModeChoice)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Harmony</Label>
          <Select
            value={props.harmony}
            onValueChange={(v) => props.onHarmony(v as HarmonyChoice)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analogous">Analogous</SelectItem>
              <SelectItem value="complementary">Complementary</SelectItem>
              <SelectItem value="triadic">Triadic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Step: preview
// --------------------------------------------------------------------

function PreviewStep({ tokens }: { tokens: DesignTokens }) {
  const swatches: { label: string; color: string }[] = [
    { label: "Primary", color: tokens.palette.primary },
    { label: "Secondary", color: tokens.palette.secondary ?? tokens.palette.primary },
    { label: "Accent", color: tokens.palette.accent ?? tokens.palette.primary },
    { label: "Background", color: tokens.palette.background },
    { label: "Foreground", color: tokens.palette.foreground },
    { label: "Muted", color: tokens.palette.muted },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Palette</h3>
        <div className="grid grid-cols-3 gap-2">
          {swatches.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-border overflow-hidden"
            >
              <div
                className="h-10"
                style={{ backgroundColor: s.color }}
                aria-label={`${s.label} swatch`}
              />
              <div className="px-2 py-1 text-xs">
                <div className="font-medium">{s.label}</div>
                <div className="font-mono text-muted-foreground">{s.color}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <PreviewRow label="Display font" value={tokens.typography.displayFamily} />
        <PreviewRow label="Body font" value={tokens.typography.bodyFamily} />
        <PreviewRow
          label="Type scale"
          value={tokens.typography.scaleRatio.toFixed(3)}
        />
        <PreviewRow label="Density" value={tokens.spacing.density} />
        <PreviewRow label="Radius" value={tokens.radius.philosophy} />
        <PreviewRow label="Motion" value={tokens.motion.intensity} />
        <PreviewRow label="Shadow" value={tokens.shadow.philosophy} />
        <PreviewRow label="Mode" value={tokens.palette.mode} />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
