import { resolve } from 'node:path';

import { test } from '@playwright/test';
import { proveInitialFailureRetention } from '../helpers/loading-boundary-retention.mjs';

test('initial failure retains its native trace and redacted metadata; passing traces are discarded', async () => {
    test.setTimeout(60000);
    await proveInitialFailureRetention(resolve(__dirname, '../../..'));
});
