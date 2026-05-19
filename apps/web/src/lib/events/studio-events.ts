/**
 * Thin event bus for one-shot studio commands like "AI just proposed code
 * for section X — select it and open the Code tab".
 *
 * A custom DOM event sidesteps the need to hoist `selectedElementId` /
 * `activeTab` into a shared store. The studio shell listens and updates
 * its own React state; senders don't need to know who handles the event.
 *
 * Why not a context? The proposal lands in a hook that runs deep inside
 * the AI chat tree, far from the studio shell — a tree-wide context would
 * require restructuring the provider hierarchy. Custom events stay simple
 * and don't leak across tabs (events are window-scoped).
 */

const EVENT_TYPE = "asap:studio";

type AsapStudioEvent =
  | { kind: "select-section"; sectionId: string; tab?: "content" | "code" };

const targetForTests: EventTarget | undefined =
  typeof window !== "undefined" ? window : undefined;

export function emitStudioEvent(detail: AsapStudioEvent): void {
  if (!targetForTests) return;
  targetForTests.dispatchEvent(new CustomEvent<AsapStudioEvent>(EVENT_TYPE, { detail }));
}

export function onStudioEvent(
  handler: (event: AsapStudioEvent) => void,
): () => void {
  if (!targetForTests) return () => undefined;
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<AsapStudioEvent>).detail;
    if (detail) handler(detail);
  };
  targetForTests.addEventListener(EVENT_TYPE, listener);
  return () => targetForTests.removeEventListener(EVENT_TYPE, listener);
}
