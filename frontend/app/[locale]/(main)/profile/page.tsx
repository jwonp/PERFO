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
        isAdmin,
        sheetOpen,
        feedbackMessage,
        setSheetOpen,
        setPreference,
        handleSaveProfile,
        handleUploadProfileImage,
        handleOpenAdminDashboard,
        handleLogout,
    } = useProfilePage();

    return (
        <ProfileScreen
            t={t}
            profile={profile}
            displayName={displayName}
            userId={userId}
            darkMode={darkMode}
            isAdmin={isAdmin}
            sheetOpen={sheetOpen}
            feedbackMessage={feedbackMessage}
            onOpenSheet={() => setSheetOpen(true)}
            onCloseSheet={() => setSheetOpen(false)}
            onToggleTheme={() => setPreference(darkMode ? "light" : "dark")}
            onOpenAdminDashboard={handleOpenAdminDashboard}
            onLogout={handleLogout}
            onSaveProfile={handleSaveProfile}
            onUploadProfileImage={handleUploadProfileImage}
        />
    );
};

export default ProfilePage;
