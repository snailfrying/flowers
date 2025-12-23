import { VideoSubtitleDetector, VideoSubtitleInfo } from './VideoSubtitleDetector';
import { SubtitleExtractor } from './SubtitleExtractor';
import { SubtitleTranslator } from './SubtitleTranslator';
import { SubtitleOverlayRenderer } from './SubtitleOverlayRenderer';
import { SubtitleToggleButton } from './SubtitleToggleButton';

export class VideoSubtitleTranslationManager {
    private detector = new VideoSubtitleDetector();
    private extractor = new SubtitleExtractor();
    private activeSessions: Map<HTMLVideoElement, {
        translator: SubtitleTranslator;
        renderer: SubtitleOverlayRenderer;
        cleanup: () => void;
        toggleButton: SubtitleToggleButton;
    }> = new Map();

    private checkInterval: number | null = null;
    private targetLang = 'zh';

    init() {
        console.log('[Chroma] Video Subtitle Translation Manager initialized');
        this.loadSettings();
        // Periodically check for new videos
        this.checkVideos();
        this.checkInterval = window.setInterval(() => this.checkVideos(), 2000);
    }

    private async loadSettings() {
        try {
            // @ts-ignore
            const data = await chrome.storage.local.get('chroma-notes-settings');
            if (data && data['chroma-notes-settings']) {
                this.updateSettings(data['chroma-notes-settings']);
            }
        } catch (e) {
            console.error('[Chroma] Failed to load settings for video translation', e);
        }

        // Listen for changes
        // @ts-ignore
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes['chroma-notes-settings']) {
                this.updateSettings(changes['chroma-notes-settings'].newValue);
            }
        });
    }

    private updateSettings(raw: any) {
        if (!raw) return;
        let settings = raw;
        if (typeof settings === 'string') {
            try {
                settings = JSON.parse(settings);
            } catch { return; }
        }
        if (settings.state) settings = settings.state;

        if (settings.language && settings.language !== this.targetLang) {
            console.log('[Chroma] Video translation language changed to:', settings.language);
            this.targetLang = settings.language;
            // Update active sessions
            this.activeSessions.forEach(session => {
                if (session.translator) {
                    session.translator.setTargetLang(this.targetLang);
                }
            });
        }
    }

    dispose() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.activeSessions.forEach(session => {
            session.renderer.dispose();
            session.cleanup();
            session.toggleButton.dispose();
        });
        this.activeSessions.clear();
    }

    private checkVideos() {
        const videos = this.detector.detect();

        videos.forEach(info => {
            // If we already manage this video, skip
            if (this.activeSessions.has(info.video)) return;

            // If no subtitle source, skip
            if (info.subtitleSource === 'none') return;

            console.log('[Chroma] Found video with subtitles:', info);
            this.setupVideoInterface(info);
        });

        // Cleanup sessions for removed videos
        this.activeSessions.forEach((session, video) => {
            if (!video.isConnected) {
                console.log('[Chroma] Video removed, cleaning up session');
                session.renderer.dispose();
                session.cleanup();
                session.toggleButton.dispose();
                this.activeSessions.delete(video);
            }
        });
    }

    private setupVideoInterface(info: VideoSubtitleInfo) {
        // Create the toggle button first
        const toggleButton = new SubtitleToggleButton(
            info.video,
            info.platform || 'generic',
            (enabled) => {
                if (enabled) {
                    this.startTranslationSession(info);
                } else {
                    this.stopTranslationSession(info.video);
                }
            }
        );
        toggleButton.mount();

        // Store session with minimal state (translator/renderer created on demand or kept?)
        // To avoid re-creating translator (and losing cache), let's keep them but inactive?
        // Or just create them when enabled. Creating when enabled is cleaner for resources.
        // But we need to store the button to dispose it.

        // We'll use a placeholder in the map and update it when session starts
        this.activeSessions.set(info.video, {
            translator: null as any, // Will be created on enable
            renderer: null as any,
            cleanup: () => { },
            toggleButton
        });
    }

    private startTranslationSession(info: VideoSubtitleInfo) {
        const session = this.activeSessions.get(info.video);
        if (!session) return;

        console.log('[Chroma] Starting translation session for video');

        // Initialize components if not already
        const translator = new SubtitleTranslator(this.targetLang); // Use current setting
        const renderer = new SubtitleOverlayRenderer(info.video);
        renderer.init();

        let cleanupExtractor: () => void = () => { };

        if (info.subtitleSource === 'track' && info.track) {
            cleanupExtractor = this.extractor.extractFromTrack(info.track, async (cue) => {
                const translated = await translator.addSubtitle(cue);
                renderer.updateTranslation(cue, translated);
            });
        } else if (info.subtitleSource === 'dom' && info.domContainer) {
            cleanupExtractor = this.extractor.extractFromDOM(info.domContainer, info.video, async (cue) => {
                const translated = await translator.addSubtitle(cue);
                renderer.updateTranslation(cue, translated);
            });
        }

        // Update session
        session.translator = translator;
        session.renderer = renderer;
        session.cleanup = cleanupExtractor;
    }

    private stopTranslationSession(video: HTMLVideoElement) {
        const session = this.activeSessions.get(video);
        if (!session) return;

        console.log('[Chroma] Stopping translation session for video');

        // Cleanup extraction and rendering
        session.cleanup();
        if (session.renderer) {
            session.renderer.dispose();
        }

        // Reset session state but keep button
        session.translator = null as any;
        session.renderer = null as any;
        session.cleanup = () => { };
    }
}

