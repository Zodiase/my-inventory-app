/**
 * Simple screenshot script for Storybook pages
 * Usage: node screenshot.js <url> <output-filename> [delay-ms]
 *
 * Arguments:
 *   url         - URL to screenshot (localhost only)
 *                 For Storybook stories, converts /story/ URLs to /iframe.html automatically
 *   output      - Output filename (default: screenshot.png)
 *   delay-ms    - Delay in milliseconds before taking screenshot (default: 1000)
 *
 * Security: Only allows localhost URLs for safety
 *
 * Migrated from Puppeteer to Playwright for better reliability and modern web app support.
 */

const { chromium } = require('playwright');

/**
 * Convert Storybook story URL to iframe URL for direct rendering
 * Example: ?path=/story/ui-button--primary -> /iframe.html?viewMode=story&id=ui-button--primary
 */
function convertToIframeUrl(url) {
    try {
        const parsed = new URL(url);
        const path = parsed.searchParams.get('path');

        if (path && path.startsWith('/story/')) {
            // Extract story ID from path
            const storyId = path.replace('/story/', '');
            // Create iframe URL
            parsed.pathname = '/iframe.html';
            parsed.search = `?viewMode=story&id=${storyId}`;
            return parsed.toString();
        }

        return url;
    } catch {
        return url;
    }
}

function validateLocalhostUrl(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        // Only allow localhost, 127.0.0.1, or [::1] (IPv6 localhost)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
            throw new Error(`Security: Only localhost URLs are allowed. Got: ${hostname}`);
        }

        return true;
    } catch (err) {
        if (err.message.startsWith('Security:')) {
            throw err;
        }
        throw new Error(`Invalid URL: ${url}`);
    }
}

async function takeScreenshot(url, outputPath, delayMs = 1000) {
    // Validate URL before proceeding
    validateLocalhostUrl(url);

    // Convert Storybook story URLs to iframe URLs for direct rendering
    const targetUrl = convertToIframeUrl(url);
    if (targetUrl !== url) {
        console.log(`Converting to iframe URL: ${targetUrl}`);
    }

    const browser = await chromium.launch({
        headless: true,
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for Storybook to render the story (try multiple possible root selectors)
    console.log('Waiting for Storybook story to render...');
    try {
        await page.waitForSelector('#storybook-root, #root', { timeout: 10000 });
    } catch (err) {
        console.log('Warning: Could not find Storybook root, continuing anyway...');
    }

    // Wait for animations to settle
    if (delayMs > 0) {
        console.log(`Waiting ${delayMs}ms for animations to settle...`);
        await page.waitForTimeout(delayMs);
    }

    console.log(`Taking screenshot...`);
    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();
    console.log(`Screenshot saved to ${outputPath}`);
}

const url = process.argv[2] || 'http://localhost:6006';
const output = process.argv[3] || 'screenshot.png';
const delayMs = process.argv[4] ? parseInt(process.argv[4], 10) : 1000;

if (isNaN(delayMs) || delayMs < 0) {
    console.error('Error: delay-ms must be a non-negative number');
    process.exit(1);
}

takeScreenshot(url, output, delayMs).catch((err) => {
    console.error('Error taking screenshot:', err);
    process.exit(1);
});
