type ProjectToolbarProps = {
    appName: string;
    selectedTypeLabel: string | null;
    selectedLabel: string;
    statusTone: 'error' | 'success' | 'info';
    statusMessage: string;
    savedProjects: {
        id: number;
        name: string;
    }[];
    selectedSavedProjectId: number | null;
    isSaving: boolean;
    isProjectListLoading: boolean;
    isOpeningProject: boolean;
    isReloading: boolean;
    onSelectSavedProject: (projectId: number | null) => void;
    onOpenSelectedProject: () => void;
    onSave: () => void;
    onReload: () => void;
    onReset: () => void;
};

export default function ProjectToolbar({
    appName,
    selectedTypeLabel,
    selectedLabel,
    statusTone,
    statusMessage,
    savedProjects,
    selectedSavedProjectId,
    isSaving,
    isProjectListLoading,
    isOpeningProject,
    isReloading,
    onSelectSavedProject,
    onOpenSelectedProject,
    onSave,
    onReload,
    onReset,
}: ProjectToolbarProps) {
    return (
        <div className="canvas-toolbar">
            <div className="canvas-toolbar-copy">
                <p className="eyebrow">{appName}</p>
                <p className="canvas-toolbar-meta">
                    {selectedTypeLabel
                        ? `選択中: ${selectedLabel} (${selectedTypeLabel})`
                        : '左クリックで編集、右クリックで操作メニューを開きます'}
                </p>
                <p className={`canvas-toolbar-status status-banner is-${statusTone}`}>
                    {statusMessage}
                </p>
            </div>
            <div className="canvas-toolbar-actions">
                <div className="project-picker">
                    <select
                        className="project-select"
                        value={selectedSavedProjectId ?? ''}
                        onChange={(event) =>
                            onSelectSavedProject(
                                event.target.value === ''
                                    ? null
                                    : Number(event.target.value),
                            )
                        }
                        disabled={isProjectListLoading || savedProjects.length === 0}
                    >
                        <option value="">
                            {isProjectListLoading
                                ? '保存済みプロジェクトを読込中...'
                                : savedProjects.length === 0
                                  ? '保存済みプロジェクトなし'
                                  : '保存済みプロジェクトを選択'}
                        </option>
                        {savedProjects.map((savedProject) => (
                            <option key={savedProject.id} value={savedProject.id}>
                                #{savedProject.id} {savedProject.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="action-button"
                        onClick={onOpenSelectedProject}
                        disabled={
                            isOpeningProject ||
                            isProjectListLoading ||
                            selectedSavedProjectId === null
                        }
                    >
                        {isOpeningProject ? '読込中...' : '開く'}
                    </button>
                </div>
                <button
                    type="button"
                    className="action-button primary"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                    type="button"
                    className="action-button"
                    onClick={onReload}
                    disabled={isReloading}
                >
                    {isReloading ? '再読込中...' : '再読込'}
                </button>
                <button type="button" className="action-button" onClick={onReset}>
                    リセット
                </button>
            </div>
        </div>
    );
}
