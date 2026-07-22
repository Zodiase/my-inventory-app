/**
 * Touch-ready presentation and local interaction state for item attachments.
 * Owns file selection and delete confirmation while callers provide reactive
 * metadata plus the actual upload and deletion operations.
 */
import { Box, Button, Heading, Text } from 'grommet';
import { Attachment as AttachmentIcon, Document, Download, Trash, Upload } from 'grommet-icons';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';

import { MAX_ATTACHMENT_BYTES } from '/imports/api/attachmentValidation';
import type { Attachment } from '/imports/model/Attachment';
import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { uiTokens } from '/imports/ui/theme';

const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,application/pdf';
const ACCEPTED_MIME_TYPES = new Set(ACCEPTED_FILE_TYPES.split(','));
const BYTES_PER_KIBIBYTE = 1024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;

const Panel = styled(Box)`
    border: 1px solid ${uiTokens.color.border};
    border-radius: ${uiTokens.radius.control};
    background: ${uiTokens.color.surfaceRaised};
`;

const FileInput = styled.input`
    min-height: ${uiTokens.size.touchTarget};
    width: 100%;
    color: ${uiTokens.color.text};

    &::file-selector-button {
        min-height: ${uiTokens.size.touchTarget};
        margin-right: ${uiTokens.space.md};
        padding: 0 ${uiTokens.space.lg};
        border: 1px solid ${uiTokens.color.borderStrong};
        border-radius: ${uiTokens.radius.control};
        background: ${uiTokens.color.surfaceSubtle};
        color: ${uiTokens.color.text};
        cursor: pointer;
    }

    &:disabled::file-selector-button {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

const AttachmentRow = styled(Box)`
    border: 1px solid ${uiTokens.color.borderSubtle};
    border-radius: ${uiTokens.radius.control};
    background: ${uiTokens.color.surfaceSunken};
`;

const PreviewImage = styled.img`
    width: 72px;
    height: 72px;
    flex: 0 0 72px;
    border-radius: ${uiTokens.radius.small};
    object-fit: cover;
    background: ${uiTokens.color.surfaceSubtle};
`;

const PreviewFallback = styled(Box)`
    width: 72px;
    height: 72px;
    flex: 0 0 72px;
    border-radius: ${uiTokens.radius.small};
    background: ${uiTokens.color.surfaceSubtle};
`;

const ActionLink = styled.a`
    display: inline-flex;
    min-height: ${uiTokens.size.touchTarget};
    align-items: center;
    gap: ${uiTokens.space.sm};
    padding: 0 ${uiTokens.space.md};
    border-radius: ${uiTokens.radius.control};
    color: ${uiTokens.color.brand};
    font-weight: ${uiTokens.font.weightMedium};
    text-decoration: none;

    &:hover {
        background: ${uiTokens.color.brandGhostHover};
    }
`;

export interface AttachmentPanelProps {
    itemId: string;
    attachments: Attachment[];
    isLoading?: boolean;
    isUploading?: boolean;
    deletingAttachmentId?: string;
    errorMessage?: string;
    onUpload: (file: File) => Promise<void>;
    onDelete: (attachment: Attachment) => Promise<void>;
}

const getAttachmentUrl = (itemId: string, attachmentId: string, target: 'content' | 'thumbnail'): string => {
    return `/api/items/${encodeURIComponent(itemId)}/attachments/${encodeURIComponent(attachmentId)}/${target}`;
};

const formatFileSize = (bytes: number): string => {
    if (bytes >= BYTES_PER_MEBIBYTE) return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MiB`;
    return `${Math.max(1, Math.round(bytes / BYTES_PER_KIBIBYTE))} KiB`;
};

