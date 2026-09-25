---
layout: page
title: Literature review matrix
description: Find papers with Google Scholar, record each one as a row in a spreadsheet, and turn the spreadsheet into a written literature review. Includes a blank template and a worked example.
img: assets/img/excel-dump-preview.png
importance: 1
category: for students
---

<style>
.litrev{
  --ink-strong:#17171f; --ink:#2c2c38; --slate:#5c6072;
  --accent:#5b4bdb; --accent-wash:rgba(91,75,219,.07); --border:#e7e6f1;
  --code-ink:#3a2eb0; --link-line:rgba(91,75,219,.25);
  color:var(--ink); font-size:1.04rem; line-height:1.7;
  max-width:760px; margin:1.5rem auto 0;
}
html[data-theme='dark'] .litrev{
  --ink-strong:#ececf1; --ink:#d2d2da; --slate:#9a9eb0;
  --accent:#a399ff; --accent-wash:rgba(163,153,255,.13); --border:#3a3a44;
  --code-ink:#c3bcff; --link-line:rgba(163,153,255,.35);
}
#main-content .post-header{max-width:760px; margin-left:auto; margin-right:auto;}
.litrev h2{color:var(--ink-strong); font-weight:700; margin:2.4rem 0 .8rem;}
.litrev h3{color:var(--ink-strong); font-weight:500; margin:1.8rem 0 .5rem;}
.litrev a{color:var(--accent); text-decoration:none; border-bottom:1px solid var(--link-line);}
.litrev a:hover{border-bottom-color:var(--accent);}
.litrev code{font-size:.86em; background:var(--accent-wash); color:var(--code-ink); padding:.1em .35em; border-radius:4px;}
.litrev table{width:100%; border-collapse:collapse; font-size:.92rem; margin:1rem 0 1.4rem;}
.litrev th,.litrev td{border-bottom:1px solid var(--border); padding:.5rem .55rem; text-align:left; vertical-align:top; color:var(--ink);}
.litrev thead th{color:var(--ink-strong); border-bottom:2px solid var(--border);}
.litrev .lr-scroll{overflow-x:auto;}
.litrev .lr-scroll table{min-width:640px; font-size:.86rem;}
.litrev .lr-callout{background:var(--accent-wash); border-left:3px solid var(--accent); border-radius:0 9px 9px 0; padding:.85rem 1.1rem; margin:1.2rem 0;}
.litrev .lr-callout p:last-child{margin-bottom:0;}
.litrev .lr-buttons a{display:inline-block; margin:.2rem .5rem .2rem 0; padding:.35rem .9rem; border:1px solid var(--accent); border-radius:6px;}
</style>

<div class="litrev" markdown="1">

