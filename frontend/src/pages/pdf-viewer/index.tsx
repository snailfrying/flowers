import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
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

/**
 * Normalize PDF URLs from various sources to raw/downloadable URLs
 */
function normalizePdfUrl(url: string): string {
    try {
        // GitHub blob → raw
        if (url.includes('github.com') && url.includes('/blob/')) {
            return url
                .replace('github.com', 'raw.githubusercontent.com')
                .replace('/blob/', '/');
        }
        // GitLab blob → raw
        if (url.includes('gitlab.com') && url.includes('/-/blob/')) {
            return url.replace('/-/blob/', '/-/raw/');
        }
        // Bitbucket src → raw
        if (url.includes('bitbucket.org') && url.includes('/src/')) {
            return url.replace('/src/', '/raw/');
        }
        return url;
    } catch {
        return url;
    }
}

/**
 * Extract user-friendly error message
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes('Missing PDF')) {
            return 'Invalid PDF file or URL';
        }
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            return 'Network error: Unable to load PDF. The file may be blocked by CORS policy.';
        }
        return error.message;
    }
    if (typeof error === 'object' && error !== null) {
        const e = error as { message?: string; name?: string };
        return e.message || e.name || 'Unknown error loading PDF';
    }
    return String(error) || 'Unknown error';
}

// Type for popup state
type PopupState = {
    text: string;
    position: { x: number; y: number };
    visible: boolean;
    isFixed: boolean;
} | null;

// Loading states
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// Cache for page dimensions to avoid re-fetching
const pageDimensionsCache = new Map<string, { width: number; height: number }>();

const PDFViewer: React.FC = () => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [scale, setScale] = useState(1.5);
    const containerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [loadingState, setLoadingState] = useState<LoadingState>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [originalUrl, setOriginalUrl] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    // Track which pages are visible for lazy loading
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));

    // Popover State with Fixed support
    const [popoverState, setPopoverState] = useState<PopupState>(null);

    // Drag state
    const popoverRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

    // Generate page numbers array - memoized
    const pages = useMemo(() =>
        Array.from({ length: numPages }, (_, i) => i + 1),
        [numPages]
    );

    // Load PDF
    const loadPDF = useCallback(async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const fileUrl = urlParams.get('file');
            if (!fileUrl) {
                setLoadingState('error');
                setErrorMessage('No PDF file specified in URL');
                return;
            }

            setOriginalUrl(fileUrl);
            setLoadingState('loading');
            setErrorMessage('');

            // Clear dimension cache for new document
            pageDimensionsCache.clear();

            // Normalize URL for GitHub/GitLab etc.
            const normalizedUrl = normalizePdfUrl(fileUrl);
            console.log('[PDF Viewer] Loading:', { original: fileUrl, normalized: normalizedUrl });

            const loadingTask = pdfjsLib.getDocument({
                url: normalizedUrl,
                disableRange: false,
                disableStream: false,
            });

            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setVisiblePages(new Set([1, 2, 3]));
            setLoadingState('loaded');
        } catch (error) {
            console.error('Error loading PDF:', error);
            setLoadingState('error');
            setErrorMessage(getErrorMessage(error));
        }
    }, []);

    useEffect(() => {
        loadPDF();
    }, [loadPDF]);

    // Handle text selection - throttled
    useEffect(() => {
        let lastShowTime = 0;
        const MIN_CHARS = 2;

        const handleMouseUp = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Bridge for UI interactions (clicking buttons, dropdowns etc)
            const isUIInteracting = (window as any).__CHROMA_UI_INTERACTING;

            if (
                isUIInteracting ||
                target.closest('#chroma-popover') ||
                target.closest('[data-popover-container]') ||
                target.closest('[data-radix-portal]') ||
                target.closest('[data-radix-select-viewport]') ||
                target.classList.contains('radix-portal')
            ) {
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
                } else if (popoverState && !popoverState.isFixed) {
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

                // Only trigger if moved enough (3px) to prevent accidental clicks
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    setIsDragging(true);
                    setPopoverState({
                        ...popoverState,
                        position: {
                            x: dragStartRef.current.left + dx,
                            y: dragStartRef.current.top + dy
                        }
                        // Manual pinning only: do not set isFixed: true here
                    });
                }
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

    // Track visible pages using IntersectionObserver - OPTIMIZED
    // Key fix: don't include visiblePages in deps to avoid recreating observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !pdfDoc) return;

        const observer = new IntersectionObserver(
            (entries) => {
                setVisiblePages(prev => {
                    const next = new Set(prev);
                    let changed = false;

                    entries.forEach(entry => {
                        const pageNum = parseInt(entry.target.getAttribute('data-page') || '0', 10);
                        if (pageNum <= 0) return;

                        if (entry.isIntersecting) {
                            // Add this page and neighbors for preloading
                            [pageNum - 1, pageNum, pageNum + 1].forEach(p => {
                                if (p >= 1 && p <= numPages && !next.has(p)) {
                                    next.add(p);
                                    changed = true;
                                }
                            });

                            // Update current page indicator
                            if (entry.intersectionRatio > 0.5) {
                                setCurrentPage(pageNum);
                                setPageInput(String(pageNum));
                            }
                        }
                    });

                    // Only return new Set if actually changed - prevents unnecessary re-renders
                    return changed ? next : prev;
                });
            },
            {
                root: container,
                rootMargin: '300px 0px',
                threshold: [0, 0.5]
            }
        );

        // Observe after a small delay to let DOM settle
        requestAnimationFrame(() => {
            const placeholders = container.querySelectorAll('.page-placeholder');
            placeholders.forEach(p => observer.observe(p));
        });

        return () => observer.disconnect();
    }, [pdfDoc, numPages]); // Removed visiblePages dependency

    const handleClose = useCallback(() => {
        setPopoverState(null);
    }, []);

    const handleFixed = useCallback((fixed: boolean) => {
        setPopoverState(prev => prev ? { ...prev, isFixed: fixed } : null);
    }, []);

    const startDrag = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-radix-portal]')) {
            return;
        }

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
    }, [popoverState]);

    // Toolbar actions - memoized
    const handleDownload = useCallback(() => {
        if (originalUrl) {
            const normalizedUrl = normalizePdfUrl(originalUrl);
            const link = document.createElement('a');
            link.href = normalizedUrl;
            link.download = originalUrl.split('/').pop() || 'document.pdf';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [originalUrl]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleFullscreen = useCallback(() => {
        if (rootRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                rootRef.current.requestFullscreen();
            }
        }
    }, []);

    const handlePageInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const page = parseInt(pageInput, 10);
            if (page >= 1 && page <= numPages) {
                goToPage(page);
            } else {
                setPageInput(String(currentPage));
            }
        }
    }, [pageInput, numPages, currentPage]);

    const goToPage = useCallback((page: number) => {
        const container = containerRef.current;
        if (!container) return;
        const placeholder = container.querySelector(`[data-page="${page}"]`);
        if (placeholder) {
            placeholder.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentPage(page);
            setPageInput(String(page));
            setVisiblePages(prev => {
                const next = new Set(prev);
                [page - 1, page, page + 1].forEach(p => {
                    if (p >= 1 && p <= numPages) next.add(p);
                });
                return next;
            });
        }
    }, [numPages]);

    const handleZoom = useCallback((delta: number) => {
        setScale(s => Math.max(0.5, Math.min(3, s + delta)));
    }, []);

    const handleFitWidth = useCallback(() => {
        const container = containerRef.current;
        if (container && pdfDoc) {
            const containerWidth = container.clientWidth - 40;
            const newScale = containerWidth / 612;
            setScale(Math.max(0.5, Math.min(3, newScale)));
        }
    }, [pdfDoc]);

    const toggleDarkMode = useCallback(() => {
        setDarkMode(d => !d);
        document.documentElement.classList.toggle('dark-mode');
    }, []);

    // Loading state
    if (loadingState === 'loading') {
        return (
            <I18nextProvider i18n={i18n}>
                <div className={`pdf-viewer-root ${darkMode ? 'dark-mode' : ''}`} ref={rootRef}>
                    <div className="pdf-toolbar">
                        <span className="toolbar-title">Flowers PDF Reader</span>
                    </div>
                    <div className="pdf-container">
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <span>Loading PDF...</span>
                        </div>
                    </div>
                </div>
            </I18nextProvider>
        );
    }

    // Error state
    if (loadingState === 'error') {
        return (
            <I18nextProvider i18n={i18n}>
                <div className={`pdf-viewer-root ${darkMode ? 'dark-mode' : ''}`} ref={rootRef}>
                    <div className="pdf-toolbar">
                        <span className="toolbar-title">Flowers PDF Reader</span>
                    </div>
                    <div className="pdf-container">
                        <div className="error-container">
                            <div className="error-icon">📄❌</div>
                            <div className="error-message">{errorMessage}</div>
                            {originalUrl && (
                                <div className="error-details">URL: {originalUrl}</div>
                            )}
                            <button className="retry-btn" onClick={loadPDF}>
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </I18nextProvider>
        );
    }

    return (
        <I18nextProvider i18n={i18n}>
            <RouterProvider>
                <ToastProvider>
                    <div className={`pdf-viewer-root ${darkMode ? 'dark-mode' : ''}`} ref={rootRef}>
                        <div className="pdf-toolbar">
                            <span className="toolbar-title">Flowers PDF Reader</span>
                            <div className="toolbar-divider"></div>

                            {/* Page Navigation */}
                            <div className="toolbar-group">
                                <button
                                    className="toolbar-btn"
                                    onClick={() => goToPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage <= 1}
                                    title="Previous Page"
                                >
                                    ◀
                                </button>
                                <div className="page-input-group">
                                    <input
                                        type="text"
                                        className="page-input"
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.target.value)}
                                        onKeyDown={handlePageInput}
                                        onBlur={() => setPageInput(String(currentPage))}
                                    />
                                    <span>/ {numPages}</span>
                                </div>
                                <button
                                    className="toolbar-btn"
                                    onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
                                    disabled={currentPage >= numPages}
                                    title="Next Page"
                                >
                                    ▶
                                </button>
                            </div>

                            <div className="toolbar-divider"></div>

                            {/* Zoom Controls */}
                            <div className="toolbar-group">
                                <button className="toolbar-btn" onClick={() => handleZoom(-0.1)} title="Zoom Out">
                                    −
                                </button>
                                <span className="zoom-display">{Math.round(scale * 100)}%</span>
                                <button className="toolbar-btn" onClick={() => handleZoom(0.1)} title="Zoom In">
                                    +
                                </button>
                                <button className="toolbar-btn" onClick={handleFitWidth} title="Fit Width">
                                    ↔
                                </button>
                            </div>

                            <div className="toolbar-spacer"></div>

                            {/* Actions */}
                            <div className="toolbar-group">
                                <button
                                    className="toolbar-btn"
                                    onClick={() => setShowSearch(s => !s)}
                                    title="Search"
                                >
                                    🔍
                                </button>
                                <button className="toolbar-btn" onClick={handleDownload} title="Download">
                                    ⬇
                                </button>
                                <button className="toolbar-btn" onClick={handlePrint} title="Print">
                                    🖨
                                </button>
                                <button className="toolbar-btn" onClick={handleFullscreen} title="Fullscreen">
                                    ⛶
                                </button>
                                <button
                                    className={`toolbar-btn ${darkMode ? 'active' : ''}`}
                                    onClick={toggleDarkMode}
                                    title="Dark Mode"
                                >
                                    🌙
                                </button>
                            </div>
                        </div>

                        {showSearch && (
                            <div className="search-panel">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search in document..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                <button className="toolbar-btn" onClick={() => setShowSearch(false)}>
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="pdf-container" ref={containerRef}>
                            <div className="pages-stack">
                                {pdfDoc && pages.map(pageNum => (
                                    <PagePlaceholder
                                        key={pageNum}
                                        pageNumber={pageNum}
                                        pdf={pdfDoc}
                                        scale={scale}
                                        isVisible={visiblePages.has(pageNum)}
                                    />
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
                                    zIndex: 1000000,
                                    cursor: isDragging ? 'grabbing' : 'auto'
                                }}
                            >
                                <div
                                    data-draggable="true"
                                    onMouseDown={startDrag}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: '80px',
                                        height: '40px',
                                        cursor: 'grab',
                                        zIndex: 10
                                    }}
                                />
                                <SelectionPopover
                                    selectedText={popoverState.text}
                                    sourceUrl={window.location.href}
                                    position={popoverState.position}
                                    onClose={handleClose}
                                    onFixed={handleFixed}
                                    isFixed={popoverState.isFixed}
                                />
                            </div>
                        )}
                    </div>
                </ToastProvider>
            </RouterProvider>
        </I18nextProvider>
    );
};

