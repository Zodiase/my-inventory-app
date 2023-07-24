import { Button, Card, CardBody, CardFooter, CardHeader, NameValueList, NameValuePair, TextInput } from 'grommet';
import React, { type ComponentProps, type ReactElement } from 'react';

import { useItemsController } from './ItemsViewController';
import { Spacer } from './Toolbar';

const CreateNewItemView = ({ ...rootElementProps }: ComponentProps<typeof Card>): ReactElement => {
    const { setInCreateMode } = useItemsController();

    // const [itemPropValues, setItemPropValues] = useState(() => {
    //     return itemProps.reduce<Record<string, PropertyTypeByName[PropertyTypeNames]>>(
    //         (acc, { name, value }) => ({ ...acc, [name]: value }),
    //         {}
    //     );
    // });
    // const isDirty = (): boolean => itemProps.some(({ name, value }) => !isEqual(value, itemPropValues[name]));

    // const onClickCancelButton = (): void => {
    //     if (isDirty()) {
    //         if (!window.confirm('Discard your changes?')) {
    //             return;
    //         }
    //     }

    //     onCancelEdit();
    // };

    // const onClickSaveButton = (): void => {
    //     if (!isDirty()) {
    //         onCancelEdit();
    //     } else {
    //         onSaveEdit(itemPropValues);
    //     }
    // };

    return (
        <Card pad="small" gap="medium" {...rootElementProps}>
            <CardHeader>
                <Spacer />
                <Button
                    secondary={true}
                    label="Cancel"
                    onClick={() => {
                        setInCreateMode(false);
                    }}
                />
            </CardHeader>
            <CardBody>
                <NameValueList
                    pairProps={{ direction: 'column' }}
                    nameProps={{ align: 'start' }}
                    valueProps={{ width: 'auto' }}
                >
                    <NameValuePair name="Name">
                        <TextInput placeholder="Name" value="" />
                    </NameValuePair>
                    {/* {itemProps.map(({ name, type }: ItemProp<PropertyTypeNames>) => {
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
                })} */}
                </NameValueList>
            </CardBody>
            <CardFooter>
                <Spacer />
                <Button secondary={true} label="Save" />
            </CardFooter>
        </Card>
    );
};

export default CreateNewItemView;
