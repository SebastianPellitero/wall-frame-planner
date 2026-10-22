import { useAnnouncer } from "../../state/announcer";

/**
 * The hidden `aria-live="polite"` region (§7, §8 "Live region") that speaks `announce()`:
 * "Frame added", "Frame deleted", "Frame duplicated" and "Ready: …" after Generate. Mounted
 * once; the text node is keyed by the call, so a repeated message is a new node and is read again.
 */
export function Announcer() {
  const { text, id } = useAnnouncer();
  return (
    <div data-testid="announcer" role="status" aria-live="polite" className="sr-only">
      {text && <span key={id}>{text}</span>}
    </div>
  );
}
