type ProjectToolbarProps = {
    appName: string;
    selectedTypeLabel: string | null;
    selectedLabel: string;
    projectName: string;
    projectId: number | null;
    isDirty: boolean;
    statusTone: 'error' | 'success' | 'info';
    statusMessage: string;
    isSaving: boolean;
    isReloading: boolean;
    onOpenProjectManager: () => void;
    onSave: () => void;
    onReload: () => void;
};

export default function ProjectToolbar({
    appName,
    selectedTypeLabel,
    selectedLabel,
    projectName,
    projectId,
    isDirty,
    statusTone,
    statusMessage,
    isSaving,
    isReloading,
    onOpenProjectManager,
    onSave,
    onReload,
}: ProjectToolbarProps) {
    return (
        <div className="canvas-toolbar">
            <div className="canvas-toolbar-copy">
                <p className="eyebrow">{appName}</p>
                <p className="canvas-toolbar-meta">
                    {projectId === null ? '未保存の新規プロジェクト' : `プロジェクト #${projectId}`}
                    {' / '}
                    {projectName}
                    {isDirty ? ' / 未保存' : ''}
                </p>
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
                <button type="button" className="action-button" onClick={onOpenProjectManager}>
                    プロジェクト管理
                </button>
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
            </div>
        </div>
    );
}
