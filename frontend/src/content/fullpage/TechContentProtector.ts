export class TechContentProtector {
    private placeholders = new Map<string, string>();
    private counter = 0;

    /**
     * Protect technical content (e.g. inline code) by replacing it with placeholders
     */
    public protect(text: string): string {
        // 1. Protect inline code `code`
        let protectedText = text.replace(/`([^`]+)`/g, (match) => {
            const id = `__FLOWERS_TECH_${this.counter++}__`;
            this.placeholders.set(id, match);
            return id;
        });

        // 2. Protect LaTeX formulas if any (e.g. $...$ or $$...$$)
        protectedText = protectedText.replace(/\$\$?([\s\S]+?)\$\$?/g, (match) => {
            const id = `__FLOWERS_TECH_${this.counter++}__`;
            this.placeholders.set(id, match);
            return id;
        });

        return protectedText;
    }

    /**
     * Restore technical content from placeholders
     */
    public restore(translatedText: string): string {
        let result = translatedText;
        this.placeholders.forEach((original, id) => {
            // Use split/join to replace all occurrences without regex escaping issues
            result = result.split(id).join(original);
        });
        return result;
    }

    public clear() {
        this.placeholders.clear();
        this.counter = 0;
    }
}
