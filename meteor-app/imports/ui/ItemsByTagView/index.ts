/**
 * ItemsByTagView component module
 *
 * This module provides both presentation and container components for displaying
 * items filtered by a selected tag.
 *
 * - ItemsByTagViewPresentation: Pure presentation component for Storybook
 * - ItemsByTagViewContainer: Container component with Meteor data fetching
 * - ItemsByTagView: Default export (container) for use in Meteor app
 */

export { ItemsByTagViewPresentation } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';
export type { ItemsByTagViewPresentationProps } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';

export { ItemsByTagViewContainer } from '/imports/ui/ItemsByTagView/ItemsByTagViewContainer';

// Default export is the container for convenience in Meteor app
export { ItemsByTagViewContainer as ItemsByTagView } from '/imports/ui/ItemsByTagView/ItemsByTagViewContainer';
