/**
 * Design Page — Sprint 5
 *
 * Token editor for a site's visual identity. Loads the active DesignTokens
 * (from `metadata.tokens`, with a Theme→tokens backfill for legacy sites),
 * lets the user tune palette, typography, layout (spacing/radius), and
 * motion, and saves the result back into the website metadata.
 *
 * A right-hand preview pane reflects the in-flight edits live via CSS
 * custom properties, so changes are visible before saving.
 */

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  buildTokenStyles,
  defaultDesignTokens,
  resolveTokens,
  type DesignTokens,
  type WebsiteMetadata,
} from "@asap/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
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
import { PageHeader } from "@/components/shared/page-header";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandIdentityWizard } from "@/components/onboarding/brand-identity-wizard";
import {
  useUpdateWebsiteMutation,
  useWebsiteQuery,
} from "@/lib/query/websites";
import { queryKeys } from "@/lib/query/queryKeys";
import type { JsonObject } from "@/lib/types";

interface Props {
  websiteId: string;
}

export function DesignPage({ websiteId }: Props) {
  const { data: website, isLoading } = useWebsiteQuery(websiteId);
  const updateMutation = useUpdateWebsiteMutation();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Initial tokens: explicit > themeToDesignTokens(theme) > defaults.
  const initialTokens = useMemo<DesignTokens>(() => {
    const metadata = (website?.metadata ?? {}) as WebsiteMetadata;
    return resolveTokens({ tokens: metadata.tokens, theme: metadata.theme });
  }, [website?.metadata]);

  const [tokens, setTokens] = useState<DesignTokens>(initialTokens);
  const [dirty, setDirty] = useState(false);

  // Re-sync local state when the loaded website changes.
  useEffect(() => {
    setTokens(initialTokens);
    setDirty(false);
  }, [initialTokens]);

  function patch<K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) {
    setTokens((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function onSave() {
    if (!website) return;
    const metadata: WebsiteMetadata = {
      ...((website.metadata ?? {}) as WebsiteMetadata),
      tokens,
    };
    try {
      await updateMutation.mutateAsync({
        id: websiteId,
        data: { metadata: metadata as unknown as JsonObject },
      });
      setDirty(false);
      toast.success("Design saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save design");
    }
  }

  function onReset() {
    setTokens(defaultDesignTokens());
    setDirty(true);
  }

  if (isLoading || !website) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design"
        subtitle="Tune the visual identity of this site. Changes preview live and apply once you save."
        isMainPage
        actions={[
          {
            label: "Re-derive from brand",
            variant: "ghost",
            onClick: () => setWizardOpen(true),
            disabled: updateMutation.isPending,
            priority: "secondary",
          },
          {
            label: "Reset to defaults",
            variant: "outline",
            onClick: onReset,
            disabled: updateMutation.isPending,
            priority: "secondary",
          },
          {
            label: updateMutation.isPending ? "Saving…" : "Save",
            onClick: onSave,
            disabled: !dirty || updateMutation.isPending,
            priority: "primary",
          },
        ]}
      />

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Re-derive design from brand</DialogTitle>
            <DialogDescription>
              Pick a new seed color and a short brief to regenerate the tokens.
              The result replaces your current design when you apply it.
            </DialogDescription>
          </DialogHeader>
          <BrandIdentityWizard
            websiteId={websiteId}
            initialMetadata={website.metadata as WebsiteMetadata | undefined}
            onComplete={(nextTokens) => {
              setTokens(nextTokens);
              setDirty(false);
              setWizardOpen(false);
              queryClient.invalidateQueries({
                queryKey: queryKeys.websites.detail(websiteId),
              });
              toast.success("Design derived from brand identity");
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div>
          <Tabs defaultValue="palette" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="palette">Palette</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="motion">Motion</TabsTrigger>
            </TabsList>
            <TabsContent value="palette" className="mt-4">
              <PaletteEditor tokens={tokens} onChange={(palette) => patch("palette", palette)} />
            </TabsContent>
            <TabsContent value="typography" className="mt-4">
              <TypographyEditor
                tokens={tokens}
                onChange={(typography) => patch("typography", typography)}
              />
            </TabsContent>
            <TabsContent value="layout" className="mt-4">
              <LayoutEditor
                tokens={tokens}
                onSpacing={(spacing) => patch("spacing", spacing)}
                onRadius={(radius) => patch("radius", radius)}
              />
            </TabsContent>
            <TabsContent value="motion" className="mt-4">
              <MotionEditor tokens={tokens} onChange={(motion) => patch("motion", motion)} />
            </TabsContent>
          </Tabs>
        </div>
        <PreviewPane tokens={tokens} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Palette editor
// --------------------------------------------------------------------

function PaletteEditor({
  tokens,
  onChange,
}: {
  tokens: DesignTokens;
  onChange: (palette: DesignTokens["palette"]) => void;
}) {
  const palette = tokens.palette;
  const update = <K extends keyof DesignTokens["palette"]>(
    key: K,
    value: DesignTokens["palette"][K],
  ) => onChange({ ...palette, [key]: value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Palette</CardTitle>
        <CardDescription>Primary, secondary, accent, and neutrals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={palette.mode} onValueChange={(v) => update("mode", v as "dark" | "light")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorRow label="Primary" value={palette.primary} onChange={(v) => update("primary", v)} />
          <ColorRow
            label="Secondary"
            value={palette.secondary ?? "#000000"}
            onChange={(v) => update("secondary", v)}
          />
          <ColorRow
            label="Accent"
            value={palette.accent ?? "#000000"}
            onChange={(v) => update("accent", v)}
          />
          <ColorRow label="Background" value={palette.background} onChange={(v) => update("background", v)} />
          <ColorRow label="Foreground" value={palette.foreground} onChange={(v) => update("foreground", v)} />
          <ColorRow label="Muted" value={palette.muted} onChange={(v) => update("muted", v)} />
          <ColorRow label="Border" value={palette.border} onChange={(v) => update("border", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border border-border bg-transparent shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Typography editor
// --------------------------------------------------------------------

const FONT_OPTIONS = [
  "Inter",
  "Manrope",
  "Outfit",
  "Space Grotesk",
  "DM Sans",
  "DM Serif Display",
  "Fraunces",
  "Source Sans 3",
  "Source Serif 4",
  "Cormorant Garamond",
  "Bricolage Grotesque",
  "Archivo",
  "Archivo Black",
];

const SCALE_RATIOS = [
  { value: 1.125, label: "1.125 (Major Second)" },
  { value: 1.2, label: "1.2 (Minor Third)" },
  { value: 1.25, label: "1.25 (Major Third)" },
  { value: 1.333, label: "1.333 (Perfect Fourth)" },
  { value: 1.414, label: "1.414 (Augmented Fourth)" },
];

function TypographyEditor({
  tokens,
  onChange,
}: {
  tokens: DesignTokens;
  onChange: (typography: DesignTokens["typography"]) => void;
}) {
  const t = tokens.typography;
  const update = <K extends keyof DesignTokens["typography"]>(
    key: K,
    value: DesignTokens["typography"][K],
  ) => onChange({ ...t, [key]: value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
        <CardDescription>Display and body fonts, type scale.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Display family</Label>
            <FontSelect value={t.displayFamily} onChange={(v) => update("displayFamily", v)} />
          </div>
          <div className="space-y-2">
            <Label>Body family</Label>
            <FontSelect value={t.bodyFamily} onChange={(v) => update("bodyFamily", v)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Type scale ratio</Label>
          <Select
            value={String(t.scaleRatio)}
            onValueChange={(v) => update("scaleRatio", Number(v))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCALE_RATIOS.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {FONT_OPTIONS.map((f) => (
          <SelectItem key={f} value={f}>{f}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --------------------------------------------------------------------
// Layout editor (spacing + radius)
// --------------------------------------------------------------------

function LayoutEditor({
  tokens,
  onSpacing,
  onRadius,
}: {
  tokens: DesignTokens;
  onSpacing: (spacing: DesignTokens["spacing"]) => void;
  onRadius: (radius: DesignTokens["radius"]) => void;
}) {
  const s = tokens.spacing;
  const r = tokens.radius;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Layout</CardTitle>
        <CardDescription>Spacing density and corner radius philosophy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Density</Label>
          <Select
            value={s.density}
            onValueChange={(v) => onSpacing({ ...s, density: v as DesignTokens["spacing"]["density"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="airy">Airy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Radius philosophy</Label>
          <Select
            value={r.philosophy}
            onValueChange={(v) => onRadius({ ...r, philosophy: v as DesignTokens["radius"]["philosophy"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sharp">Sharp</SelectItem>
              <SelectItem value="soft">Soft</SelectItem>
              <SelectItem value="pill">Pill</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberRow label="Radius sm" value={r.sm} onChange={(n) => onRadius({ ...r, sm: n })} />
          <NumberRow label="Radius md" value={r.md} onChange={(n) => onRadius({ ...r, md: n })} />
          <NumberRow label="Radius lg" value={r.lg} onChange={(n) => onRadius({ ...r, lg: n })} />
        </div>
      </CardContent>
    </Card>
  );
}

function NumberRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-xs"
      />
    </div>
  );
}

// --------------------------------------------------------------------
// Motion editor
// --------------------------------------------------------------------

function MotionEditor({
  tokens,
  onChange,
}: {
  tokens: DesignTokens;
  onChange: (motion: DesignTokens["motion"]) => void;
}) {
  const m = tokens.motion;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Motion</CardTitle>
        <CardDescription>How expressive transitions feel across the site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Intensity</Label>
          <Select
            value={m.intensity}
            onValueChange={(v) =>
              onChange({ ...m, intensity: v as DesignTokens["motion"]["intensity"] })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (no motion)</SelectItem>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="expressive">Expressive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration scale</Label>
          <Input
            type="number"
            step={0.1}
            min={0}
            max={3}
            value={m.durationScale}
            onChange={(e) => onChange({ ...m, durationScale: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Easing</Label>
          <Input value={m.easing} onChange={(e) => onChange({ ...m, easing: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------
// Preview pane
// --------------------------------------------------------------------

function PreviewPane({ tokens }: { tokens: DesignTokens }) {
  const styles = buildTokenStyles(tokens);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>Live preview of the active tokens.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-md border border-border p-6 space-y-5"
          style={{
            ...inlineStyleFromTokenCss(styles),
            backgroundColor: tokens.palette.background,
            color: tokens.palette.foreground,
            fontFamily: `'${tokens.typography.bodyFamily}', system-ui, sans-serif`,
          }}
        >
          <div>
            <p
              className="text-xs uppercase tracking-widest opacity-70 mb-2"
              style={{ fontFamily: `'${tokens.typography.bodyFamily}', system-ui, sans-serif` }}
            >
              Hero preview
            </p>
            <h1
              className="text-4xl font-bold leading-tight"
              style={{ fontFamily: `'${tokens.typography.displayFamily}', system-ui, serif` }}
            >
              A site that looks made for you.
            </h1>
            <p className="mt-3 max-w-md opacity-80">
              Built from your brand identity — palette, typography, and rhythm
              all derived from the same tokens.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                className="px-5 py-2 font-medium text-white"
                style={{
                  backgroundColor: tokens.palette.primary,
                  borderRadius: `${tokens.radius.md}px`,
                  transitionDuration: `${Math.round(200 * tokens.motion.durationScale)}ms`,
                }}
              >
                Primary action
              </button>
              <button
                className="px-5 py-2 font-medium border"
                style={{
                  borderColor: tokens.palette.border,
                  color: tokens.palette.foreground,
                  borderRadius: `${tokens.radius.md}px`,
                }}
              >
                Secondary
              </button>
            </div>
          </div>
          <div
            className="grid grid-cols-3 gap-2 pt-4"
            style={{ borderTop: `1px solid ${tokens.palette.border}` }}
          >
            <Swatch label="Primary" color={tokens.palette.primary} radius={tokens.radius.sm} />
            <Swatch
              label="Secondary"
              color={tokens.palette.secondary ?? tokens.palette.primary}
              radius={tokens.radius.sm}
            />
            <Swatch
              label="Accent"
              color={tokens.palette.accent ?? tokens.palette.primary}
              radius={tokens.radius.sm}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Swatch({
  label,
  color,
  radius,
}: {
  label: string;
  color: string;
  radius: number;
}) {
  return (
    <div className="space-y-1">
      <div
        className="h-10 w-full border"
        style={{ backgroundColor: color, borderRadius: `${radius}px`, borderColor: "transparent" }}
      />
      <div className="text-[10px] flex items-center justify-between font-mono opacity-70">
        <span>{label}</span>
        <span>{color}</span>
      </div>
    </div>
  );
}

/**
 * Parse the CSS variable string produced by `buildTokenStyles` into an inline
 * style object, so the preview container scopes the tokens to itself instead
 * of polluting the page's :root.
 */
function inlineStyleFromTokenCss(cssText: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of cssText.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop.startsWith("--")) {
      out[prop] = value;
    }
  }
  return out;
}

export default DesignPage;
