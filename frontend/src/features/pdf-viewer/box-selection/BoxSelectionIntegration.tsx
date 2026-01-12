import React, { useEffect, useState, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SelectionOverlay } from './SelectionOverlay';
import { SelectionPopover } from '../../../components/popover/SelectionPopover';
import { ToastProvider } from '../../../components/common/Toaster';
import { RouterProvider } from '../../../shared/router';
import i18n from '../../../shared/i18n/i18n';
import { I18nextProvider } from 'react-i18next';
import { Rect } from './TextExtractor';

export interface BoxSelectionIntegrationProps {
    container: HTMLElement;
    enabled: boolean;
}

export const BoxSelectionWrapper: React.FC<BoxSelectionIntegrationProps> = ({ container, enabled }) => {
    const [popoverState, setPopoverState] = useState<{
        text: string;
        position: { x: number; y: number };
        visible: boolean;
    } | null>(null);

    const overlayRef = useRef<SelectionOverlay | null>(null);

    useEffect(() => {
        // Initialize Overlay
        const overlay = new SelectionOverlay(container);
        overlayRef.current = overlay;

        // Synchronize initial state
        overlay.setEnabled(enabled);

        overlay.onTranslate = (text: string, rect: Rect) => {
            const containerRect = container.getBoundingClientRect();
            // Ensure we have correct absolute coordinates considering scroll
            const absoluteX = containerRect.left + rect.left;
            const absoluteY = containerRect.top + rect.top + rect.height;

            setPopoverState({
                text,
                position: { x: absoluteX, y: absoluteY },
                visible: true
            });
        };

        return () => {
            overlay.destroy();
        };
    }, [container]);

    // Sync enabled state
    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.setEnabled(enabled);
        }
    }, [enabled]);

    const handleClose = () => {
        setPopoverState(prev => prev ? { ...prev, visible: false } : null);
    };

    if (!popoverState || !popoverState.visible) return null;

    return (
        <I18nextProvider i18n={i18n}>
            <RouterProvider>
                <ToastProvider>
                    <SelectionPopover
                        selectedText={popoverState.text}
                        sourceUrl={window.location.href}
                        position={popoverState.position}
                        onClose={handleClose}
                        onFixed={(fixed) => console.log('Fixed state changed:', fixed)}
                    />
                </ToastProvider>
            </RouterProvider>
        </I18nextProvider>
    );
};

// Deprecated or updated to support enabled param if needed, 
// but we will prefer using BoxSelectionWrapper directly in React.
export const mountBoxSelection = (container: HTMLElement, enabled: boolean = false) => {
    const rootDiv = document.createElement('div');
    rootDiv.id = 'flowers-box-selection-root';
    container.appendChild(rootDiv);

    const root: Root = createRoot(rootDiv);
    root.render(<BoxSelectionWrapper container={container} enabled={enabled} />);

    return {
        unmount: () => {
            root.unmount();
            rootDiv.remove();
        },
        setEnabled: (newEnabled: boolean) => {
            root.render(<BoxSelectionWrapper container={container} enabled={newEnabled} />);
        }
    };
};
