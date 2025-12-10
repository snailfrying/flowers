# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Flowers seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue
- Discuss the vulnerability publicly

### Please DO:

1. **Email us directly** at [snailfryiing@gmail.com](mailto:snailfryiing@gmail.com)
2. Include the following information:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - The location of the affected code (tag, branch, or commit hash)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will provide a detailed response within 7 days
- We will keep you informed of the progress towards fixing the vulnerability
- We will notify you when the vulnerability has been fixed

### Disclosure Policy

- We will credit you for the discovery if you wish
- We will not disclose your identity without your permission
- We will work with you to understand and resolve the issue quickly

## Security Best Practices

When using Flowers:

1. **Never commit API keys** - Always use `env.yaml` (not committed) or Chrome Storage
2. **Keep dependencies updated** - Regularly update npm packages
3. **Use HTTPS** - Ensure all API endpoints use HTTPS
4. **Review permissions** - Only grant necessary browser extension permissions
5. **Local-first** - Remember that data is stored locally in your browser

## Known Security Considerations

- API keys are stored in Chrome Storage (local to your browser)
- All data is stored locally in IndexedDB (no cloud sync by default)
- Extension requires network access for LLM API calls
- Content scripts run in page context (be aware of CSP restrictions)

Thank you for helping keep Flowers and our users safe!

