export type PrintablePrimitive = string | number | boolean;
export type PrintableObject = null | Date;
export type Printable = PrintablePrimitive | PrintableObject | Record<string, PrintablePrimitive | PrintableObject>;

const primitiveTypes = new Set(['string', 'number', 'boolean']);
function isPrintablePrimitive(x: unknown): x is PrintablePrimitive {
    return primitiveTypes.has(typeof x);
}

type Path = string[];

function printableRecursionHelper(path: Path, x: unknown): Array<{ path: Path; value: Printable }> {
    if (isPrintablePrimitive(x)) {
        return [
            {
                path,
                value: `[${typeof x}]${String(x)}`,
            },
        ];
    }

    if (typeof x === 'undefined') {
        return [
            {
                path,
                value: `[undefined]`,
            },
        ];
    }

    if (typeof x !== 'object') {
        return [
            {
                path,
                value: `[unrecognized primitive]${String(x)}`,
            },
        ];
    }

    if (x === null) {
        return [
            {
                path,
                value: `[null]`,
            },
        ];
    }

    if (x instanceof Date) {
        return [
            {
                path,
                value: `[date]${x.toISOString()}`
            }
        ];
    }

    // Handle arrays.
    if (Array.isArray(x)) {
        return x.reduce<Array<{ path: Path; value: Printable }>>((acc, item, index) => {
            const thisPath = [...path, String(index)];

            return [...acc, ...printableRecursionHelper(thisPath, item)];
        }, []);
    }

    // Flatten object.
    return Object.entries(x).reduce<Array<{ path: Path; value: Printable }>>((acc, [key, value]) => {
        const thisPath = [...path, key];

        return [...acc, ...printableRecursionHelper(thisPath, value)];
    }, []);
}

export function printable(x: unknown): Printable {
    const printedItems = printableRecursionHelper([], x);

    if (printedItems.length === 1 && printedItems[0].path.length === 0) {
        return printedItems[0].value;
    }

    return printedItems.reduce((acc, { path, value }) => {
        return {
            ...acc,
            [path.join('.')]: value,
        };
    }, {});
}

export default printable;
