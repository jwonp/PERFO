"use client";

import { useEffect, useRef, useState } from "react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button, Drawer, DrawerContent, DrawerHeader, DrawerTitle, Field, FieldError, FieldLabel } from "@jwonp/design-system";
import { Input } from "@jwonp/design-system";
import type { MyProfileResponse, ProfileImageType, UpdateMyProfileRequest } from "@/lib/profile/profile.types";

interface ProfileEditSheetProps {
    open: boolean;
    initialDisplayName: string;
    initialProfileImageType: ProfileImageType;
    initialProfileImageValue: string | null;
    initialProfileImageUrl: string | null;
    title: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    displayNameCounterLabel: (current: number, max: number) => string;
    cancelLabel: string;
    saveLabel: string;
    savingLabel: string;
    minLengthMessage: string;
    maxLengthMessage: string;
    controlCharacterMessage: string;
    uploadTodoLabel: string;
    uploadImageLabel: string;
    uploadImageHint: string;
    uploadingImageLabel: string;
    onClose: () => void;
    onSave: (payload: UpdateMyProfileRequest) => Promise<void>;
    onUpload: (file: File) => Promise<MyProfileResponse>;
}

const MAX_DISPLAY_NAME_LENGTH = 20;

const getValidationMessage = (
    value: string,
    minLengthMessage: string,
    maxLengthMessage: string,
    controlCharacterMessage: string,
): string | null => {
    const trimmed = value.trim();

    if (trimmed.length < 2) {
        return minLengthMessage;
    }

    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
        return maxLengthMessage;
    }

    if ([...trimmed].some((character) => character === "\n" || character === "\r" || /[\u0000-\u001f\u007f]/.test(character))) {
        return controlCharacterMessage;
    }

    return null;
};

export const ProfileEditSheet = ({
    open,
    initialDisplayName,
    initialProfileImageType,
    initialProfileImageValue,
    initialProfileImageUrl,
    title,
    displayNameLabel,
    displayNamePlaceholder,
    displayNameCounterLabel,
    cancelLabel,
    saveLabel,
    savingLabel,
    minLengthMessage,
    maxLengthMessage,
    controlCharacterMessage,
    uploadTodoLabel,
    uploadImageLabel,
    uploadImageHint,
    uploadingImageLabel,
    onClose,
    onSave,
    onUpload,
}: ProfileEditSheetProps) => {
    const [displayName, setDisplayName] = useState(initialDisplayName);
    const [profileImageType, setProfileImageType] = useState<ProfileImageType>(initialProfileImageType);
    const [profileImageValue, setProfileImageValue] = useState<string | null>(initialProfileImageValue);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [serverMessage, setServerMessage] = useState<string | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return;
        }

        if (wasOpenRef.current) {
            return;
        }
        wasOpenRef.current = true;

        setDisplayName(initialDisplayName);
        setProfileImageType(initialProfileImageType);
        setProfileImageValue(initialProfileImageValue);
        setProfileImageUrl(initialProfileImageUrl);
        setIsSaving(false);
        setIsUploading(false);
        setServerMessage(null);
        setFileInputKey((prev) => prev + 1);
    }, [initialDisplayName, initialProfileImageType, initialProfileImageUrl, initialProfileImageValue, open]);

    const validationMessage = getValidationMessage(displayName, minLengthMessage, maxLengthMessage, controlCharacterMessage);
    const trimmedDisplayName = displayName.trim();
    const normalizedInitialName = initialDisplayName.trim();
    const normalizedProfileImageType: ProfileImageType = profileImageType;
    const normalizedProfileImageValue = profileImageValue;
    const hasChanges =
        trimmedDisplayName !== normalizedInitialName ||
        normalizedProfileImageType !== initialProfileImageType ||
        normalizedProfileImageValue !== initialProfileImageValue;
    const canSave = !validationMessage && hasChanges && !isSaving && !isUploading;

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0];
        if (!nextFile) {
            return;
        }

        try {
            setIsUploading(true);
            setServerMessage(null);
            const nextProfile = await onUpload(nextFile);
            setProfileImageType(nextProfile.profileImageType);
            setProfileImageValue(nextProfile.profileImageValue);
            setProfileImageUrl(nextProfile.profileImageUrl);
        } catch (error) {
            setServerMessage(error instanceof Error ? error.message : "Request failed");
        } finally {
            setIsUploading(false);
            setFileInputKey((prev) => prev + 1);
        }
    };

    const submitProfile = async () => {
        if (!canSave) {
            return;
        }

        try {
            setIsSaving(true);
            setServerMessage(null);
            await onSave({
                displayName: trimmedDisplayName,
                profileImageType: normalizedProfileImageType,
                profileImageValue: normalizedProfileImageValue,
            });
        } catch (error) {
            setServerMessage(error instanceof Error ? error.message : "Request failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        void submitProfile();
    };

    return (
        <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                </DrawerHeader>
                <div className="px-5 pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
                        <ProfileAvatar
                            displayName={trimmedDisplayName || initialDisplayName}
                            profileImageType={profileImageType}
                            profileImageValue={profileImageValue}
                            profileImageUrl={profileImageUrl}
                            size="md"
                            className="border-[5px]"
                        />
                        <div className="min-w-0 space-y-1">
                            <div className="text-sm font-bold text-[var(--text)]">{uploadImageLabel}</div>
                            <div className="text-xs text-[var(--text-subtle)]">{uploadImageHint}</div>
                        </div>
                    </div>

                    <Field>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="profile-display-name" className="text-sm font-bold text-[var(--text)]">
                                {displayNameLabel}
                            </FieldLabel>
                            <span className="text-xs font-medium text-[var(--text-subtle)]">
                                {displayNameCounterLabel(trimmedDisplayName.length, MAX_DISPLAY_NAME_LENGTH)}
                            </span>
                        </div>
                        <Input
                            id="profile-display-name"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            maxLength={MAX_DISPLAY_NAME_LENGTH + 5}
                            placeholder={displayNamePlaceholder}
                            aria-invalid={validationMessage ? true : undefined}
                            className="h-12 rounded-2xl"
                        />
                        {validationMessage && (
                            <FieldError className="font-medium">{validationMessage}</FieldError>
                        )}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="profile-image-upload" className="text-sm font-bold text-[var(--text)]">
                            {uploadImageLabel}
                        </FieldLabel>
                        <Input
                            key={fileInputKey}
                            id="profile-image-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleUpload}
                            disabled={isUploading || isSaving}
                            className="h-12 rounded-2xl file:mr-3 file:rounded-lg file:bg-[var(--surface-muted)] file:px-3"
                            aria-label={uploadImageLabel}
                        />
                        <p className="text-xs text-[var(--text-subtle)]">
                            {isUploading ? uploadingImageLabel : uploadTodoLabel}
                        </p>
                    </Field>

                    {serverMessage && (
                        <FieldError className="font-medium">{serverMessage}</FieldError>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="h-12 flex-1 rounded-2xl" onClick={onClose}>
                            {cancelLabel}
                        </Button>
                        <Button type="button" className="h-12 flex-1 rounded-2xl" disabled={!canSave} onClick={() => void submitProfile()}>
                            {isSaving ? savingLabel : saveLabel}
                        </Button>
                    </div>
                </form>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
