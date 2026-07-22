import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'grommet';
import React, { useState } from 'react';

import type { Attachment } from '/imports/model/Attachment';
import { AttachmentPanel, type AttachmentPanelProps } from '/imports/ui/AttachmentPanel';

const ITEM_ID = 'storybook-item';
const NOW = new Date('2026-07-15T00:00:00Z');

const photoAttachment: Attachment = {
    _id: 'photo-attachment',
    itemId: ITEM_ID,
    type: 'photo',
    fileId: '507f1f77bcf86cd799439011',
    thumbnailId: '507f1f77bcf86cd799439012',
    storageState: 'ready',
    label: 'garage shelf.png',
    originalFilename: 'garage shelf.png',
    mimeType: 'image/png',
    fileSize: 48_200,
    order: 0,
    isPrimary: true,
    width: 1200,
    height: 900,
    createdAt: NOW,
    modifiedAt: NOW,
};

const pdfAttachment: Attachment = {
    _id: 'pdf-attachment',
    itemId: ITEM_ID,
    type: 'pdf',
    fileId: '507f1f77bcf86cd799439013',
    storageState: 'ready',
    label: 'purchase receipt.pdf',
    originalFilename: 'purchase receipt.pdf',
    mimeType: 'application/pdf',
    fileSize: 1_480_000,
    order: 1,
    isPrimary: false,
    createdAt: NOW,
    modifiedAt: NOW,
};

const idleCallbacks: Pick<AttachmentPanelProps, 'onUpload' | 'onDelete'> = {
    onUpload: async () => {
        await Promise.resolve();
    },
    onDelete: async () => {
        await Promise.resolve();
    },
};

const meta = {
    title: 'UI/AttachmentPanel',
    component: AttachmentPanel,
    parameters: { layout: 'padded' },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box width={{ max: 'large' }} margin="auto">
                <Story />
            </Box>
        ),
    ],
    args: {
        itemId: ITEM_ID,
        attachments: [],
        ...idleCallbacks,
    },
} satisfies Meta<typeof AttachmentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithAttachments: Story = {
    args: { attachments: [photoAttachment, pdfAttachment] },
};

export const Loading: Story = {
    args: { isLoading: true },
};

export const Uploading: Story = {
    args: { attachments: [photoAttachment], isUploading: true },
};

export const ErrorState: Story = {
    args: {
        attachments: [pdfAttachment],
        errorMessage: 'The attachment could not be stored. Try again.',
    },
};

export const MissingThumbnail: Story = {
    args: { attachments: [photoAttachment] },
};

export const Deleting: Story = {
    args: {
        attachments: [photoAttachment, pdfAttachment],
        deletingAttachmentId: photoAttachment._id,
    },
};

export const Interactive: Story = {
    render: (args) => {
        const [attachments, setAttachments] = useState<Attachment[]>(args.attachments);
        const [isUploading, setIsUploading] = useState(false);
        const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | undefined>();
        const [lastAction, setLastAction] = useState('No action yet');

        return (
            <Box gap="small">
                <AttachmentPanel
                    {...args}
                    attachments={attachments}
                    isUploading={isUploading}
                    deletingAttachmentId={deletingAttachmentId}
                    onUpload={async (file) => {
                        setIsUploading(true);
                        await new Promise((resolve) => setTimeout(resolve, 250));
                        const timestamp = new Date();
                        setAttachments((current) => [
                            ...current,
                            {
                                _id: `uploaded-${current.length}`,
                                itemId: ITEM_ID,
                                type: file.type === 'application/pdf' ? 'pdf' : 'photo',
                                fileId: `file-${current.length}`,
                                thumbnailId: file.type === 'application/pdf' ? undefined : `thumb-${current.length}`,
                                storageState: 'ready',
                                label: file.name,
                                originalFilename: file.name,
                                mimeType: file.type,
                                fileSize: file.size,
                                order: current.length,
                                isPrimary: current.every((attachment) => attachment.type !== 'photo'),
                                createdAt: timestamp,
                                modifiedAt: timestamp,
                            },
                        ]);
                        setLastAction(`Uploaded ${file.name}`);
                        setIsUploading(false);
                    }}
                    onDelete={async (attachment) => {
                        setDeletingAttachmentId(attachment._id);
                        await new Promise((resolve) => setTimeout(resolve, 250));
                        setAttachments((current) => current.filter((candidate) => candidate._id !== attachment._id));
                        setLastAction(`Deleted ${attachment.label}`);
                        setDeletingAttachmentId(undefined);
                    }}
                />
                <Text data-testid="attachment-story-action">{lastAction}</Text>
                <Text data-testid="attachment-story-count">{attachments.length}</Text>
            </Box>
        );
    },
    args: { attachments: [pdfAttachment] },
};
