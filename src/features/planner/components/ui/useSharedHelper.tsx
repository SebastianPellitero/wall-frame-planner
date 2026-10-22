import { useCallback, useId, useState } from "react";

type Invalid = { key: string; text: string }[];

/**
 * One helper line for the two compact fields of a landscape-rail row (design-system.md §5.2):
 * `bind(key)` goes on each CmField; `helper` renders below the pair, spanning both columns, so
 * the rail grows by one line however many fields are invalid. The line shows the field that
 * went invalid last; each field stays described by its own limits.
 */
export function useSharedHelper() {
  const baseId = useId();
  const [invalid, setInvalid] = useState<Invalid>([]);

  const report = useCallback((key: string, text: string | null) => {
    setInvalid((list) => {
      const current = list.find((i) => i.key === key);
      if (current?.text === text || (!current && text === null)) return list;
      const others = list.filter((i) => i.key !== key);
      return text === null ? others : [...others, { key, text }];
    });
  }, []);

  const bind = (key: string) => ({
    helperId: `${baseId}-${key}`,
    onInvalidChange: (text: string | null) => report(key, text),
  });

  const last = invalid.at(-1);
  const helper = last ? (
    <p data-testid="field-helper" className="col-span-2 -mt-1 text-caption whitespace-nowrap text-danger">
      {invalid.map(({ key, text }) => (
        <span key={key} id={`${baseId}-${key}`} className={key === last.key ? undefined : "sr-only"}>
          {text}
        </span>
      ))}
    </p>
  ) : null;

  return { bind, helper };
}
