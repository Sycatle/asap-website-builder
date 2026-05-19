"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { elementsAPI, type CompileSectionCodeResponse } from "@/lib/api/elements";
import type { WebsiteElement } from "@/lib/types/element";
import {
  useSectionCodeProposal,
  useSectionCodeProposalStore,
} from "@/lib/store/sectionCodeProposalStore";

interface Props {
  element: WebsiteElement;
  websiteId: string;
  /** Called after a successful compile so the parent can refresh previews. */
  onCompiled?: (response: CompileSectionCodeResponse) => void;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; response: CompileSectionCodeResponse }
  | { kind: "errors"; response: CompileSectionCodeResponse };

/**
 * Section code editor — what the studio shows in the "Code" tab.
 *
 * The user (or the AI, via the conversation handler) edits the raw JSX/TSX.
 * "Compile & save" POSTs to the codegen endpoint; on success the live
 * preview iframe reloads, and the knobs panel reflects the new schema. On
 * 422 the response carries either a single parse error or a list of
 * validator violations — each with a stable `code` we can localize later.
 */
export function SectionCodeEditor({ element, websiteId, onCompiled }: Props) {
  // The element may have `source_code` already (last successful compile) or
  // be empty (never generated). Keep a local draft until the user saves.
  const initial = element.source_code ?? "";
  const [source, setSource] = useState(initial);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const draftRef = useRef(initial);
  const lastAcceptedProposalVersion = useRef(0);
  const proposal = useSectionCodeProposal(element.id);
  const clearProposal = useSectionCodeProposalStore((s) => s.clear);

  useEffect(() => {
    // When the element id changes the parent swapped sections — reset to the
    // new element's source so we don't carry stale drafts across.
    draftRef.current = element.source_code ?? "";
    setSource(draftRef.current);
    setState({ kind: "idle" });
    lastAcceptedProposalVersion.current = 0;
  }, [element.id, element.source_code]);

  // Pull in fresh AI proposals: any new `version` overrides the textarea so
  // the user immediately sees what the AI suggested. The user can then edit
  // before clicking save, and the proposal is cleared once a compile
  // succeeds (or they switch sections).
  useEffect(() => {
    if (!proposal) return;
    if (proposal.version <= lastAcceptedProposalVersion.current) return;
    lastAcceptedProposalVersion.current = proposal.version;
    setSource(proposal.sourceCode);
    setState({ kind: "idle" });
  }, [proposal]);

  const dirty = source !== initial;
  const hasProposal = !!proposal;

  const handleSave = async () => {
    setState({ kind: "saving" });
    try {
      const response = await elementsAPI.compileCode(
        websiteId,
        element.id,
        source,
      );
      if (response.ok) {
        setState({ kind: "success", response });
        toast.success("Section compilée et sauvegardée.");
        draftRef.current = source;
        clearProposal(element.id);
        onCompiled?.(response);
      } else {
        setState({ kind: "errors", response });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Échec de la compilation. Réessayez.",
      );
      setState({ kind: "idle" });
    }
  };

  const errors = state.kind === "errors" ? state.response : null;
  const parseError = errors?.parse_error;
  const validationErrors = errors?.errors ?? [];

  const isSaving = state.kind === "saving";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Source (JSX/TSX)
        </p>
        <p className="text-xs text-muted-foreground">
          Imports limités à <code className="font-mono">react</code> et{" "}
          <code className="font-mono">@asap/site-runtime</code>. Tailwind +{" "}
          <code className="font-mono">var(--*)</code> uniquement pour le style.
        </p>
      </div>

      <Textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        rows={20}
        className="font-mono text-xs leading-relaxed resize-y min-h-[280px]"
        placeholder={`import { useVariable } from '@asap/site-runtime';\n\nexport default function Hero() {\n  return (\n    <section className="bg-background text-foreground py-24">\n      <h1 className="font-display text-5xl">Hello</h1>\n    </section>\n  );\n}`}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {hasProposal
            ? "Proposition de l'IA — revoyez et compilez"
            : dirty
            ? "Modifications non sauvegardées"
            : "À jour"}
        </div>
        <Button
          onClick={handleSave}
          disabled={(!dirty && !hasProposal) || isSaving || source.trim() === ""}
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Compilation…
            </>
          ) : (
            "Compiler & sauvegarder"
          )}
        </Button>
      </div>

      {state.kind === "success" && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">
              Compilé. Module servi à{" "}
              <code className="font-mono">/api/public/sections/{element.id}/module.js</code>.
            </p>
            <CompiledMeta response={state.response} />
          </div>
        </div>
      )}

      {parseError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">
              Erreur de parsing
            </p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-destructive/90">
              {parseError}
            </pre>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {validationErrors.length} violation
            {validationErrors.length > 1 ? "s" : ""} du contrat
          </div>
          <ul className="space-y-1 pl-5 list-disc">
            {validationErrors.map((err, idx) => (
              <li key={`${err.code}-${idx}`} className="text-destructive/90">
                <code className="font-mono text-[10px] bg-destructive/15 px-1 rounded">
                  {err.code}
                </code>{" "}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompiledMeta({ response }: { response: CompileSectionCodeResponse }) {
  const collections = response.data_bindings?.collections ?? [];
  const variables = response.data_bindings?.variables ?? [];
  const knobCount = response.knobs_schema?.knobs?.length ?? 0;

  const lines = useMemo(() => {
    const out: string[] = [];
    if (collections.length) {
      out.push(`Collections: ${collections.join(", ")}`);
    }
    if (variables.length) {
      out.push(`Variables: ${variables.join(", ")}`);
    }
    out.push(`Knobs détectés: ${knobCount}`);
    return out;
  }, [collections, variables, knobCount]);

  return (
    <ul className="mt-1 text-green-700/80 dark:text-green-300/80 space-y-0.5">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
