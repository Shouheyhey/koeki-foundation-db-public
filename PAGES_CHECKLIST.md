# GitHub Pages Checklist

## Settings

1. Open repository Settings.
2. Open Pages.
3. Set Source to `Deploy from a branch`.
4. Select Branch `main` and Folder `/ (root)`.
5. Save settings.

## Validation

1. Wait until the first deploy completes.
2. Open the published URL.
3. Confirm top page loads (`200`).
4. Confirm `data.json` loads in browser network tab (`200`).
5. Confirm filters and table rendering work.

## Troubleshooting

- If the page is blank, hard refresh browser cache.
- If `data.json` is `404`, verify file exists at repository root.
- If assets fail to load, verify `index.html` references `app.js` and `style.css` with relative paths.
