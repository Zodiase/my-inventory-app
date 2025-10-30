/**
 * AllTagsView component module
 *
 * This module provides both presentation and container components for displaying
 * tags in a hierarchical structure with management actions.
 *
 * - AllTagsViewPresentation: Pure presentation component for Storybook
 * - AllTagsViewContainer: Container component with Meteor data fetching
 * - AllTagsView: Default export (container) for use in Meteor app
 */

export { AllTagsViewPresentation } from '/imports/ui/AllTagsView/AllTagsViewPresentation';
export type { AllTagsViewPresentationProps } from '/imports/ui/AllTagsView/AllTagsViewPresentation';

export { AllTagsViewContainer } from '/imports/ui/AllTagsView/AllTagsViewContainer';

// Default export is the container for convenience in Meteor app
export { AllTagsViewContainer as AllTagsView } from '/imports/ui/AllTagsView/AllTagsViewContainer';
