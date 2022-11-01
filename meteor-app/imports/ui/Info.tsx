import { useTracker } from 'meteor/react-meteor-data';
import React, { ReactElement } from 'react';

import { LinksCollection, Link } from '../api/links';

export const Info = (): ReactElement => {
    const links = useTracker(() => LinksCollection.find().fetch());

    const makeLink = (link: Link): ReactElement => (
        <li key={link._id}>
            <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
            </a>
        </li>
    );

    return (
        <div>
            <h2>Learn Meteor!</h2>
            <ul>{links.map(makeLink)}</ul>
        </div>
    );
};
