import { Box, Button, NameValueList, NameValuePair, TextInput } from 'grommet';
import isEqual from 'lodash/isEqual';
import React, { type ReactElement, type ComponentProps, useState, type ChangeEventHandler } from 'react';

import {
    type ItemProp,
    type ItemProps,
    type PropertyTypeByName,
    type PropertyTypeNames,
    useItemsController,
} from './ItemsViewController';
import Toolbar, { Spacer } from './Toolbar';

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

interface ItemReadViewProps {
    itemId: string;
    itemProps: ItemProps;
    onEnterEdit: () => void;
    onDeleteItem: (itemId: string) => void;
}

const ItemReadView = ({
    itemId,
    itemProps,
    onEnterEdit,
    onDeleteItem,
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
                <Button
                    secondary={true}
                    label="Delete"
                    onClick={() => {
                        if (!window.confirm('Delete this item?')) {
                            return;
                        }

                        onDeleteItem(itemId);
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
    const isDirty = (): boolean => itemProps.some(({ name, value }) => !isEqual(value, itemPropValues[name]));

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
    //!
}

const ItemView = ({ ...rootElementProps }: ItemViewProps & ComponentProps<typeof Box>): ReactElement => {
    const { selectedItem, getPropertiesOfItem, updateItem, deleteItem, inEditMode, setInEditMode } =
        useItemsController();
    const itemProperties = getPropertiesOfItem(selectedItem);

    if (typeof selectedItem === 'undefined') {
        return <Box {...rootElementProps}></Box>;
    }

    if (inEditMode) {
        return (
            <ItemEditView
                {...rootElementProps}
                itemProps={itemProperties}
                onSaveEdit={(newItemProps) => {
                    console.log('newItemProps', newItemProps);

                    updateItem(selectedItem, newItemProps).then(
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
                itemId={selectedItem._id}
                itemProps={itemProperties}
                onEnterEdit={() => {
                    setInEditMode(true);
                }}
                onDeleteItem={(itemId) => {
                    if (itemId === selectedItem._id) {
                        deleteItem(selectedItem).then(
                            () => {
                                console.log('Deletion successful');
                            },
                            (reason) => {
                                console.error('Deletion failed:', reason);
                                window.alert(`Deletion failed: ${String(reason)}`);
                            }
                        );
                    } else {
                        console.warn('Unexpected error. Item ID mis-match.');
                    }
                }}
            />
        );
    }
};

export default ItemView;
