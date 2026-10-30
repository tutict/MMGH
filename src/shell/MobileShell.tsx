import MobileAppShell from "../components/mobile/MobileAppShell";

export default function MobileShell({ model }) {
  return (
    <MobileAppShell
      shell={{
        busy: model.busy,
        clockNow: model.clockNow,
        error: model.error,
        formatShortClock: model.formatShortClock,
        lang: model.lang,
        loading: model.loading,
        mediaSlot: (
          <>
            {model.audioSlot}
            {model.showMiniPlayer ? model.miniPlayer : null}
          </>
        ),
        notice: model.notice,
        PanelIcon: model.PanelIcon,
        providerConfigured: model.providerConfigured,
        setLang: model.setLang,
        setTheme: model.setTheme,
        t: model.t,
        theme: model.theme,
      }}
      navigation={{
        allItems: model.allNavigationItems,
        currentView: model.currentView,
        dockItems: model.mobileDockItems,
        openView: model.openView,
        viewMeta: model.viewMeta,
      }}
      today={{
        activeSession: model.activeSession,
        completedTodayItems: model.completedTodayItems,
        continueSessionItems: model.continueSessionItems,
        dueReminderCount: model.dueReminderCount,
        formatTime: model.formatTime,
        handleSelectReminder: model.handleSelectReminder,
        handleToggleTodayReminderStatus: model.handleToggleTodayReminderStatus,
        openReminderCount: model.openReminderCount,
        openView: model.openView,
        recentCaptureItems: model.recentCaptureItems,
        todayReminderItems: model.todayReminderItems,
        todayReviewSignals: model.todayReviewSignals,
      }}
      agent={{
        activeSession: model.activeSession,
        activeSessionRecommendedSkills: model.runtimeRecommendedSkills,
        activeSessionSkillIds: model.activeSessionSkillIds,
        activeSessionSkills: model.activeSessionSkills,
        draft: model.draft,
        formatTime: model.formatTime,
        handleOpenSession: model.handleOpenSession,
        handleRunAgent: model.handleRunAgent,
        handleToggleSkillMounted: model.handleToggleSkillMounted,
        sessionList: model.sessionList,
        setDraft: model.setDraft,
      }}
      knowledge={{
        activeNote: model.activeNote,
        activeNoteId: model.activeNoteId,
        filteredNotes: model.filteredNotes,
        formatTime: model.formatTime,
        handleCreateNote: model.handleCreateNote,
        handleDeleteNote: model.handleDeleteNote,
        handleOpenNote: model.handleOpenNote,
        handleSaveNote: model.handleSaveNote,
        hasUnsavedNote: model.hasUnsavedNote,
        noteDraft: model.noteDraft,
        noteSearch: model.noteSearch,
        setNoteDraft: model.setNoteDraft,
        setNoteSearch: model.setNoteSearch,
      }}
      weather={{
        activeWeatherCity: model.activeWeatherCity,
        onAddWeatherCity: model.handleAddWeatherCity,
        onRefresh: () => void model.loadWeatherSnapshotData(model.weatherLocations),
        onRemoveWeatherCity: model.handleRemoveWeatherCity,
        selectedWeatherCityId: model.selectedWeatherCityId,
        setSelectedWeatherCityId: model.setSelectedWeatherCityId,
        weatherCities: model.weatherCities,
        weatherError: model.weatherError,
        weatherLocations: model.weatherLocations,
        weatherStatus: model.weatherStatus,
        weatherUpdatedAt: model.weatherUpdatedAt,
      }}
      settings={{
        cacheCards: model.cacheCards,
        handleClearApiKey: model.handleClearApiKey,
        handleSaveSettings: model.handleSaveSettings,
        hasUnsavedSettings: model.hasUnsavedSettings,
        providerSecurityMessage: model.providerSecurityMessage,
        providerSecurityStatus: model.providerSecurityAssessment.status,
        setLang: model.setLang,
        setSettingsForm: model.setSettingsForm,
        setTheme: model.setTheme,
        settingsForm: model.settingsForm,
        theme: model.theme,
      }}
      reminders={{
        handleCreateReminder: model.handleCreateReminder,
        handleDeleteReminder: model.handleDeleteReminder,
        handleOpenLinkedNote: model.handleOpenReminderNote,
        handleSaveReminder: model.handleSaveReminder,
        handleSelectReminder: model.handleSelectReminder,
        handleToggleTodayReminderStatus: model.handleToggleTodayReminderStatus,
        hasUnsavedReminder: model.hasUnsavedReminder,
        noteList: model.noteList,
        reminderDraft: model.reminderDraft,
        reminderSearch: model.reminderSearch,
        reminders: model.reminders,
        selectedReminderId: model.selectedReminderId,
        setReminderDraft: model.setReminderDraft,
        setReminderSearch: model.setReminderSearch,
      }}
      gallery={{
        galleryFilter: model.galleryFilter,
        galleryItems: model.galleryItems,
        gallerySearch: model.gallerySearch,
        galleryViewerId: model.galleryViewerId,
        handleDeleteGalleryItem: model.handleDeleteGalleryItem,
        handleGalleryUpload: model.handleGalleryUpload,
        handleToggleFavoriteGalleryItem: model.handleToggleFavoriteGalleryItem,
        setGalleryFilter: model.setGalleryFilter,
        setGallerySearch: model.setGallerySearch,
        setGalleryViewerId: model.setGalleryViewerId,
        t: model.t,
      }}
      music={{
        handleCyclePlayMode: model.handleCyclePlayMode,
        handlePlayNextTrack: model.handlePlayNextTrack,
        handlePlayPreviousTrack: model.handlePlayPreviousTrack,
        handleSeek: model.handleSeek,
        handleSelectTrack: model.handleSelectTrack,
        handleTogglePlayback: model.handleTogglePlayback,
        isPlaying: model.isPlaying,
        lang: model.lang,
        localizedTracks: model.localizedTracks,
        lyricsLines: model.selectedTrackLyrics,
        playMode: model.playMode,
        selectedTrack: model.selectedTrack,
        setVolume: model.setVolume,
        t: model.t,
        volume: model.volume,
      }}
      skills={{
        activeSkill: model.activeSkill,
        busy: model.busy,
        handleCreateSkill: model.handleCreateSkill,
        handleDeleteSkill: model.handleDeleteSkill,
        handleForgeSkill: model.handleForgeSkill,
        handleOpenSkill: model.handleOpenSkill,
        handleSaveSkill: model.handleSaveSkill,
        handleToggleSkillMounted: model.handleToggleSkillMounted,
        loading: model.loading,
        mountedSkillIds: model.activeSessionSkillIds,
        setSkillDraft: model.setSkillDraft,
        skillDraft: model.skillDraft,
        skillList: model.skillList,
        t: model.t,
      }}
      legacy={{ content: null }}
    />
  );
}