A literature review matrix is a spreadsheet with one row per paper and one column per thing you want to know about each paper: its research question, data, method, results, and limitations.
Filling it in forces you to read each paper for the same information, and sorting it later shows you patterns across papers that are hard to see one PDF at a time.
Raul Pacheco-Vega calls this the [conceptual synthesis Excel dump](https://www.raulpacheco.org/2016/06/synthesizing-different-bodies-of-work-in-your-literature-review-the-conceptual-synthesis-excel-dump-technique/), and his site has [many more literature review resources](https://www.raulpacheco.org/resources/literature-reviews/).

## Find papers with Google Scholar

Most students, in my experience, use Google Scholar as a search box and rarely click anything below a result.
Most of Scholar's value lies in the links under each result.

### Know how Scholar orders results

Google [says](https://scholar.google.com/intl/en/scholar/about.html) that Scholar "aims to rank documents the way researchers do, weighing the full text of each document, where it was published, who it was written by, as well as how often and how recently it has been cited in other scholarly literature."
By those criteria, Scholar judges the results on page nine less relevant than those on page one.
A paper that other scholars rarely cite may still be the right paper for you.
A recent paper simply hasn't had time to accumulate citations, but for an older paper, ask yourself why others pass it over.

### Use the links and tools around each result

- The quotation-mark icon ("Cite") gives you a formatted citation in several styles, plus a BibTeX export for LaTeX users
- "Related articles" lists papers that Scholar's algorithm judges similar to the one you found, which helps most at the start of a review
- "Cited by" lists the papers Scholar has found that cite this one, so you can move forward in time from an older paper to the newer work that builds on it
- On the "Cited by" page, check "Search within citing articles" to search only among the citing papers

That last option is the most powerful tool Scholar offers.
Suppose you know one or two seminal papers on a topic but not the recent evidence.
Open the seminal paper's "Cited by" list, check the box, and search for your keywords: you'll see only the citing papers that also match your keywords.

### Advanced search and other shortcuts

Scholar's advanced search is in the side drawer (the menu icon at the top left).
It lets you search the author, title, and publication fields separately, and limit results to a range of years.
Field searches help when your keywords are also common surnames.
If you want papers about wolves and hunting, you probably don't want everything written by a Dr. Hunt or a Professor Wolf.

If your university subscribes and you are on campus or have set up library links in Scholar's settings, a library link appears to the right of the result and takes you to the full text.
The envelope icon on a results page creates an email alert, so Scholar tells you when new papers match your search.

### Look for data too

Google's [Dataset Search](https://datasetsearch.research.google.com/) finds datasets rather than papers.
Not everything it lists is freely accessible, but it helps you learn which data sources exist for a topic.
For ready-made public statistics, try [Data Commons](https://datacommons.org/), which replaced Google's Public Data Explorer.

## Build the matrix

<div class="lr-callout" markdown="1">

Start from the blank template, which has the columns below and a second sheet describing each one.

<p class="lr-buttons">
<a href="{{ '/assets/files/lit-review-matrix-template.xlsx' | relative_url }}">Download the template (.xlsx)</a>
<a href="{{ '/assets/files/lit-review-matrix-template.csv' | relative_url }}">Download headers only (.csv)</a>
</p>

To use it in Google Sheets, open a new sheet and choose File, then Import, then Upload.

</div>

### Keep it tidy

Put one paper in each row and one piece of information in each column.
Never stack two kinds of information in one cell, such as the data source and the method, because you can then no longer sort or filter on either.
If a paper uses two datasets, list both in the `data_source` cell, separated by semicolons; don't create a `data_source_2` column.
Keep column names short, lowercase, and free of spaces, so the sheet also reads cleanly into Stata, R, or Python.

### Columns to include

Depending on your topic, you may want extra columns, but I would always include these.

| Column | What goes in it |
| ------ | --------------- |
| `citation` | Full citation for the paper |
| `year` | Publication year, in its own column so that you can sort by it |
| `research_question` | The main research question, in one sentence. For example: "What is the relationship between dust exposure in utero and child mortality in West Africa?" |
| `outcome` | The main outcome variable, in words (infant mortality, test scores, yields) |
| `outcome_measure` | How the paper measures the outcome: the source, unit, and time frame (deaths before age one, from birth histories) |
| `treatment` | The main explanatory variable, treatment, or exposure |
| `treatment_measure` | How the paper measures the treatment or exposure |
| `method` | The empirical method: fixed effects, instrumental variables, regression discontinuity, a randomized trial, or a natural experiment that provides exogenous variation |
| `data_source` | The datasets: a Demographic and Health Survey, a census, administrative records, or the authors' own survey |
| `sample` | Who or what the data cover, and the population they come from. Knowing the population and how the sample was drawn helps you judge how far the results generalize |
| `sampling_method` | How units entered the data: a random sample, a census of all units, program participants, or a convenience sample |
| `key_results` | The main estimates, with their size and units |
| `limitations` | The limitations the authors acknowledge, plus any you notice yourself: threats to identification, measurement problems, a sample that may not generalize |
| `quotes` | Rare in economics, but if the paper has a killer phrase, write it down with its page number |
| `related_articles` | Other papers in your matrix that this one builds on, replicates, or contradicts. Linking papers is an art, not a science |
| `comments` | Anything else, including how the paper relates to your own project |

### Other potentially useful columns

Add `location` (countries or regions) when your papers span many settings.
Add `time_period` (the years the data cover) too.
Record measurement details in your `outcome_measure` and `treatment_measure` cells whenever studies measure the outcome or the treatment in very different ways.
Air pollution is a good example, because every study seems to measure it differently:

- Hourly ozone (O₃), carbon monoxide (CO), and nitrogen dioxide (NO₂), and averages of PM2.5 and PM10, from a California Air Resources Board monitor 2.7 miles from a pear-packing factory ([Chang et al. 2016](https://doi.org/10.1257/pol.20150085))
- Weekly averages of CO, O₃, and PM10, weighted across all monitors within 20 miles of the mother's residential zip code in a study of birth outcomes ([Currie and Neidell 2005](https://doi.org/10.1093/qje/120.3.1003))
- Daily aerosol index for subdistricts of Indonesia, from 226 satellite grid points about 175 kilometers apart that cover roughly 3,700 subdistricts ([Jayachandran 2009](https://doi.org/10.3368/jhr.44.4.916))

## Example: air pollution and health

Ayal Weiner-Kaplow built this matrix of about 40 papers on air pollution and health, to inform a study of how fine particulate matter affects cognition in Kenya.
I restructured it into tidy form, one piece of information per column, as the template above requires: the original merged sample, data source, and method into one column, and pollutant and measurement method into another.

<p class="lr-buttons">
<a href="{{ '/assets/files/lit-review-matrix-example.xlsx' | relative_url }}">Download the example (.xlsx)</a>
<a href="{{ '/assets/files/lit-review-matrix-example.csv' | relative_url }}">Download the example (.csv)</a>
</p>

<div class="lr-scroll">
<table>
<thead><tr><th>Paper</th><th><code>location</code></th><th><code>time_period</code></th><th><code>treatment</code></th><th><code>outcome_measure</code></th><th><code>identification</code></th></tr></thead>
<tbody>
<tr><td>Adhvaryu et al. (2016)</td><td>Western Sub-Saharan Africa</td><td>Aug. 1985-Dec. 2006</td><td>PM2.5; dust</td><td>Child mortality rates</td><td>Panel</td></tr>
<tr><td>Arceo, Hanna, and Oliva (2016)</td><td>Mexico: many municipalities of Mexico City</td><td>1997-2006</td><td>PM10; O3; SO2; CO</td><td>Weekly, municipality-level, mortality rates</td><td>Instrumental Variable</td></tr>
<tr><td>Bharadwaj et al. (2017)</td><td>Santiago, Chile</td><td>births between 1992-2001 and corresponding test scores between 2002-2010</td><td>PM10; O3; CO</td><td>National 4th grade test score</td><td>Panel</td></tr>
<tr><td>Chang et al. (2016)</td><td>Northern California</td><td>2001-2003</td><td>PM2.5; PM10; NO2; O3; CO</td><td>Worker Productivity</td><td>Panel</td></tr>
<tr><td>Chay and Greenstone (2005)</td><td>United States</td><td>1969-1990</td><td>TSP; TSPs</td><td>Measure of pollution impact: Housing prices</td><td>IV</td></tr>
</tbody>
</table>
</div>

The preview shows five of the 44 rows and six of the 20 columns; the downloads have the rest.

## Write the review from the matrix

Once you have 20 or 30 rows, sort and filter the matrix before writing a word.
Sort by `method` to see which questions have credible causal evidence and which rest on correlations.
Sort by `year` to see how the literature developed, and by `location` (if you added it) to see where the evidence comes from and where it is missing.

Organize the review around groups defined by method, year, and location, not around individual papers.
A paragraph that reports one paper at a time ("Paper A found X. Paper B found Y.") summarizes.
A paragraph that compares groups of papers synthesizes, for example by asking whether studies using monitor data find larger effects than studies using satellite data, and if so, why.
Your `outcome_measure`, `treatment_measure`, and `sample` columns point to possible reasons results differ, and your `limitations` column tells you how much weight each result can bear.

Finally, filter or cross-tabulate the matrix by `location`, outcome, and method to look for gaps.
A combination that no row covers may be the gap your own project fills, and the matrix lets you show a reader that the gap is real if your search was thorough.

</div>
