
export interface SubtitleCue {
    text: string;
    startTime: number;
    endTime: number;
    id?: string;
}

export class SubtitleExtractor {
    extractFromTrack(
        track: TextTrack,
        onCueChange: (cue: SubtitleCue) => void
    ): () => void {
        // Ensure track is active so events fire
        // If it was 'disabled', we must set it to 'hidden' to get events without showing native UI
        // If it was 'showing', we keep it 'showing' (or maybe 'hidden' if we want to replace it completely?)
        // For Phase 1, let's assume we want to overlay, so we might want to hide the original if possible,
        // but 'showing' is safer to ensure we get events.
        // Let's just ensure it's not disabled.
        if (track.mode === 'disabled') {
            track.mode = 'hidden';
        }

        const handleCueChange = () => {
            const activeCues = track.activeCues;
            if (!activeCues || activeCues.length === 0) {
                return;
            }

            Array.from(activeCues).forEach((vtcCue: any) => {
                // vtcCue is VTTCue or TextTrackCue
                const cue: SubtitleCue = {
                    text: this.cleanSubtitleText(vtcCue.text || ''),
                    startTime: vtcCue.startTime,
                    endTime: vtcCue.endTime,
                    id: vtcCue.id
                };

                onCueChange(cue);
            });
        };

        track.addEventListener('cuechange', handleCueChange);

        // Return cleanup function
        return () => {
            track.removeEventListener('cuechange', handleCueChange);
        };
    }

    extractFromDOM(
        container: HTMLElement,
        video: HTMLVideoElement,
        onCueChange: (cue: SubtitleCue) => void
    ): () => void {
        let lastText = '';

        const extractText = (): string => {
            // YouTube specific: .caption-visual-line contains segments
            // We want to join them
            const lines = container.querySelectorAll('.caption-visual-line');
            if (lines.length > 0) {
                return Array.from(lines)
                    .map(line => line.textContent?.trim())
                    .filter(Boolean)
                    .join('\n');
            }

            // Fallback: just get text content of segments
            const segments = container.querySelectorAll('.ytp-caption-segment');
            if (segments.length > 0) {
                return Array.from(segments)
                    .map(seg => seg.textContent?.trim())
                    .filter(Boolean)
                    .join(' ');
            }

            return container.textContent?.trim() || '';
        };

        const observer = new MutationObserver(() => {
            const text = extractText();
            if (text && text !== lastText) {
                lastText = text;
                onCueChange({
                    text,
                    startTime: video.currentTime,
                    endTime: video.currentTime + 3 // Estimate duration since DOM doesn't give it
                });
            } else if (!text && lastText) {
                // Subtitle cleared
                lastText = '';
                // We might want to signal clearing, but onCueChange expects a cue.
                // For now, we just don't emit anything.
            }
        });

        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true
        });

        return () => {
            observer.disconnect();
        };
    }

    private cleanSubtitleText(text: string): string {
        // Remove HTML tags (WebVTT might have them)
        return text
            .replace(/<[^>]+>/g, '')
            .replace(/\n+/g, ' ')
            .trim();
    }
}
