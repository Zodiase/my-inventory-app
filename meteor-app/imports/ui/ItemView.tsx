import { Box, Button, NameValueList, NameValuePair, TextInput } from 'grommet';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import React, { type ReactElement, type ComponentProps, useMemo, useState, type ChangeEventHandler } from 'react';

import type InventoryItem from '/imports/model/InventoryItem';

import Toolbar, { Spacer } from './Toolbar';

/**
 * Map property type names to their data types.
 */
interface PropertyTypeByName {
    text: string;
    date: Date;
}
/**
 * The collection of all property type names.
 */
type PropertyTypeNames = keyof PropertyTypeByName;

/**
 * Specify which of the default props are editable, and if so, has what type of data.
 */
const editableDefaultProps: { [propName in keyof InventoryItem]?: PropertyTypeNames } = {
    name: 'text',
};

/**
 * For each of supported property type, we need a set of renderers for different scenarios.
 */
interface RendererSet<T extends PropertyTypeNames> {
    view: (name: string, value: PropertyTypeByName[T]) => string | ReactElement;
    edit: (
        name: string,
        value: PropertyTypeByName[T],
        onChange: ChangeEventHandler<HTMLInputElement>
    ) => string | ReactElement;
}
const renderersByPropertyType: {
    [T in PropertyTypeNames]: RendererSet<T>;
} = {
    text: {
        view: (_name: string, value: string) => value,
        edit: (name: string, value: string, onChange: ChangeEventHandler<HTMLInputElement>) => (
            <TextInput placeholder={name} value={value} onChange={onChange} />
        ),
    },
    date: {
        view: (_name: string, value: Date) => value.toLocaleString(),
        edit: (name: string, value: Date, onChange: ChangeEventHandler<HTMLInputElement>) => (
            <TextInput placeholder={name} value={value.toLocaleString()} onChange={onChange} />
        ),
    },
};

/**
 * For a particular property of an item, the type of the value must match the type name.
 */
interface ItemProp<T extends PropertyTypeNames> {
    name: string;
    type: T;
    value: PropertyTypeByName[T];
}
/**
 * All possible kinds of types of item properties.
 */
type ItemProps = Array<
    {
        [K in PropertyTypeNames]: ItemProp<K>;
    }[PropertyTypeNames]
>;

interface ItemReadViewProps {
    itemProps: ItemProps;
    onEnterEdit: () => void;
}

const ItemReadView = ({
    itemProps,
    onEnterEdit,
    ...rootElementProps
}: ItemReadViewProps & ComponentProps<typeof Box>): ReactElement => {
    return (
        <Box pad="small" {...rootElementProps}>
            <Toolbar
                flex={{
                    grow: 0,
                    shrink: 0,
                }}
            >
                <Spacer />
                <Button
                    secondary={true}
                    label="Edit"
                    onClick={() => {
                        onEnterEdit();
                    }}
                />
            </Toolbar>
            <NameValueList nameProps={{ align: 'end' }} valueProps={{ width: 'auto' }}>
                {itemProps.map(({ name, type, value }) => {
                    const renderer = (renderersByPropertyType[type] as RendererSet<typeof type>).view;

                    return (
                        <NameValuePair key={name} name={name}>
                            {renderer(name, value)}
                        </NameValuePair>
                    );
                })}
            </NameValueList>
        </Box>
    );
};

interface ItemEditViewProps {
    itemProps: ItemProps;
    onSaveEdit: (newItemProps: Record<string, PropertyTypeByName[PropertyTypeNames]>) => void;
    onCancelEdit: () => void;
}

const ItemEditView = ({
    itemProps,
    onSaveEdit,
    onCancelEdit,
    ...rootElementProps
}: ItemEditViewProps & ComponentProps<typeof Box>): ReactElement => {
    const [itemPropValues, setItemPropValues] = useState(() => {
        return itemProps.reduce<Record<string, PropertyTypeByName[PropertyTypeNames]>>(
            (acc, { name, value }) => ({ ...acc, [name]: value }),
            {}
        );
    });
    const isDirty = () => itemProps.some(({ name, value }) => !isEqual(value, itemPropValues[name]));

    const onClickCancelButton = (): void => {
        if (isDirty()) {
            if (!window.confirm('Discard your changes?')) {
                return;
            }
        }

        onCancelEdit();
    };

    const onClickSaveButton = (): void => {
        if (!isDirty()) {
            onCancelEdit();
        } else {
            onSaveEdit(itemPropValues);
        }
    };

    return (
        <Box pad="small" {...rootElementProps}>
            <Toolbar
                flex={{
                    grow: 0,
                    shrink: 0,
                }}
            >
                <Spacer />
                <Button secondary={true} label="Cancel" onClick={onClickCancelButton} />
                <Button secondary={true} label="Save" onClick={onClickSaveButton} />
            </Toolbar>
            <NameValueList nameProps={{ align: 'end' }} valueProps={{ width: 'auto' }}>
                {itemProps.map(({ name, type }: ItemProp<PropertyTypeNames>) => {
                    const renderer = (renderersByPropertyType[type] as RendererSet<typeof type>).edit;
                    const editorValue = itemPropValues[name];
                    const onChangeValue: ChangeEventHandler<HTMLInputElement> = (event) => {
                        const propName = name;
                        const newValue = event.target.value;
                        console.log(`new ${propName}`, newValue);
                        setItemPropValues((values) => {
                            return {
                                ...values,
                                [propName]: newValue,
                            };
                        });
                    };

                    return (
                        <NameValuePair key={name} name={name}>
                            {renderer(name, editorValue, onChangeValue)}
                        </NameValuePair>
                    );
                })}
            </NameValueList>
        </Box>
    );
};

interface ItemViewProps {
    item: null | InventoryItem;
    onUpdateItem: (newItem: InventoryItem) => Promise<void>;
}

const ItemView = ({
    item,
    onUpdateItem,
    ...rootElementProps
}: ItemViewProps & ComponentProps<typeof Box>): ReactElement => {
    const [inEditMode, setInEditMode] = useState(() => false);

    const props = useMemo((): ItemProps => {
        if (item === null) {
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
                    value,
                };
            });
    }, [item]);

    if (item === null) {
        return <Box {...rootElementProps}></Box>;
    }

    if (inEditMode) {
        return (
            <ItemEditView
                {...rootElementProps}
                itemProps={props}
                onSaveEdit={(newItemProps) => {
                    console.log('newItemProps', newItemProps);

                    const newItem = Object.entries(newItemProps).reduce((acc, [name, value]) => {
                        if (name in editableDefaultProps) {
                            const nameTyped = name as keyof typeof editableDefaultProps;
                            acc[nameTyped] = value as any;
                        } else {
                            // TODO: update custom parameters.
                        }

                        return acc;
                    }, cloneDeep(item));

                    onUpdateItem(newItem).then(
                        () => {
                            console.log('Saving successful');
                            setInEditMode(false);
                        },
                        (reason) => {
                            console.error('Saving failed:', reason);
                            setInEditMode(true);
                            window.alert(`Save failed: ${String(reason)}`);
                        }
                    );
                }}
                onCancelEdit={() => {
                    setInEditMode(false);
                }}
            />
        );
    } else {
        return (
            <ItemReadView
                {...rootElementProps}
                itemProps={props}
                onEnterEdit={() => {
                    setInEditMode(true);
                }}
            />
        );
    }
};

export default ItemView;
