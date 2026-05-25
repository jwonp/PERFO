"use client";

import { ProfileScreen } from "./ProfileScreen";
import { useProfilePage } from "./use-profile-page.hooks";

const ProfilePage = () => {
    const {
        t,
        profile,
        displayName,
        userId,
        darkMode,
        sheetOpen,
        feedbackMessage,
        setSheetOpen,
        setPreference,
        handleSaveProfile,
        handleUploadProfileImage,
        handleLogout,
    } = useProfilePage();

    return (
        <ProfileScreen
            t={t}
            profile={profile}
            displayName={displayName}
            userId={userId}
            darkMode={darkMode}
            sheetOpen={sheetOpen}
            feedbackMessage={feedbackMessage}
            onOpenSheet={() => setSheetOpen(true)}
            onCloseSheet={() => setSheetOpen(false)}
            onToggleTheme={() => setPreference(darkMode ? "light" : "dark")}
            onLogout={handleLogout}
            onSaveProfile={handleSaveProfile}
            onUploadProfileImage={handleUploadProfileImage}
        />
    );
};

export default ProfilePage;
