import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco web workers for Vite
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

const CodeEditor = forwardRef(({ roomId: _roomId, initialChallenge }, ref) => {
    const editorRef = useRef(null);
    const editorInstance = useRef(null);
    const [challenge, setChallenge] = useState(null);

    // Update internal challenge state whenever the parent provides a new one
    useEffect(() => {
        if (initialChallenge) {
            setChallenge(initialChallenge);
        }
    }, [initialChallenge]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        getCode: () => editorInstance.current?.getModel()?.getValue() || '',
        setCode: (code) => {
            const model = editorInstance.current?.getModel();
            if (model) model.setValue(code);
        },
        getChallenge: () => challenge,
    }), [challenge]);

    // Initialize Monaco
    useEffect(() => {
        if (!editorRef.current || !challenge) return;

        if (editorInstance.current) {
            editorInstance.current.dispose();
        }

        const editor = monaco.editor.create(editorRef.current, {
            value: challenge.starterCode,
            language: 'cpp',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 16,
            fontFamily: 'var(--font-mono)',
            padding: { top: 20 },
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        });

        editorInstance.current = editor;
        return () => { editor.dispose(); };
    }, [challenge]);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
});

CodeEditor.displayName = 'CodeEditor';
export default CodeEditor;
