# Resume Builder SaaS

A SaaS-ready resume builder built with Next.js. It includes a live resume editor, ATS score, template switching, CV upload import, browser PDF export, AI resume enhancement, and an AI CV Tailor workflow.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

Main routes:

- `/` - resume builder/editor and PDF export
- `/tailor` - AI CV Tailor & Enhancer

## AI Setup

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

The app calls:

- `/api/enhance` to improve summary and experience bullets
- `/api/tailor` to generate job-targeted CV content, ATS score, keyword analysis, suggestions, and cover letter draft
- `/api/import-cv` to extract text from PDF, DOCX, or TXT resumes

If `OPENAI_API_KEY` is missing, `/api/tailor` returns a clear setup error and safe fallback analysis instead of fabricating content.

## Testing

```powershell
npm.cmd run lint
npm.cmd run build
```

## Current Limitations

- No authentication or database persistence yet.
- "Apply to Resume" uses browser local storage to transfer tailored content into the editor.
- PDF export uses the browser print/save-as-PDF flow.
- AI suggestions are separated from verified resume content when information is missing.

## Deploy

Deploy to Vercel:

1. Push this repository to GitHub.
2. Go to Vercel and import the GitHub repo.
3. Add `OPENAI_API_KEY` in Vercel project environment variables.
4. Deploy.

The GitHub Pages version can stay as a static demo, but the SaaS version should run on Vercel because it needs an API route.
