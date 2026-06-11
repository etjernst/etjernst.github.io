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

Diagnosis (2026-06-11): the al-folio theme's demo blog posts (`_posts/2015-*` through `_posts/2023-*`) still build and are listed in the deployed `sitemap.xml` under `/blog/...`, even though the blog nav page is hidden (`_pages/blog.md` has `published: false`).
Hiding the blog page does not stop Jekyll from generating the individual post pages, their tag/category archive pages, and the RSS feed entries, so search engines index them.

Fix when ready:

- Delete the demo files in `_posts/` (or set `published: false` in each post's front matter).
- Also delete the two leftover demo projects `_projects/4_project.md` and `_projects/5_project.md` (already `published: false`, so low priority).
- After deploy, the URLs 404; optionally request removal/recrawl in Google Search Console to clear them from search results faster.
- If old content also appears from a pre-al-folio site (e.g., a university page or earlier host), that is outside this repo; check where the search results actually point before assuming this repo is the source.
