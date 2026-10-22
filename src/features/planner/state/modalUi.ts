/**
 * Which modal dialogs (the Settings sheet, a confirm dialog) are open. The keyboard shortcuts
 * read this, not only the event target: focus can fall to <body> while a dialog is still up,
 * and the frames behind it must stay out of reach. A stack, so a confirm dialog opened from the
 * Settings sheet owns the keyboard and focus until it closes (`isTop`).
 */
const stack: symbol[] = [];

export type ModalHandle = (() => void) & {
  /** True while this modal is open and nothing was opened above it. */
  isTop(): boolean;
};

/** Marks a modal as open; call the returned function once it closes. */
export function registerModal(): ModalHandle {
  const token = Symbol("modal");
  stack.push(token);
  const release = () => {
    const i = stack.indexOf(token);
    if (i !== -1) stack.splice(i, 1);
  };
  return Object.assign(release, { isTop: () => stack[stack.length - 1] === token });
}

export function isModalOpen(): boolean {
  return stack.length > 0;
}
