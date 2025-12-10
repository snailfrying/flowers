/**
 * Markdown utility functions
 * Shared utilities for processing markdown output from LLMs
 */

/**
 * Strip markdown code block wrapper from LLM output
 * Handles both ```markdown and plain ``` wrappers
 * 
 * @param text - Raw text from LLM that may contain markdown wrapper
 * @returns Cleaned text without markdown wrapper
 * 
 * @example
 * stripMarkdownWrapper('```markdown\nHello\n```') // 'Hello'
 * stripMarkdownWrapper('```\nWorld\n```') // 'World'
 * stripMarkdownWrapper('Plain text') // 'Plain text'
 */
export function stripMarkdownWrapper(text: string): string {
    const trimmed = text.trim();

    // Try to match ```markdown wrapper first
    const markdownBlockRegex = /^```markdown\s*([\s\S]*?)\s*```$/;
    const markdownMatch = trimmed.match(markdownBlockRegex);
    if (markdownMatch) {
        return markdownMatch[1].trim();
    }

    // Try to match plain ``` wrapper for multi-line content
    const codeBlockRegex = /^```\s*([\s\S]*?)\s*```$/;
    const codeMatch = trimmed.match(codeBlockRegex);
    if (codeMatch && trimmed.split('\n').length > 3) {
        return codeMatch[1].trim();
    }

    // No wrapper found, return as-is
    return trimmed;
}

/**
 * Check if text contains markdown code block wrapper
 */
export function hasMarkdownWrapper(text: string): boolean {
    const trimmed = text.trim();
    return /^```(markdown)?\s*[\s\S]*?\s*```$/.test(trimmed);
}

/**
 * Ensure text has markdown wrapper (add if missing)
 */
export function ensureMarkdownWrapper(text: string, lang = 'markdown'): string {
    if (hasMarkdownWrapper(text)) {
        return text;
    }
    return `\`\`\`${lang}\n${text}\n\`\`\``;
}
