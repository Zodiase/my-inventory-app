/**
 * Adds manager-only guidance for understanding the currently selected story.
 * The panel deliberately lives outside the preview iframe so explanatory copy
 * cannot affect component layout, screenshots, interaction tests, or measurements.
 */
import React from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { addons, types, useParameter, useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

const ADDON_ID = 'inventory/story-introduction';
const PANEL_ID = `${ADDON_ID}/panel`;
const PARAMETER_KEY = 'introduction';

const PanelContent = styled.div`
    max-width: 760px;
    padding: 20px 24px;
    color: ${({ theme }) => theme.color.defaultText};
    font-size: 14px;
    line-height: 1.55;
`;

const Heading = styled.h2`
    margin: 0 0 8px;
    font-size: 16px;
`;

const Copy = styled.p`
    margin: 0;
    white-space: pre-wrap;
`;

const StoryIntroduction = ({ active }: { active?: boolean }): React.ReactElement => {
    const api = useStorybookApi();
    const { storyId } = useStorybookState();
    const explicitIntroduction = useParameter<string | undefined>(PARAMETER_KEY, undefined);
    const docs = useParameter<{ description?: { story?: string } } | undefined>('docs', undefined);
    const story = storyId === undefined ? undefined : api.getData(storyId);
    const componentName = story?.title?.split('/').at(-1) ?? 'component';
    const storyName = story?.name ?? 'selected';
    const generatedIntroduction = `What to expect: ${componentName} rendered in its “${storyName}” scenario. The canvas should visibly match that scenario name; use it as the baseline when exercising controls, interactions, responsive layouts, and regression checks.`;
    const introduction = explicitIntroduction ?? docs?.description?.story ?? generatedIntroduction;

    return (
        <AddonPanel active={Boolean(active)} hasScrollbar>
            <PanelContent>
                <Heading>What to expect</Heading>
                <Copy>{introduction}</Copy>
            </PanelContent>
        </AddonPanel>
    );
};

addons.register(ADDON_ID, () => {
    addons.add(PANEL_ID, {
        title: 'Introduction',
        type: types.PANEL,
        match: ({ viewMode }) => viewMode === 'story',
        render: ({ active }) => <StoryIntroduction active={active} />,
    });
});
