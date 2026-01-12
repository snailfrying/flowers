import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../../styles/globals.css';
import { SelectionPopover } from '../../components/popover/SelectionPopover';
import { ToastProvider } from '../../components/common/Toaster';
import { RouterProvider } from '../../shared/router';
import i18n from '../../shared/i18n/i18n';
import { I18nextProvider } from 'react-i18next';

// @ts-ignore
const chrome = window.chrome;

// Configure worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome?.runtime?.getURL ? chrome.runtime.getURL('pdf.worker.min.js') : '/pdf.worker.min.js';

// Type for popup state
type PopupState = {
    text: string;
    position: { x: number; y: number };
    visible: boolean;
    isFixed: boolean;
} | null;

const PDFViewer: React.FC = () => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [scale, setScale] = useState(1.5);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<number[]>([]);

    // Popover State with Fixed support
    const [popoverState, setPopoverState] = useState<PopupState>(null);

    // Drag state
    const popoverRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

    // Load PDF
    useEffect(() => {
        const loadPDF = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const fileUrl = urlParams.get('file');
                if (!fileUrl) {
                    console.log('No file specified');
                    return;
                }
                const loadingTask = pdfjsLib.getDocument(fileUrl);
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
                setPages(pageNumbers);
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };
        loadPDF();
    }, []);

    // Handle text selection
    useEffect(() => {
        let lastShowTime = 0;
        const MIN_CHARS = 2;

        const handleMouseUp = (e: MouseEvent) => {
            // Check if clicked inside popover
            const target = e.target as HTMLElement;
            if (target.closest('#chroma-popover') || target.closest('[data-popover-container]')) {
                return;
            }

            setTimeout(() => {
                const selection = window.getSelection();
                const text = selection?.toString().trim() || '';

                if (text.length >= MIN_CHARS && selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    lastShowTime = Date.now();
                    setPopoverState({
                        text: text,
                        position: { x: rect.left, y: rect.bottom + 10 },
                        visible: true,
                        isFixed: false
                    });
                } else if (!popoverState?.isFixed) {
                    // Only hide if not fixed and some time has passed
                    const timeSinceShow = Date.now() - lastShowTime;
                    if (timeSinceShow > 200) {
                        setPopoverState(null);
                    }
                }
            }, 50);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [popoverState?.isFixed]);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (popoverRef.current && popoverState) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setPopoverState({
                    ...popoverState,
                    position: {
                        x: dragStartRef.current.left + dx,
                        y: dragStartRef.current.top + dy
                    },
                    isFixed: true // Auto-fix when dragged
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, popoverState]);

    // Close on scroll if not fixed
    useEffect(() => {
        const handleScroll = () => {
            if (popoverState && !popoverState.isFixed) {
                setPopoverState(null);
            }
        };
        const container = containerRef.current;
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [popoverState]);

    const handleClose = () => {
        setPopoverState(null);
    };

    const handleFixed = (fixed: boolean) => {
        if (popoverState) {
            setPopoverState({ ...popoverState, isFixed: fixed });
        }
    };

    const startDrag = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (popoverRef.current && popoverState) {
            setIsDragging(true);
            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                left: popoverState.position.x,
                top: popoverState.position.y
            };
            e.preventDefault();
        }
    };

    return (
        <I18nextProvider i18n={i18n}>
            <RouterProvider>
                <ToastProvider>
                    <div className="pdf-viewer-root">
                        <div className="pdf-toolbar">
                            <span>Flowers PDF Reader</span>
                            <button onClick={() => setScale(s => s + 0.1)}>+</button>
                            <span>{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => s - 0.1)}>-</button>
                        </div>
                        <div className="pdf-container" ref={containerRef}>
                            <div className="pages-stack">
                                {pdfDoc && pages.map(pageNum => (
                                    <PDFPage key={pageNum} pdf={pdfDoc} pageNumber={pageNum} scale={scale} />
                                ))}
                            </div>
                        </div>

                        {popoverState && popoverState.visible && (
                            <div
                                ref={popoverRef}
                                data-popover-container="true"
                                style={{
                                    position: 'fixed',
                                    left: `${popoverState.position.x}px`,
                                    top: `${popoverState.position.y}px`,
                                    zIndex: 2147483647,
                                    cursor: isDragging ? 'grabbing' : 'auto'
                                }}
                                onMouseDown={popoverState.isFixed ? undefined : startDrag}
                            >
                                {/* Draggable header when not fixed */}
                                <div
                                    data-draggable="true"
                                    onMouseDown={startDrag}
                                    style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 80,
                                        height: 40,
                                        cursor: 'grab',
                                        zIndex: 1
                                    }}
                                />
                                <SelectionPopover
                                    selectedText={popoverState.text}
                                    sourceUrl={window.location.href}
                                    position={popoverState.position}
                                    onClose={handleClose}
                                    onFixed={handleFixed}
                                />
                            </div>
                        )}
                    </div>
                </ToastProvider>
            </RouterProvider>
        </I18nextProvider>
    );
};

const PDFPage: React.FC<{ pdf: any, pageNumber: number, scale: number }> = ({ pdf, pageNumber, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const renderPage = async () => {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas?.getContext('2d');
            if (canvas && context && wrapperRef.current) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                wrapperRef.current.style.width = `${viewport.width}px`;
                wrapperRef.current.style.height = `${viewport.height}px`;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;

                if (textLayerRef.current) {
                    textLayerRef.current.innerHTML = '';
                    textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);
                    const textContent = await page.getTextContent();
                    // @ts-ignore
                    pdfjsLib.renderTextLayer({
                        textContentSource: textContent,
                        container: textLayerRef.current,
                        viewport: viewport,
                        textDivs: []
                    });
                }
            }
        };

        renderPage();
    }, [pdf, pageNumber, scale]);

    return (
        <div className="page-wrapper" ref={wrapperRef}>
            <canvas ref={canvasRef} />
            <div className="textLayer" ref={textLayerRef}></div>
        </div>
    );
};

const root = createRoot(document.getElementById('app')!);
root.render(<PDFViewer />);
