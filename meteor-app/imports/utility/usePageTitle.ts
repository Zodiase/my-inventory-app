import { useEffect } from 'react';

/**
 * Hook to set the document title for the current page.
 *
 * @param title - The page title to set
 *
 * @example
 * ```tsx
 * const MyView = () => {
 *   usePageTitle('My View - My Inventory');
 *   return <div>...</div>;
 * };
 * ```
 */
export const usePageTitle = (title: string): void => {
    useEffect(() => {
        document.title = title;
    }, [title]);
};
