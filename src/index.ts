import EditorJS, { type OutputData, type API, type BlockMutationEvent } from "@editorjs/editorjs"

export type Options = {
    /** **Required**. The EditorJS instance. */
    editor: EditorJS
    /** Callback called when the user performs an undo or redo action. */
    onUpdate?(): any
}
type HistoryEntry = {
    data: OutputData
}
function noop() {}
function isEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}
/**
 * @class EditorJSUndo
 */
export default class EditorJSUndo {
    private _history: HistoryEntry[] = [];
    private _draft: Stack<HistoryEntry> = new Stack<HistoryEntry>();
    private _editor: EditorJS;
    private _onUpdate: () => any = noop;
    private _manualChanged: boolean = false;
    constructor(options: Options) {
        if (!options) {
            throw new Error('Options are required');
        }
        if (!options.editor) {
            throw new Error('Options.editor field is required');
        }
        this._editor = options.editor;
        if (typeof options.onUpdate === "function") {
            this._onUpdate = options.onUpdate;
        }
        this.bindEditorChange()
    }
    /** @internal */
    bindEditorChange() {
        const _that = this
        // @ts-ignore
        const onChange = this._editor.configuration.onChange
        // @ts-ignore
        this._editor.configuration.onChange = async function (...args) {
            if (typeof onChange === "function") {
                await onChange(...args)
            }
            // @ts-ignore
            _that.handleChange(...args)
        }
        this.bindUndoRedoEvents()
    }
    initialize(data: OutputData) {
        this._history.unshift({
            data
        })
    }
    /** @internal */
    async handleChange(api: API, _: BlockMutationEvent | BlockMutationEvent[]) {
        if (this._manualChanged) {
            this._manualChanged = false;
            return;
        }
        const data = await api.saver.save()
        this.pushHistory(data)
    }
    /** @internal */
    bindUndoRedoEvents() {
        // @ts-ignore
        const holder = this._editor.configuration.holder as HTMLElement
        holder.addEventListener("keydown", (event: KeyboardEvent) => {
            const isCtrlKey = event.ctrlKey || event.metaKey
            if (isCtrlKey) {
                // Ctrl + Z
                if (event.keyCode === 90) {
                    event.preventDefault()
                    this.popHistory()
                } else if (event.keyCode === 89) {
                    // Ctrl + Y
                    event.preventDefault()
                    this.restoreHistory()
                }
            }
        })
    }
    /** @internal */
    pushHistory(data: OutputData) {
        if (this.hasChanged(data)) {
            this._history.push({
                data
            })
        }
    }
    /** @internal */
    popHistory() {
        const patchData = this._history.pop();
        if (patchData) {
            const len = this._history.length;
            if (len !== 0) {
                this.render(this._history[len - 1].data);
            } else {
                this.handleThreshold()
            }
            this._draft.enqueue(patchData);
            this.tickUpdate()
        }
    }
    /** @internal */
    restoreHistory() {
        if (!this._draft.isEmpty) {
            const draftData = this._draft.dequeue()!;
            this.pushHistory(draftData.data)
            this.render(draftData.data)
            this.tickUpdate()
        }
    }
    /** @internal */
    async render(data: OutputData) {
        await this._editor.render(data);
        if (this._editor.blocks.getBlocksCount()) {
            this._manualChanged = true;
            this._editor.blocks.getBlockByIndex(0)!.dispatchChange();
            this.setCaret()
        }
    }
    /** @internal */
    async handleThreshold() {
        this._manualChanged = true
        await this._editor.blocks.clear()
        this.setCaret()
    }
    /** @internal */
    setCaret() {
        setTimeout(() => {
            this._editor.caret.setToLastBlock();
        }, 0);
    }
    /** @internal */
    hasChanged(historyData: OutputData): boolean {
        if (this._history.length === 0) return true
        const lastHistoryData = this._history[this._history.length - 1].data
        if (historyData.blocks.length !== lastHistoryData.blocks.length) return true
        for (let i = 0; i < lastHistoryData.blocks.length; i++) {
            const value1 = historyData.blocks[i];
            const value2 = lastHistoryData.blocks[i];
            if (value1.id && value2.id && value1.id !== value2.id) return true
            if (value1.type !== value2.type) return true
            if (!isEqual(value1.data, value2.data)) {
                return true
            }
        }
        return false
    }
    /** @internal */
    tickUpdate() {
        this._onUpdate && this._onUpdate()
    }
}
/**
 * @class Stack
 */
class Stack<T = any> {
    private _stack: Array<T> = []
    get isEmpty(): boolean {
        return this._stack.length === 0;
    }
    dequeue(): T | undefined {
        return this._stack.pop();
    }
    enqueue(element: T) {
        this._stack.push(element);
    }
}