const getSelectionError = (file: File): string | undefined => {
    if (file.size > MAX_ATTACHMENT_BYTES) return 'Choose a file that is 20 MiB or smaller.';
    if (file.type !== '' && !ACCEPTED_MIME_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or PDF file.';
    return undefined;
};

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
    itemId,
    attachments,
    isLoading = false,
    isUploading = false,
    deletingAttachmentId,
    errorMessage,
    onUpload,
    onDelete,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | undefined>();
    const [selectionError, setSelectionError] = useState<string | undefined>();
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | undefined>();
    const [failedPreviews, setFailedPreviews] = useState<Set<string>>(() => new Set());

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        setSelectedFile(file);
        setSelectionError(file === undefined ? undefined : getSelectionError(file));
    };

    const handleUpload = async (): Promise<void> => {
        if (selectedFile === undefined || selectionError !== undefined || isUploading) return;

        try {
            await onUpload(selectedFile);
            setSelectedFile(undefined);
            if (inputRef.current !== null) inputRef.current.value = '';
        } catch {
            // The caller exposes the server error through errorMessage.
        }
    };

    const handleDelete = async (attachment: Attachment): Promise<void> => {
        try {
            await onDelete(attachment);
            setConfirmingDeleteId(undefined);
        } catch {
            // The caller exposes the server error through errorMessage.
        }
    };

    return (
        <Panel pad="medium" gap="medium" data-testid="attachment-panel">
            <Box gap="xsmall">
                <Heading level={3} margin="none">
                    Attachments
                </Heading>
                <Text size="small" color="text-weak">
                    Add one JPEG, PNG, or PDF at a time, up to 20 MiB.
                </Text>
            </Box>

            <Box gap="small">
                <label htmlFor="attachment-file">
                    <Text weight="bold">Choose a file</Text>
                </label>
                <FileInput
                    ref={inputRef}
                    id="attachment-file"
                    data-testid="attachment-file-input"
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    disabled={isUploading}
                    onChange={handleFileChange}
                />
                {selectedFile !== undefined && selectionError === undefined && (
                    <Text size="small" color="text-weak">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </Text>
                )}
                {selectionError !== undefined && (
                    <Text role="alert" color="status-critical" data-testid="attachment-selection-error">
                        {selectionError}
                    </Text>
                )}
                <Box direction="row" align="center" gap="small">
                    <Button
                        primary
                        icon={<Upload />}
                        label={isUploading ? 'Uploading…' : 'Upload attachment'}
                        disabled={selectedFile === undefined || selectionError !== undefined || isUploading}
                        onClick={() => {
                            void handleUpload();
                        }}
                    />
                    {isUploading && <LoadingSpinner size="small" ariaLabel="Uploading attachment" />}
                </Box>
            </Box>

            {errorMessage !== undefined && (
                <Text role="alert" color="status-critical" data-testid="attachment-error">
                    {errorMessage}
                </Text>
            )}

            {isLoading ? (
                <Box align="center" pad="medium">
                    <LoadingSpinner size="small" text="Loading attachments…" ariaLabel="Loading attachments" />
                </Box>
            ) : attachments.length === 0 ? (
                <Box align="center" pad="medium" gap="small">
                    <AttachmentIcon color="text-weak" aria-hidden="true" />
                    <Text color="text-weak">No attachments yet.</Text>
                </Box>
            ) : (
                <Box gap="small" aria-label="Item attachments">
                    {attachments.map((attachment) => {
                        const isDeleting = deletingAttachmentId === attachment._id;
                        const isConfirmingDelete = confirmingDeleteId === attachment._id;
                        const previewFailed = failedPreviews.has(attachment._id);

                        return (
                            <AttachmentRow key={attachment._id} pad="small" gap="small" data-testid="attachment-row">
                                <Box direction="row" align="center" gap="medium">
                                    {attachment.type === 'photo' && !previewFailed ? (
                                        <PreviewImage
                                            src={getAttachmentUrl(itemId, attachment._id, 'thumbnail')}
                                            alt={`Preview of ${attachment.label}`}
                                            onError={() => {
                                                setFailedPreviews((current) => new Set(current).add(attachment._id));
                                            }}
                                        />
                                    ) : (
                                        <PreviewFallback align="center" justify="center" gap="xsmall">
                                            <Document aria-hidden="true" />
                                            {attachment.type === 'photo' && (
                                                <Text size="xsmall" textAlign="center">
                                                    Preview unavailable
                                                </Text>
                                            )}
                                        </PreviewFallback>
                                    )}

                                    <Box flex="grow" gap="xxsmall">
                                        <Text weight="bold">{attachment.label}</Text>
                                        <Text size="small" color="text-weak">
                                            {attachment.type === 'photo' ? 'Image' : 'PDF'} ·{' '}
                                            {formatFileSize(attachment.fileSize)}
                                        </Text>
                                    </Box>
                                </Box>

                                {isConfirmingDelete ? (
                                    <Box gap="small" background="status-critical" pad="small" round="small">
                                        <Text color="white">
                                            Delete “{attachment.label}”? This removes the stored file and cannot be
                                            undone.
                                        </Text>
                                        <Box direction="row" justify="end" gap="small" wrap>
                                            <Button
                                                label="Cancel"
                                                disabled={isDeleting}
                                                onClick={() => {
                                                    setConfirmingDeleteId(undefined);
                                                }}
                                            />
                                            <Button
                                                label={isDeleting ? 'Deleting…' : 'Delete attachment'}
                                                icon={<Trash />}
                                                color="white"
                                                disabled={isDeleting}
                                                onClick={() => {
                                                    void handleDelete(attachment);
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box direction="row" gap="small" wrap>
                                        <ActionLink
                                            href={getAttachmentUrl(itemId, attachment._id, 'content')}
                                            download={attachment.originalFilename}
                                        >
                                            <Download aria-hidden="true" />
                                            Download
                                        </ActionLink>
                                        <Button
                                            icon={<Trash />}
                                            label="Delete"
                                            color="status-critical"
                                            disabled={deletingAttachmentId !== undefined}
                                            onClick={() => {
                                                setConfirmingDeleteId(attachment._id);
                                            }}
                                        />
                                    </Box>
                                )}
                            </AttachmentRow>
                        );
                    })}
                </Box>
            )}
        </Panel>
    );
};
