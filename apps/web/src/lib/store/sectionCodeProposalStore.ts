import { create } from 'zustand';

/**
 * Per-section code proposals coming from the AI. When the orchestrator
 * streams `AIAction { type: "PROPOSE_SECTION_CODE", section_id, source_code }`,
 * the conversation handler drops the payload here. The Code tab in the
 * properties panel reads it and pre-fills the editor textarea — the user
 * still has to click "Compile & sauvegarder" for anything to persist.
 *
 * Keying by section id rather than a flat list keeps the UX predictable:
 * if the AI re-proposes for the same section, the previous proposal is
 * superseded; switching sections instantly shows that section's latest
 * proposal (if any) without timeline ambiguity.
 */
export interface SectionCodeProposal {
  sectionId: string;
  sourceCode: string;
  /** Monotonically increasing per (section_id) — lets editors detect "new" vs "same" proposals. */
  version: number;
  /** Server-sent epoch ms; used for sorting in tooling, not for invalidation. */
  receivedAt: number;
}

interface State {
  bySectionId: Record<string, SectionCodeProposal>;
  // Bumped on every accept/clear so subscribers using `useShallow` re-render.
  generation: number;
}

interface Actions {
  /** Called by the AI stream handler when a PROPOSE_SECTION_CODE arrives. */
  propose(sectionId: string, sourceCode: string): SectionCodeProposal;
  /** Called by the Code editor after the user accepts (compile succeeded). */
  clear(sectionId: string): void;
  /** Read-only fetch — does not subscribe. */
  peek(sectionId: string): SectionCodeProposal | undefined;
}

export const useSectionCodeProposalStore = create<State & Actions>()((set, get) => ({
  bySectionId: {},
  generation: 0,

  propose(sectionId, sourceCode) {
    const existing = get().bySectionId[sectionId];
    const proposal: SectionCodeProposal = {
      sectionId,
      sourceCode,
      version: (existing?.version ?? 0) + 1,
      receivedAt: Date.now(),
    };
    set((s) => ({
      bySectionId: { ...s.bySectionId, [sectionId]: proposal },
      generation: s.generation + 1,
    }));
    return proposal;
  },

  clear(sectionId) {
    set((s) => {
      if (!s.bySectionId[sectionId]) return s;
      const next = { ...s.bySectionId };
      delete next[sectionId];
      return { bySectionId: next, generation: s.generation + 1 };
    });
  },

  peek(sectionId) {
    return get().bySectionId[sectionId];
  },
}));

export function useSectionCodeProposal(
  sectionId: string | null | undefined,
): SectionCodeProposal | undefined {
  return useSectionCodeProposalStore((s) =>
    sectionId ? s.bySectionId[sectionId] : undefined,
  );
}