/**
 * Page placeholder - MEMOIZED to prevent unnecessary re-renders
 * Only re-renders when props actually change
 */
const PagePlaceholder = memo<{
    pageNumber: number;
    pdf: any;
    scale: number;
    isVisible: boolean;
}>(({ pageNumber, pdf, scale, isVisible }) => {
    // Cache key for dimensions
    const cacheKey = `${pdf.fingerprints?.[0] || 'pdf'}-${pageNumber}`;
    const cached = pageDimensionsCache.get(cacheKey);

    const [dimensions, setDimensions] = useState({
        width: cached ? cached.width * scale : 612 * scale,
        height: cached ? cached.height * scale : 792 * scale
    });

    // Get page dimensions once and cache
    useEffect(() => {
        if (cached) {
            setDimensions({
                width: cached.width * scale,
                height: cached.height * scale
            });
            return;
        }

        pdf.getPage(pageNumber).then((page: any) => {
            const viewport = page.getViewport({ scale: 1 });
            pageDimensionsCache.set(cacheKey, {
                width: viewport.width,
                height: viewport.height
            });
            setDimensions({
                width: viewport.width * scale,
                height: viewport.height * scale
            });
        });
    }, [pdf, pageNumber, scale, cacheKey, cached]);

    return (
        <div
            className="page-placeholder"
            data-page={pageNumber}
            style={{
                width: dimensions.width,
                height: dimensions.height,
                marginBottom: 20,
                background: isVisible ? 'transparent' : '#e0e0e0',
            }}
        >
            {isVisible ? (
                <PDFPage pdf={pdf} pageNumber={pageNumber} scale={scale} />
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999',
                    fontSize: 14
                }}>
                    Page {pageNumber}
                </div>
            )}
        </div>
    );
});

