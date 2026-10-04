# Independent-review repairs

The original candidate870156d was returned, not accepted. Independent review
passed9 app and36 Storybook checks but found a native-link contract gap and32px
neighboring header controls, also reproduced by PR touch gates.

Container details now has a native exact-record href. Unmodified primary
activation captures same-tab return context; modified/non-primary activation
is not prevented. Return focus accepts an anchor. Filter/Create header controls
have explicit44px minimum hit dimensions and do not shrink.

After repair:22/22 own-details and existing touch checks pass on iPad/iPhone;
36/36 composed matrix passes with new href and all-header44px assertions.
Type/style passed with the one existing deprecation warning. A first strengthened
matrix run used the wrong exact Create accessible name (the icon adds Add);
that diagnostic was corrected and the full rerun passed.

Owner manually exercised full-manager repaired own-details/return at1280x720
and390x480. Fresh-tab viewport readback confirmed390x480; earlier existing-tab
viewport calls did not resize, so those calls were not counted as phone review.
Phone proof:repaired-phone.jpg. Final independent four-size review remains due.
The earlier contact sheets document the original candidate, not these repairs.

DeepContainerPath's centered existing story clips on phone; its story and
breadcrumb code are unchanged frombase6e60f04. No speculative production repair
was made. Independent baseline comparison uses a git archive of the exact base
at /private/tmp/bd-w1k-base-storybook, Storybook LANport48381. Pending
classification is separate from the confirmed link/touch repairs.

No production deployment, household writes or merge. Independent verifier owns
baseline comparison; source owns shipping decision after revised-head review/CI.
