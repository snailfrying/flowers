
export interface VideoSubtitleInfo {
    video: HTMLVideoElement;
    subtitleSource: 'track' | 'dom' | 'none';
    track?: TextTrack;
    domContainer?: HTMLElement;
    platform?: 'youtube' | 'netflix' | 'generic';
}

export class VideoSubtitleDetector {
    detect(): VideoSubtitleInfo[] {
        const videos = document.querySelectorAll('video');
        const results: VideoSubtitleInfo[] = [];

        videos.forEach(video => {
            const info: VideoSubtitleInfo = {
                video,
                subtitleSource: 'none',
                platform: this.detectPlatform()
            };

            // Check for tracks
            const activeTrack = this.findActiveTrack(video);
            if (activeTrack) {
                info.subtitleSource = 'track';
                info.track = activeTrack;
            } else if (info.platform === 'youtube') {
                // YouTube DOM detection
                const container = this.findYouTubeSubtitleContainer();
                if (container) {
                    info.subtitleSource = 'dom';
                    info.domContainer = container;
                }
            }

            results.push(info);
        });

        return results;
    }

    private detectPlatform(): 'youtube' | 'netflix' | 'generic' {
        const host = window.location.hostname;
        if (host.includes('youtube.com')) return 'youtube';
        if (host.includes('netflix.com')) return 'netflix';
        return 'generic';
    }

    private findActiveTrack(video: HTMLVideoElement): TextTrack | undefined {
        // Prefer showing tracks, then hidden tracks (which are active but not visible)
        // We ignore disabled tracks for now unless we want to force enable them
        for (let i = 0; i < video.textTracks.length; i++) {
            const track = video.textTracks[i];
            if (track.kind === 'subtitles' || track.kind === 'captions') {
                if (track.mode === 'showing' || track.mode === 'hidden') {
                    return track;
                }
            }
        }

        // If no active track, check if there are any subtitles we can enable
        // This is a policy decision: do we auto-enable the first subtitle track?
        // For now, let's just return undefined if none are active
        return undefined;
    }

    private findYouTubeSubtitleContainer(): HTMLElement | undefined {
        // Common YouTube caption containers
        const selectors = [
            '.ytp-caption-window-container',
            '.caption-window',
            '#ytp-caption-window-container'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el as HTMLElement;
        }
        return undefined;
    }
}
