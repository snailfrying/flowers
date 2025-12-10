# Contributing to Flowers

First off, thank you for considering contributing to Flowers! It's people like you that make Flowers such a great tool.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm
- Git
- A code editor (VS Code recommended)

### Setting Up Development Environment

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/flowers.git
   cd flowers
   ```

2. **Install Dependencies**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure Environment**

   ```bash
   cp backend/env.yaml.example backend/env.yaml
   # Edit env.yaml with your API keys
   ```

4. **Start Development**

   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

---

## 🔄 Development Workflow

### Branch Strategy

- `main` - Stable production code
- `develop` - Integration branch for features
- `feat/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions/updates

### Workflow Steps

1. **Create a Branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test Locally**

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feat/your-feature-name
   ```

---

## 💻 Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** rules (run `npm run lint`)
- Use **Prettier** for formatting
- Prefer **functional components** in React
- Use **async/await** over promises

### Code Style

```typescript
// ✅ Good
export async function translateText(text: string, targetLang: string): Promise<string> {
  const result = await llmClient.translate({ text, targetLang });
  return result;
}

// ❌ Bad
export function translateText(text, targetLang) {
  return llmClient.translate({ text, targetLang }).then(result => result);
}
```

### React Components

```tsx
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)} onClick={onClick}>
      {label}
    </button>
  );
}

// ❌ Bad
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### File Naming

- **Components**: `PascalCase.tsx` (e.g., `NoteCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Hooks**: `use*.ts` (e.g., `useNotes.ts`)
- **Types**: `types.ts` or `*.types.ts`

---

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(chat): add streaming response support

Implement streaming for chat responses to improve UX.
Users can now see responses as they are generated.

Closes #123
```

```bash
fix(popover): correct width calculation on mobile

The popover was extending beyond viewport on small screens.
Changed max-width calculation to account for padding.
```

---

## 🔀 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commits follow conventional format
- [ ] Branch is up to date with `main`

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

### Review Process

1. **Automated Checks** - CI/CD runs tests and linting
2. **Code Review** - Maintainers review code
3. **Feedback** - Address review comments
4. **Approval** - At least one maintainer approval required
5. **Merge** - Squash and merge to main

---

## 📁 Project Structure

### Backend

```
backend/src/
├── agent/          # Workflow orchestration
├── services/       # Core services (LLM, RAG, prompts)
├── storage/        # Data persistence
├── config/         # Configuration
└── utils/          # Utilities
```

### Frontend

```
frontend/src/
├── components/     # React components
├── background/     # Service worker
├── content/        # Content scripts
├── sidepanel/      # Main workspace
└── shared/         # Shared code (API, store, hooks)
```

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { translateText } from './translate';

describe('translateText', () => {
  it('should translate English to Chinese', async () => {
    const result = await translateText('Hello', 'zh');
    expect(result).toBe('你好');
  });

  it('should handle empty input', async () => {
    const result = await translateText('', 'zh');
    expect(result).toBe('');
  });
});
```

---

## 📚 Documentation

### Code Comments

```typescript
/**
 * Translates text using the configured LLM
 * @param text - Text to translate
 * @param targetLang - Target language code (e.g., 'zh', 'en')
 * @returns Translated text
 * @throws {APIError} If translation fails
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Add examples for new APIs
- Update screenshots if UI changes

### Changelog

- Add entry to CHANGELOG.md
- Follow [Keep a Changelog](https://keepachangelog.com/) format

---

## 🐛 Reporting Bugs

### Before Reporting

- Check existing issues
- Try latest version
- Gather reproduction steps

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Extension Version: [e.g., 1.0.0]
```

---

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if feature already requested
2. Describe use case clearly
3. Explain why it's valuable
4. Provide examples if possible

---

## 📞 Getting Help

- **GitHub Discussions** - For questions and discussions
- **GitHub Issues** - For bugs and feature requests
- **Email** - For private inquiries

---

## 🙏 Thank You

Your contributions make Flowers better for everyone. We appreciate your time and effort!

---

<div align="center">

**Happy Coding! 🌸**

</div>
