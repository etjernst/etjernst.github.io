# TODO

Open items for the website, roughly in priority order.
Excluded from the Jekyll build via `_config.yml`, so this never appears on the site.

## 1. Add llms.txt versions of papers

Implement [Goldsmith-Pinkham's llms.txt for academic papers](https://paulgp.com/2026/03/10/llms-txt-for-academic-papers.html): serve a plain-text (Markdown) version of each paper alongside the PDF so LLMs can read them cheaply and accurately.

Layout decided and implemented for the first paper (2026-06-11): one bundle per paper at `assets/llms/<citekey>/` containing `llms.txt` (orientation: what/context/methods/results/limitations/navigation/status), `paper.md` (pandoc conversion, citations kept as bib keys), `references.bib`, and `figures/*.png`; a site-root `llms.txt` indexes the bundles.

Remaining:

- Add bundles for the other papers with .tex source (in their respective project repos).
- Conversion recipe per the aq_ssa bundle: strip the project preamble but keep custom macros pandoc needs (e.g., `\figref`), then `pandoc main.tex -f latex -t markdown --wrap=none` (NOT `--citeproc`, which hangs/hogs memory on big bibs), then point figure paths at PNGs and add a plain-text header (no YAML front matter, or Jekyll converts the .md to HTML).
- Consider linking each bundle from its bib entry on the publications page.

## 2. Clean up the literature review resource

`_resources/annotated-bib.md` (the Conceptual Synthesis Excel Dump page) needs a cleanup pass.

- Tighten the prose and check that the external links (Raul Pacheco's pages) still resolve.
- Consider splitting Google Scholar tips and the Excel dump into separate sections or separate resource cards.
- Could also modernize: mention reference managers (Zotero) and AI-assisted literature triage, since students ask about both.

## 3. Old content still appearing

Mostly resolved 2026-06-11: deleted the al-folio demo posts in `_posts/`, the demo projects 4/5, and the al-folio Medium feed in `external_sources` (all were built into the sitemap and indexed even with the blog page unpublished).

Remaining:

- Optionally request removal/recrawl in Google Search Console so the now-404 `/blog/...` URLs drop out of search results faster.
- User reports other mystery stale content somewhere; when it resurfaces, check where the URL actually points---if it is a pre-al-folio site (university page, earlier host), the fix is outside this repo.
