# Composed scanner QR semantic test contract

Test-only candidate based on frozen PR1826055b0cd4bf6473507b2d138870e39bd7e016fef,
not the183–186 diagnostics. Product/app/components/dependencies unchanged; live182
preview source/head preserved. No household writes, physical trial or deployment.

The existing rendered test compared decoded pixels against the same image's
payload attribute. Both could agree on a wrong action/identity. The revised test
has independent literal expectations for eight card labels/payloads, exact complete
card-heading/image counts, one image per label and rendered pixel decoding plus
attribute association against those literals. No production constants are imported
as expected values. Existing destination-first/no-op/product rejection/cancellation/
Pause/manual-editing interactions, four-viewport/two-text-scale geometry, input
visibility, no horizontal overflow and corner-white checks remain.

Affected Chromium Storybook suite:10/10 passed28.5s, workers1/retries0, full existing
manager at48438. Four1280×720/820×900/390×844/390×480 viewports, normal/125% text.
Product tree byte-identical to182; test branch runs tests against that unchanged
preview, not a new product build.32 focused scanner Node tests pass512.7ms; targeted
prepared test TypeScript and formatting pass. No App/backend E2E needed or run for
this test-only change. No design or physical hardware acceptance claimed.

Targeted opt-in negative case changes Move image src to the existing valid Inspect
QR and changes its data-payload to the same Inspect command. Rendered decode proves
Inspect; original pixels==attribute oracle explicitly passes. The same literal
semantic assertion used by the normal matrix then fails at line46 with:
Expected inventory-action:v1:move-demo / received inventory-action:v1:inspect-demo.
This is a genuine expected semantic failure, not a navigation/decode/setup failure.
One negative case run, no retries; screenshot/video/trace and raw log retained.
Normal CI skips this deliberate-failure case unless SCANNER_QR_NEGATIVE_CONTROL=1;
run it separately with grep 'negative control'. The normal semantic matrix always
runs. Negative DOM mutation is limited to that browser document; preview source and
other sessions are unchanged.

This closes the composed-eight-card semantic oracle gap identified in independent
182 review. It does not broaden scanner product/quantity behavior, close GuardRails
or existing Chromium loading gates, substitute for full quiet-zone generator checks,
or prove physical scanning. Independent exact-head test/source review is next;
coordinator continues182 manual design review separately.
