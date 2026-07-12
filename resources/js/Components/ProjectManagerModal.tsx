import type { SavedProjectSummary } from '../Types/network';

type PendingAction = 'new' | 'open' | 'delete' | null;

type ProjectManagerModalProps = {
    isOpen: boolean;
    savedProjects: SavedProjectSummary[];
    selectedSavedProjectId: number | null;
    currentProjectName: string;
    currentProjectId: number | null;
    isDirty: boolean;
    isProjectListLoading: boolean;
    isOpeningProject: boolean;
    isDeletingProject: boolean;
    pendingAction: PendingAction;
    onClose: () => void;
    onSelectSavedProject: (projectId: number | null) => void;
    onCreateNewProject: () => void;
    onOpenSelectedProject: () => void;
    onDeleteSelectedProject: () => void;
    onDiscardAndContinue: () => void;
    onSaveAndContinue: () => void;
    onCancelPendingAction: () => void;
};

export default function ProjectManagerModal({
    isOpen,
    savedProjects,
    selectedSavedProjectId,
    currentProjectName,
    currentProjectId,
    isDirty,
    isProjectListLoading,
    isOpeningProject,
    isDeletingProject,
    pendingAction,
    onClose,
    onSelectSavedProject,
    onCreateNewProject,
    onOpenSelectedProject,
    onDeleteSelectedProject,
    onDiscardAndContinue,
    onSaveAndContinue,
    onCancelPendingAction,
}: ProjectManagerModalProps) {
    if (!isOpen) {
        return null;
    }

    const selectedProject =
        savedProjects.find((project) => project.id === selectedSavedProjectId) ?? null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <section className="node-modal project-manager-modal" onClick={(event) => event.stopPropagation()}>
                <div className="node-modal-header">
                    <div>
                        <p className="panel-label">プロジェクト管理</p>
                        <h2>プロジェクト</h2>
                    </div>
                    <div className="node-modal-actions">
                        <button type="button" className="action-button" onClick={onClose}>
                            閉じる
                        </button>
                    </div>
                </div>

                <div className="project-manager-layout">
                    <div className="detail-card project-manager-current-card">
                        <span className="detail-heading">現在の作業状態</span>
                        <div className="project-manager-current">
                            <div className="project-manager-current-head">
                                <strong>{currentProjectName}</strong>
                                <span className="hop-meta">
                                    {currentProjectId === null
                                        ? '未保存の新規プロジェクト'
                                        : `プロジェクト #${currentProjectId}`}
                                </span>
                            </div>
                            <div className="project-manager-current-status">
                                <span className={`status-banner ${isDirty ? 'is-info' : 'is-success'}`}>
                                    {isDirty ? '未保存の変更あり' : '保存済み'}
                                </span>
                                <p className="selected-summary-text">
                                    {isDirty
                                        ? 'このまま別プロジェクトを開くと変更が失われます。'
                                        : 'この内容を起点に新規プロジェクトを作成できます。'}
                                </p>
                            </div>
                        </div>
                        <div className="project-manager-current-actions">
                            <button type="button" className="action-button" onClick={onCreateNewProject}>
                                新規作成
                            </button>
                        </div>
                    </div>

                    <div className="detail-card">
                        <div className="detail-heading-row">
                            <span className="detail-heading">保存済みプロジェクト</span>
                            <span className="hop-meta">
                                {isProjectListLoading ? '読込中...' : `${savedProjects.length} 件`}
                            </span>
                        </div>
                        <div className="project-manager-list">
                            {savedProjects.length === 0 && (
                                <p className="selected-summary-text">保存済みプロジェクトはまだありません。</p>
                            )}
                            {savedProjects.map((savedProject) => (
                                <button
                                    key={savedProject.id}
                                    type="button"
                                    className={`project-manager-item ${selectedSavedProjectId === savedProject.id ? 'is-active' : ''}`}
                                    onClick={() => onSelectSavedProject(savedProject.id)}
                                >
                                    <strong>#{savedProject.id} {savedProject.name}</strong>
                                    <span>{savedProject.updated_at ?? '更新日時なし'}</span>
                                </button>
                            ))}
                        </div>
                        <div className="modal-inline-actions">
                            <button
                                type="button"
                                className="action-button"
                                onClick={onOpenSelectedProject}
                                disabled={selectedProject === null || isOpeningProject}
                            >
                                {isOpeningProject ? '読込中...' : '開く'}
                            </button>
                            <button
                                type="button"
                                className="action-button danger"
                                onClick={onDeleteSelectedProject}
                                disabled={selectedProject === null || isDeletingProject}
                            >
                                {isDeletingProject ? '削除中...' : '削除'}
                            </button>
                        </div>
                    </div>
                </div>

                {pendingAction !== null && (
                    <div className="project-manager-guard">
                        <span className="detail-heading">未保存の変更があります</span>
                        <p className="selected-summary-text">
                            {pendingAction === 'new' && '新規プロジェクトを作成すると現在の未保存変更が失われます。'}
                            {pendingAction === 'open' && '別のプロジェクトを開くと現在の未保存変更が失われます。'}
                            {pendingAction === 'delete' && '削除を続ける前に、現在の変更をどう扱うか決めてください。'}
                        </p>
                        <div className="modal-inline-actions">
                            <button type="button" className="action-button primary" onClick={onSaveAndContinue}>
                                保存して続行
                            </button>
                            <button type="button" className="action-button" onClick={onDiscardAndContinue}>
                                保存せず続行
                            </button>
                            <button type="button" className="action-button" onClick={onCancelPendingAction}>
                                キャンセル
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
