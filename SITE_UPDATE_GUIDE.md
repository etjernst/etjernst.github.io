# Website Update Guide

This file is excluded from the Jekyll build (via `_config.yml`) and will NOT appear on your website.

---

## Site Overview

Your site is a Jekyll academic website (al-folio theme) hosted on GitHub Pages. When you push to `master`, GitHub Actions automatically builds and deploys.

### Key locations at a glance

| What                  | Where                          | How often you touch it |
|-----------------------|--------------------------------|------------------------|
| Publications / papers | `_bibliography/papers.bib`     | Frequently             |
| News announcements    | `_news/` (one `.md` per item)  | Frequently             |
| Bio / about page      | `_pages/about.md`              | Occasionally           |
| CV PDF                | `assets/pdf/`                  | Occasionally           |
| Paper PDFs            | `assets/pdf/`                  | When adding papers     |
| Preview images        | `assets/img/publication_preview/` | When adding papers  |
| Resources (for students) | `_resources/` (one `.md` per resource) | Occasionally    |
| Projects (field work) | `_projects/`                   | Rarely                 |
| Site settings         | `_config.yml`                  | Rarely                 |
| Co-author links       | `_data/coauthors.yml`          | Rarely                 |

---

## How to: Add or update a publication

1. **Open** `_bibliography/papers.bib`

2. **Add a BibTeX entry** in the appropriate section (working papers at the top, published articles under `%% Pubs %%`, etc.). Use this template:

   ```bibtex
   @unpublished{short_key,
       keywords = {working\_paper},
       title = {{Your} {Title} {Here}},
       author = {Last, First and Last, First and Tjernström, Emilia},
       year = {2026},
       month = {},
       howpublished = {Working paper},
       note = {Journal Name, R&R},
       pdf = {YourFile_2026.pdf},
       html = {https://link-to-paper},
       pre-reg = {https://registry-link},
       abstract = {Your abstract here.},
       preview = {preview_image.png}
   }
   ```

   For a published article, use `@article` instead and add `journal = {Journal Name}`:
   ```bibtex
   @article{short_key,
       keywords = {peer\_reviewed},
       title = {{Your} {Title} {Here}},
       author = {Last, First and Tjernström, Emilia},
       year = {2026},
       journal = {Journal of Whatever},
       pdf = {YourFile_2026.pdf},
       html = {https://doi.org/...},
       doi = {10.xxxx/xxxxx},
       abstract = {Your abstract here.}
   }
   ```

3. **Key fields explained:**
   - `keywords`: Controls which section it appears under. Use `{peer\_reviewed}`, `{working\_paper}`, `{policy\_brief}`, or `{other}`.
   - `@type`: `@article` = journal articles, `@unpublished` = working papers, `@techreport` = policy briefs, `@report` = other writing.
   - `pdf`: Just the filename (e.g., `BGST_2025.pdf`). The file must live in `assets/pdf/`.
   - `html`: External link (e.g., SSRN, journal page).
   - `preview`: Just the filename. The image must live in `assets/img/publication_preview/`.
   - `note`: Free text shown below the title (use for "R&R at Journal X", "Conditionally accepted!", etc.).
   - `pre-reg`: Link to pre-registration.
   - `abstract`: Shows as expandable text on the publications page.
   - Wrap title words in `{}` braces to preserve capitalization (BibTeX lowercases otherwise).

4. **Upload the PDF** to `assets/pdf/` if you have one.

5. **Upload a preview image** to `assets/img/publication_preview/` if you want a thumbnail.

---

## How to: Add a news item

1. **Create a new file** in `_news/`. Name it something descriptive, e.g., `my_update.md`.

2. **Use this template:**

   ```markdown
   ---
   layout: post
   title: Short descriptive title
   date: 2026-02-11 12:00:00-0400
   tags: pubs
   inline: true
   related_posts: false
   ---

   Your announcement here. You can use markdown, links, and emoji codes like :tada:.
   Link to a paper like [this](https://emiliatjernstrom.com/assets/pdf/YourFile.pdf).
   ```

3. **Notes:**
   - `date` determines the order (newest first). Format: `YYYY-MM-DD HH:MM:SS-TIMEZONE`.
   - `inline: true` makes it show as a compact item on the homepage.
   - These show in the "News" section on the homepage and on the `/news/` page.

---

## How to: Add a resource

The resources page (`/resources/`) works like the projects page — a grid of cards, each linking to a full page. To add a new resource:

1. **Create a new file** in `_resources/`. Name it descriptively, e.g., `writing-tips.md`.

2. **Use this template:**

   ```markdown
   ---
   layout: page
   title: Your resource title
   description: A one-sentence summary shown on the card.
   img: assets/img/your-preview.png
   importance: 2
   category: for students
   ---

   Your full content here. Markdown, links, embeds, etc.
   ```

3. **Key fields:**
   - `title`: Shown on the card and as the page heading.
   - `description`: The short text shown on the card below the title.
   - `img`: Path to a preview image. Landscape ~660x300px works best (gets cropped to 2:1). Optional — cards work without it.
   - `importance`: Lower numbers appear first in the grid.
   - `category`: Must be `for students` to appear on the resources page (you can add more categories to `display_categories` in `_pages/resources.md` later).

4. **Upload a preview image** to `assets/img/` if you have one.

---

## How to: Update your bio

1. **Edit** `_pages/about.md`.
2. The bio text is plain markdown below the front matter. Update position, research interests, etc.
3. Your profile photo is set in the front matter (`profile > image`).

---

## How to: Update your position/subtitle

1. **Edit** `_config.yml`.
2. Find the `description` field near the top. This is the subtitle shown under your name:
   ```yaml
   description: >
     Associate Professor of Economics, Macquarie Business School
   ```

---

## How to: Push changes live

```bash
git add _bibliography/papers.bib
git add _news/my_new_post.md
git add assets/pdf/NewPaper.pdf          # if applicable
git commit -m "Add new paper / news item"
git push
```

GitHub Actions will build and deploy automatically. Takes a few minutes.

If you edited on GitHub directly, just commit there and it deploys automatically.

---

## Quick reference: Type mapping

| BibTeX type    | `keywords` value       | Section on website   |
|----------------|------------------------|----------------------|
| `@article`     | `{peer\_reviewed}`     | Journal articles     |
| `@unpublished` | `{working\_paper}`     | Working papers       |
| `@techreport`  | `{policy\_brief}`      | Policy briefs        |
| `@report`      | `{other}`              | Other writing        |

---

## Troubleshooting

- **Paper not showing up?** Make sure both the `@type` and `keywords` are correct. They work together to place the paper in the right section.
- **Title getting lowercased?** Wrap words in `{}` braces in the title field.
- **PDF link broken?** Check that the filename in `pdf = {X.pdf}` exactly matches the file in `assets/pdf/`.
- **Build failing?** Check the Actions tab on GitHub for error logs. Common issues: malformed BibTeX (missing commas, unmatched braces).
