import React, { ReactElement, useState } from 'react';

export const Hello = (): ReactElement => {
    const [counter, setCounter] = useState(0);

    const increment = (): void => {
        setCounter(counter + 1);
    };

    return (
        <div>
            <button onClick={increment}>Click Me</button>
            <p>You&apos;ve pressed the button {counter} times.</p>
        </div>
    );
};
