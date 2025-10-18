/**
 * @file packages Meteor.settings to be type friendly.
 */

import { Meteor } from 'meteor/meteor';

export interface MeteorSettings {
    /**
     * If true, the application will attempt to fix missing paths for tags on startup.
     */
    fixPath?: boolean;
}

export const getMeteorSetting = <T extends keyof MeteorSettings>(name: T): MeteorSettings[T] => {
    return Meteor.settings[name] as unknown as MeteorSettings[T];
};

export const setMeteorSetting = <T extends keyof MeteorSettings>(name: T, value: MeteorSettings[T]): void => {
    (Meteor.settings as unknown as MeteorSettings)[name] = value;
};

export default Meteor.settings as unknown as MeteorSettings;
