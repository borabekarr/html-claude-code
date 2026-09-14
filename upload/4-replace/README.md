# 4-replace: Replace the entire component

7 files. Upload all of them in one batch, choose **Replace the entire component** in Claude Design, paste the prompt below.

## Prompt

```
Replace the existing component named in each file's @dsCard name entirely with the attached file. Delete your current version first; nothing from it survives.
- Rebuild from the HTML exactly as given: same markup, same class names, same text, same section order.
- Every CSS value comes verbatim from colors_and_type.css, styles.css and preview/**.css. Do not map to your own tokens, round values, or swap fonts, colors, radii or shadows.
- Keep animations, durations and easings exactly as in preview/_motion-tokens.css.
- Do not add variants, states, or documentation I did not supply.
- Do not touch any other component or the token pages.
- If anything cannot be kept exactly, stop and list it instead of substituting.
```

## Files

| file | target page |
|---|---|
| `bora-capsule-pills-and-cards.dc.html` | Pills, chips & badges |
| `shiny-pill.dc.html` | Pills, chips & badges |
| `shiny-badge.dc.html` | Pills, chips & badges |
| `ai-chat-inline-citation.dc.html` | Pills, chips & badges |
| `aimessageboxgeneral.dc.html` | AI Message Box |
| `aimessagebox2.dc.html` | AI Message Box |
| `texthighlighter.dc.html` | Foundations: Type Display |
