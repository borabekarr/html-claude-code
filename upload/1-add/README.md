# 1-add: Add a completely new component

22 files. Upload all of them in one batch, choose **Add a completely new component** in Claude Design, paste the prompt below.

## Prompt

```
Add each attached file as a NEW component on the page named in its @dsCard subtitle. Use the files verbatim.
- Create the component from the HTML exactly as given: same markup, same class names, same text.
- Take every style value from the attached CSS (colors_and_type.css, styles.css, preview/**.css). Do not map to your own tokens, round values, or swap fonts, colors, radii or shadows.
- Keep animations, durations and easings exactly as in preview/_motion-tokens.css.
- Do not add variants, states, or documentation I did not supply.
- Do not touch any other component or the token pages.
- If anything cannot be kept exactly, stop and list it instead of substituting.
```

## Files

| file | target page |
|---|---|
| `alertdialog.dc.html` | Overlays & popovers (new page) |
| `actionsheet.dc.html` | Overlays & popovers (new page) |
| `drawer-3.dc.html` | Overlays & popovers (new page) |
| `contextmenu.dc.html` | Overlays & popovers (new page) |
| `tippopover.dc.html` | Overlays & popovers (new page) |
| `newfeaturepopover.dc.html` | Overlays & popovers (new page) |
| `popoveroffercold.dc.html` | Overlays & popovers (new page) |
| `menudropdownanimation.dc.html` | Overlays & popovers (new page) |
| `modal-open-close-animation.dc.html` | Overlays & popovers (new page) |
| `tooltip-open-close-animation.dc.html` | Overlays & popovers (new page) |
| `show-qr.dc.html` | Overlays & popovers (new page) |
| `navigation.dc.html` | Navigation & layout (new page) |
| `bottomtoolbar.dc.html` | Navigation & layout (new page) |
| `left-side-pane.dc.html` | Navigation & layout (new page) |
| `give-feedback-left-pane.dc.html` | Navigation & layout (new page) |
| `topbanner.dc.html` | Navigation & layout (new page) |
| `herobanner2.dc.html` | Navigation & layout (new page) |
| `pricing.dc.html` | Marketing & pricing (new page) |
| `pricing-slider.dc.html` | Marketing & pricing (new page) |
| `payments-free-trial.dc.html` | Marketing & pricing (new page) |
| `how-it-works.dc.html` | Marketing & pricing (new page) |
| `web-preview.dc.html` | Marketing & pricing (new page) |