PagePlaceholder.displayName = 'PagePlaceholder';

/**
 * Actual PDF page renderer - MEMOIZED with render task management
 */
const PDFPage = memo<{ pdf: any; pageNumber: number; scale: number }>(({ pdf, pageNumber, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const isRenderingRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            // Prevent concurrent renders
            if (isRenderingRef.current) {
                return;
            }

            // Cancel any ongoing render
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // Ignore cancel errors
                }
                renderTaskRef.current = null;
            }

            isRenderingRef.current = true;

            try {
                const page = await pdf.getPage(pageNumber);
                if (cancelled) {
                    isRenderingRef.current = false;
                    return;
                }

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas?.getContext('2d');

                if (canvas && context && wrapperRef.current) {
                    // Set dimensions
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    wrapperRef.current.style.width = `${viewport.width}px`;
                    wrapperRef.current.style.height = `${viewport.height}px`;

                    // Render canvas
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };

                    renderTaskRef.current = page.render(renderContext);

                    try {
                        await renderTaskRef.current.promise;
                    } catch (e: any) {
                        if (e?.name === 'RenderingCancelledException') {
                            isRenderingRef.current = false;
                            return;
                        }
                        throw e;
                    }

                    if (cancelled) {
                        isRenderingRef.current = false;
                        return;
                    }

                    // Render text layer
                    if (textLayerRef.current) {
                        textLayerRef.current.innerHTML = '';
                        textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);
                        const textContent = await page.getTextContent();
                        if (cancelled) {
                            isRenderingRef.current = false;
                            return;
                        }

                        // @ts-ignore
                        pdfjsLib.renderTextLayer({
                            textContentSource: textContent,
                            container: textLayerRef.current,
                            viewport: viewport,
                            textDivs: []
                        });
                    }
                }
            } catch (error: any) {
                if (error?.name === 'RenderingCancelledException') {
                    // Expected when cancelled
                } else {
                    console.error(`Error rendering page ${pageNumber}:`, error);
                }
            } finally {
                isRenderingRef.current = false;
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // Ignore
                }
            }
        };
    }, [pdf, pageNumber, scale]);

    return (
        <div className="page-wrapper" ref={wrapperRef}>
            <canvas ref={canvasRef} />
            <div className="textLayer" ref={textLayerRef}></div>
        </div>
    );
});

PDFPage.displayName = 'PDFPage';

const root = createRoot(document.getElementById('app')!);
root.render(<PDFViewer />);
