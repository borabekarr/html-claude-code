# 3-append: Append to an existing component page

18 files. Upload all of them in one batch, choose **Append to an existing component page** in Claude Design, paste the prompt below.

## Prompt

```
Append each attached file to the existing page named in its @dsCard subtitle as a new section. Do not change anything already on that page.
- Add each file as its own section, in the order attached, titled with the @dsCard name.
- Use the markup, class names and CSS values verbatim from the files. No re-tokenizing, no rounding, no font or color swaps.
- Keep animations, durations and easings exactly as in preview/_motion-tokens.css.
- Do not deduplicate, merge, or reconcile the new sections with existing ones, even if they look similar.
- Do not touch any other component or the token pages.
- If anything cannot be kept exactly, stop and list it instead of substituting.
```

## Files

| file | target page |
|---|---|
| `glowing-badge.dc.html` | Pills, chips & badges |
| `family-receive-button.dc.html` | Buttons |
| `auth-card.dc.html` | Cards |
| `mainbox.dc.html` | Cards |
| `offerbox.dc.html` | Cards |
| `ai-chat-anonymous.dc.html` | AI Message Box / AI Caveat |
| `ai-chat-feedback-bar.dc.html` | AI Message Box / AI Caveat |
| `ask-user-questions.dc.html` | AI Message Box / AI Caveat |
| `chain-of-thought.dc.html` | AI Message Box / AI Caveat |
| `messagebubble.dc.html` | AI Message Box / AI Caveat |
| `messagecomposer.dc.html` | AI Message Box / AI Caveat |
| `accordion-3.dc.html` | Controls |
| `calendar-booking.dc.html` | Controls |
| `discrete-tabs.dc.html` | Controls |
| `filetree.dc.html` | Controls |
| `scrollbar.dc.html` | Controls |
| `slider.dc.html` | Controls |
| `table.dc.html` | Controls |
