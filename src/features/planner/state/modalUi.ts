/**
 * Whether a modal dialog (the Settings sheet) is open. The keyboard shortcuts read this, not
 * only the event target: focus can fall to <body> while the sheet is still up, and the frames
 * behind it must stay out of reach. A count, so nested or overlapping dialogs stay correct.
 */
let open = 0;

/** Marks a modal as open; call the returned function once it closes. */
export function registerModal(): () => void {
  open += 1;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    open -= 1;
  };
}

export function isModalOpen(): boolean {
  return open > 0;
}
