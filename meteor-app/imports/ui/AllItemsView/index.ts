/**
 * AllItemsView component module
 *
 * This module provides both presentation and container components for displaying
 * inventory items in a hierarchical structure.
 *
 * - AllItemsViewPresentation: Pure presentation component for Storybook
 * - AllItemsViewContainer: Container component with Meteor data fetching
 * - AllItemsView: Default export (container) for use in Meteor app
 */

export { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
export type { AllItemsViewPresentationProps } from '/imports/ui/AllItemsView/AllItemsViewPresentation';

export { AllItemsViewContainer } from '/imports/ui/AllItemsView/AllItemsViewContainer';
export type { AllItemsViewContainerProps } from '/imports/ui/AllItemsView/AllItemsViewContainer';

// Default export is the container for convenience in Meteor app
export { AllItemsViewContainer as AllItemsView } from '/imports/ui/AllItemsView/AllItemsViewContainer';
