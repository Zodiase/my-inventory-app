/**
 * Defines the application's supported Meteor settings and typed access boundary.
 * Keep setting names here so callers do not spread untyped runtime lookups.
 */

import { Meteor } from 'meteor/meteor';

export interface MeteorSettings {
    /**
     * If true, the application will attempt to fix missing paths for tags on startup.
     */
    fixPath?: boolean;
}

export const getMeteorSetting = <T extends keyof MeteorSettings>(name: T): MeteorSettings[T] => {
    return Meteor.settings[name];
};

export const setMeteorSetting = <T extends keyof MeteorSettings>(name: T, value: MeteorSettings[T]): void => {
    (Meteor.settings as unknown as MeteorSettings)[name] = value;
};

export default Meteor.settings as unknown as MeteorSettings;
