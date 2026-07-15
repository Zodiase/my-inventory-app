import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('SettingsDataViewPresentation (Storybook)', () => {
    test('discloses that data exports do not contain attachment files', async ({ page }) => {
        await gotoStory(page, 'ui-settingsdataviewpresentation', 'idle');

        const attachmentDisclosure = page.getByRole('note', { name: 'Attachment export limitation' });
        await expect(attachmentDisclosure).toContainText('JSON and CSV exports do not include attachment files.');
        await expect(attachmentDisclosure).toContainText('but not attachments.');
    });
});
