/**
 * Measures and applies text-only enlargement to the scanner proof, including
 * controls whose component styles use fixed font sizes. This test-only override
 * leaves product styles and browser zoom unchanged and records computed evidence.
 */
import type { FrameLocator } from '@playwright/test';
export async function scaleScannerProof(frame: FrameLocator, scale: number) {
    return frame.locator('main').evaluate((main, factor) => {
        const nodes = [main, ...main.querySelectorAll<HTMLElement>('*')];
        const baseline = nodes.map((node) => ({ node, before: parseFloat(getComputedStyle(node).fontSize) }));
        const controlRules = ['button', 'input', 'select'].map((selector) => {
            const node = main.querySelector(selector);
            const size = node === null ? 16 : parseFloat(getComputedStyle(node).fontSize);
            return `main[data-proof-text-scale] ${selector} { font-size: ${size * factor}px !important; }`;
        });
        main.setAttribute('data-proof-text-scale', String(factor));
        const controlStyle = document.createElement('style');
        controlStyle.textContent = controlRules.join('\n');
        document.head.appendChild(controlStyle);
        if (factor !== 1) {
            for (const { node, before } of baseline)
                node.style.setProperty('font-size', `${before * factor}px`, 'important');
        }
        return baseline.map(({ node, before }) => ({
            tag: node.tagName,
            text: node.textContent?.slice(0, 80),
            before,
            after: parseFloat(getComputedStyle(node).fontSize),
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
        }));
    }, scale);
}
