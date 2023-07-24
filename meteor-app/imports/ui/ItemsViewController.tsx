import cloneDeep from 'lodash/cloneDeep';
import { useTracker } from 'meteor/react-meteor-data';
import React, { type ReactElement, createContext, useContext, useState } from 'react';

import InventoryItemsCollection, { type InventoryItem } from '/imports/api/items';
import NotImplementedError from '/imports/model/NotImplementedError';
import type AnyAny from '/imports/utility/AnyAny';
import NoOp from '/imports/utility/NoOp';

/**
 * Map property type names to their data types.
 */
export interface PropertyTypeByName {
    text: string;
    date: Date;
}
/**
 * The collection of all property type names.
 */
export type PropertyTypeNames = keyof PropertyTypeByName;
/**
 * Specify which of the default props are editable, and if so, has what type of data.
 */
const editableDefaultProps: { [propName in keyof InventoryItem]?: PropertyTypeNames } = {
    name: 'text',
};
/**
 * For a particular property of an item, the type of the value must match the type name.
 */
export interface ItemProp<T extends PropertyTypeNames> {
    name: string;
    type: T;
    editable: boolean;
    value: PropertyTypeByName[T];
}
/**
 * All possible kinds of types of item properties.
 */
export type ItemProps = Array<
    {
        [K in PropertyTypeNames]: ItemProp<K>;
    }[PropertyTypeNames]
>;

interface ItemsController {
    items: InventoryItem[];
    selectedItem: undefined | InventoryItem;
    setSelectedItem: (item: InventoryItem) => void;
    getPropertiesOfItem: (item: undefined | InventoryItem) => ItemProps;
    updateItem: (
        item: InventoryItem,
        newProps: Record<string, PropertyTypeByName[PropertyTypeNames]>
    ) => Promise<InventoryItem>;
    deleteItem: (item: InventoryItem) => Promise<number>;
    inEditMode: boolean;
    setInEditMode: (inEditMode: boolean) => void;
    inCreateMode: boolean;
    setInCreateMode: (inCreateMode: boolean) => void;
}

const defaultItemsController: ItemsController = {
    items: [],
    selectedItem: undefined,
    setSelectedItem: NoOp,
    getPropertiesOfItem: () => [],
    updateItem: async (item) => item,
    deleteItem: async () => 0,
    inEditMode: false,
    setInEditMode: NoOp,
    inCreateMode: false,
    setInCreateMode: NoOp,
};

const ItemsControllerReactContext = createContext<ItemsController>(defaultItemsController);

export const useNewItemsController = (): ItemsController => {
    const items = useTracker(
        () =>
            InventoryItemsCollection.find(
                {
                    //!
                },
                {
                    sort: [
                        ['name', 'asc'],
                        ['createdAt', 'asc'],
                    ],
                }
            ).fetch(),
        []
    );
    const [selectedItem, setSelectedItem] = useState<undefined | InventoryItem>();
    const [inEditMode, setInEditMode] = useState(() => false);
    const [inCreateMode, setInCreateMode] = useState(() => false);

    const getPropertiesOfItem = (item: undefined | InventoryItem): ItemProps => {
        if (typeof item === 'undefined') {
            return [];
        }

        return Object.entries(item)
            .filter(([name]) => name in editableDefaultProps)
            .map(([name, value]) => {
                const nameTyped = name as keyof typeof editableDefaultProps;
                const type = editableDefaultProps[nameTyped] as PropertyTypeNames;

                return {
                    name,
                    type,
                    editable: true,
                    value,
                };
            });
    };

    const getNewItemWithUpdatedProperties = (
        item: InventoryItem,
        props: Record<string, PropertyTypeByName[PropertyTypeNames]>
    ): InventoryItem => {
        return Object.entries(props).reduce((acc, [name, value]) => {
            if (name in editableDefaultProps) {
                const nameTyped = name as keyof typeof editableDefaultProps;
                acc[nameTyped] = value as AnyAny;
            } else {
                // TODO: update custom parameters.
            }

            return acc;
        }, cloneDeep(item));
    };

    const updateItem = async (
        _item: InventoryItem,
        _newProps: Record<string, PropertyTypeByName[PropertyTypeNames]>
    ): Promise<InventoryItem> => {
        // TODO: execute update.
        throw new NotImplementedError();

        // const newItem = getNewItemWithUpdatedProperties(item, newProps);
        // return newItem;
    };

    const deleteItem = async (_item: InventoryItem): Promise<number> => {
        // TODO: execute deletion.
        throw new NotImplementedError();

        // return 0;
    };

    return {
        items,
        selectedItem,
        setSelectedItem,
        getPropertiesOfItem,
        updateItem,
        deleteItem,
        inEditMode,
        setInEditMode,
        inCreateMode,
        setInCreateMode,
    };
};

interface ItemsProviderProps {
    itemsController: ItemsController;
    children: ReactElement;
}

export const ItemsControllerProvider = ({ itemsController, children }: ItemsProviderProps): ReactElement => {
    return (
        <ItemsControllerReactContext.Provider value={itemsController}>{children}</ItemsControllerReactContext.Provider>
    );
};

export const useItemsController = (): ItemsController => {
    return useContext(ItemsControllerReactContext);
};
