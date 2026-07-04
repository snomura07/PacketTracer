type ProjectPanelProps = {
    name: string;
    description: string | null;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
};

export default function ProjectPanel({
    name,
    description,
    onNameChange,
    onDescriptionChange,
}: ProjectPanelProps) {
    return (
        <div className="selected-card">
            <p className="panel-label">プロジェクト</p>
            <div className="field-stack">
                <label className="field-group">
                    <span>名称</span>
                    <input
                        className="editor-input"
                        value={name}
                        onChange={(event) => onNameChange(event.target.value)}
                    />
                </label>
                <label className="field-group">
                    <span>説明</span>
                    <textarea
                        className="editor-input editor-textarea"
                        value={description ?? ''}
                        onChange={(event) => onDescriptionChange(event.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}
