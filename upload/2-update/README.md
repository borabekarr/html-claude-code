# 2-update: Update an existing component page

30 files. Upload all of them in one batch, choose **Update an existing component page** in Claude Design, paste the prompt below.

## Prompt

```
Update the existing component page named in each file's @dsCard subtitle, using the attached files as the only source of truth.
- Where an attached file and the current page differ, the attached file wins. Do not blend.
- Keep only parts of the current page that have no counterpart in the attached files, and list them at the end so I can remove them.
- Markup, class names, and every CSS value come verbatim from the files. No re-tokenizing, no rounding, no font or color swaps.
- Keep animations, durations and easings exactly as in preview/_motion-tokens.css.
- Do not touch any other component or the token pages.
- If anything cannot be kept exactly, stop and list it instead of substituting.
```

## Files

| file | target page |
|---|---|
| `kbd.dc.html` | Pills, chips & badges |
| `notification-badge.dc.html` | Pills, chips & badges |
| `save-toggle-button.dc.html` | Buttons |
| `book-a-call-button.dc.html` | Buttons |
| `cardwithimage.dc.html` | Cards |
| `image-card.dc.html` | Cards |
| `3d-holo-card.dc.html` | Cards |
| `ai-chat-attachments.dc.html` | Cards |
| `ai-chat-action-plan.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-checkpoint.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-confirmation.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-context.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-message.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-plan.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-queue-input.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-reasoning.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-task.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-text-shimmer.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-typing-animation.dc.html` | AI Message Box / AI Caveat |
| `ai-chatbox-and-suggestions.dc.html` | AI Message Box / AI Caveat |
| `passwordstrength.dc.html` | Controls |
| `progressive-input-stack.dc.html` | Controls |
| `listrownav.dc.html` | Controls |
| `page-shimmer-skeleton.dc.html` | Animations Registry |
| `page-side-by-side-animation.dc.html` | Animations Registry |
| `panel-reveal-animation.dc.html` | Animations Registry |
| `phone-scroll-animation.dc.html` | Animations Registry |
| `slideuptext.dc.html` | Animations Registry |
| `receipt-printer.dc.html` | Animations Registry |
| `highlighted-text.dc.html` | Foundations: Type Display |
