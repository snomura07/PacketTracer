type ProjectToolbarProps = {
    appName: string;
    selectedTypeLabel: string | null;
    selectedLabel: string;
    statusTone: 'error' | 'success' | 'info';
    statusMessage: string;
    isSaving: boolean;
    isReloading: boolean;
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
    isSaving,
    isReloading,
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
