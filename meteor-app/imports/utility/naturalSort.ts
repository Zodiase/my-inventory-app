/**
 * Natural text ordering for user-facing inventory names.
 * Centralizes numeric collation so lists and selectors agree on labels like
 * "Box 2" before "Box 10" without each component owning collator details.
 */
const naturalTextCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export const compareNaturalText = (first: string, second: string): number => {
    return naturalTextCollator.compare(first, second);
};
