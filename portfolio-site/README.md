# Ronel Pilo Fernandez — Portfolio

A small interactive portfolio site. An animated chibi waits on the intro
screen; click the name and he walks up and offers a folder, click **OPEN**
and the portfolio "folder" flips open into pages you can page through.

**UI only** — no backend, database, or mailer. It's a static site.

## Run locally

Just open `index.html` in a browser, or serve the folder with any static
server, e.g.:

```bash
npx serve .
```

(The clips autoplay; sound plays on the "coming" clip after you click the name.)

## Structure

```
index.html                 the whole page + logic
content/css/portfolio.css  the intro stage, folder-flip reader, animations
content/css/nav.css        typography for the inner pages
content/media/waiting.mp4  looping idle clip
content/media/coming.mp4   "walks up and hands you the folder" clip
resume/Curriculum_Vitae.pdf  downloadable CV
```

## Deploy

Works as-is on GitHub Pages, Netlify, Vercel, or any static host — point it
at the repo root.
