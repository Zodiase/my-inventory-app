/**
 * Item validation constants shared between UI and API layers.
 *
 * Placed in the model layer so UI components can import them without
 * pulling in server-side Meteor dependencies (e.g. meteor/meteor, meteor/mongo)
 * that break Storybook's webpack build.
 */

/** Maximum allowed length for an item name. */
export const MAX_ITEM_NAME_LENGTH = 500;

/** Maximum allowed length for an item description. */
export const MAX_ITEM_DESCRIPTION_LENGTH = 5000;
