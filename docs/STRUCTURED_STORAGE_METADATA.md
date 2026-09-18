# Structured storage metadata

This document owns the inventory app’s design for physical-layout metadata on
structured storage fixtures. It is intentionally separate from the household
project record: Home Automation records household context and user intent;
this repository records the reusable application model and its rationale.

## Design principles

- Ordinary containment remains authoritative. A stack still contains its child
  containers through the normal `containerId` relationship.
- Physical layout is orthogonal metadata. A stack can reference a reusable,
  versioned layout model, while a child records its tier and position.
- Metadata must support non-visual consumers first: lookup, conversational
  answers, and placement recommendations must not depend on a renderer.
- Visualization is a later consumer. It may load the model and placements, but
  it must not become a second source of truth for membership or identity.
- Do not infer unobserved positions. Unknown tiers and slots remain unknown
  until a user or reliable observation establishes them.

## Initial model

The first supported model is `stack-tower-2col-5tier-v1`:

- five tiers
- two positions per tier: `left` and `right`
- one reusable model reference on the structured stack
- one placement record on each positioned child container

The bedside bathroom stack is the first user story: its two photographed bins
are intended to occupy the top tier, left and right. The app should record that
placement only as the user confirms which photographed bin is on each side.

## Deferred work

The web renderer, empty-slot display, visualization editor, and drag-and-drop
placement UI are intentionally separate work. They consume this metadata after
the model and query semantics are stable. Beads feature `bd-2b3` tracks that
future visualization work and depends on metadata foundation `bd-97m`.
