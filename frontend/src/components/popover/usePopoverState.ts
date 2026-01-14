import { useEffect, useReducer } from 'react';

// State types
interface PopoverState {
    // Core states
    isFixed: boolean;
    isProcessing: boolean;
    actionType: 'polish' | 'translate' | 'note' | 'ask' | null;

    // Text states
    text: {
        selected: string;
        editable: string;
    };

    // Result states
    result: {
        value: string;
        editable: string;
        isEditing: boolean;
    };

    // Language states
    language: {
        source: 'zh' | 'en';
        target: string;
        userPickedTarget: boolean;
    };

    // UI states
    contextInvalid: boolean;
}

// Action types
type PopoverAction =
    | { type: 'SET_FIXED'; payload: boolean }
    | { type: 'SET_PROCESSING'; payload: boolean }
    | { type: 'SET_ACTION_TYPE'; payload: 'polish' | 'translate' | 'note' | 'ask' | null }
    | { type: 'SET_SELECTED_TEXT'; payload: string }
    | { type: 'SET_EDITABLE_TEXT'; payload: string }
    | { type: 'SET_RESULT'; payload: string }
    | { type: 'SET_EDITABLE_RESULT'; payload: string }
    | { type: 'SET_IS_EDITING_RESULT'; payload: boolean }
    | { type: 'SET_SOURCE_LANG'; payload: 'zh' | 'en' }
    | { type: 'SET_TARGET_LANG'; payload: string }
    | { type: 'SET_USER_PICKED_TARGET'; payload: boolean }
    | { type: 'SET_CONTEXT_INVALID'; payload: boolean }
    | { type: 'RESET_RESULT' };

// Initial state factory
function createInitialState({ selectedText, initialFixed }: { selectedText: string, initialFixed: boolean }): PopoverState {
    return {
        isFixed: initialFixed,
        isProcessing: false,
        actionType: null,
        text: {
            selected: selectedText,
            editable: selectedText
        },
        result: {
            value: '',
            editable: '',
            isEditing: false
        },
        language: {
            source: 'en',
            target: 'en',
            userPickedTarget: false
        },
        contextInvalid: false
    };
}

// Reducer
function popoverReducer(state: PopoverState, action: PopoverAction): PopoverState {
    switch (action.type) {
        case 'SET_FIXED':
            return { ...state, isFixed: action.payload };
        case 'SET_PROCESSING':
            return { ...state, isProcessing: action.payload };
        case 'SET_ACTION_TYPE':
            return { ...state, actionType: action.payload };
        case 'SET_SELECTED_TEXT':
            return { ...state, text: { ...state.text, selected: action.payload } };
        case 'SET_EDITABLE_TEXT':
            return { ...state, text: { ...state.text, editable: action.payload } };
        case 'SET_RESULT':
            return {
                ...state,
                result: {
                    ...state.result,
                    value: action.payload,
                    editable: action.payload,
                    isEditing: false
                }
            };
        case 'SET_EDITABLE_RESULT':
            return { ...state, result: { ...state.result, editable: action.payload } };
        case 'SET_IS_EDITING_RESULT':
            return { ...state, result: { ...state.result, isEditing: action.payload } };
        case 'SET_SOURCE_LANG':
            return { ...state, language: { ...state.language, source: action.payload } };
        case 'SET_TARGET_LANG':
            return { ...state, language: { ...state.language, target: action.payload } };
        case 'SET_USER_PICKED_TARGET':
            return { ...state, language: { ...state.language, userPickedTarget: action.payload } };
        case 'SET_CONTEXT_INVALID':
            return { ...state, contextInvalid: action.payload };
        case 'RESET_RESULT':
            return {
                ...state,
                result: {
                    value: '',
                    editable: '',
                    isEditing: false
                },
                actionType: null
            };
        default:
            return state;
    }
}

export function usePopoverState(selectedText: string, initialFixed: boolean = false) {
    const [state, dispatch] = useReducer(
        popoverReducer,
        { selectedText, initialFixed },
        createInitialState
    );

    // Sync isFixed from outside if it changes
    useEffect(() => {
        dispatch({ type: 'SET_FIXED', payload: initialFixed });
    }, [initialFixed]);

    // Update editable text when selectedText changes
    useEffect(() => {
        dispatch({ type: 'SET_SELECTED_TEXT', payload: selectedText });
        dispatch({ type: 'SET_EDITABLE_TEXT', payload: selectedText });
    }, [selectedText]);

    // Detect source language whenever text changes
    useEffect(() => {
        const text = (state.text.editable || state.text.selected || '').trim();
        const hasCJK = /[\u4e00-\u9fff]/.test(text);
        const detected: 'zh' | 'en' = hasCJK ? 'zh' : 'en';
        dispatch({ type: 'SET_SOURCE_LANG', payload: detected });

        // If user hasn't explicitly changed target, pick the opposite language as default
        if (!state.language.userPickedTarget) {
            dispatch({ type: 'SET_TARGET_LANG', payload: detected === 'zh' ? 'en' : 'zh' });
        }
    }, [state.text.editable, state.text.selected, state.language.userPickedTarget]);

    return { state, dispatch };
}
