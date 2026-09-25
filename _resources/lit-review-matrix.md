---
layout: page
title: Literature review matrix
description: Find papers with Google Scholar, record each one as a row in a spreadsheet, and know when to stop searching. Includes a blank template and a worked example.
img: assets/img/lit-review-matrix-card.jpg
importance: 1
category: for students
---

<style>
.litrev{
  --ink-strong:#17171f; --ink:#2c2c38; --slate:#5c6072;
  --accent:#5b4bdb; --accent-wash:rgba(91,75,219,.07); --border:#e7e6f1;
  --code-ink:#3a2eb0; --link-line:rgba(91,75,219,.25); --paper-alt:#f1f0f9;
  color:var(--ink); font-size:1.04rem; line-height:1.7;
  max-width:760px; margin:1.5rem auto 0;
}
html[data-theme='dark'] .litrev{
  --ink-strong:#ececf1; --ink:#d2d2da; --slate:#9a9eb0;
  --accent:#a399ff; --accent-wash:rgba(163,153,255,.13); --border:#3a3a44;
  --code-ink:#c3bcff; --link-line:rgba(163,153,255,.35); --paper-alt:#25252b;
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
.litrev figure{margin:1.4rem 0;}
.litrev figure img{width:100%; height:auto; border:1px solid var(--border); border-radius:9px; display:block;}
.litrev figcaption{font-size:.85rem; color:var(--slate); margin-top:.45rem; text-align:center;}
.litrev .lr-toc{background:var(--paper-alt); border:1px solid var(--border); border-radius:12px; padding:1.05rem 1.3rem; margin:1.2rem 0 .5rem;}
.litrev .lr-toc p{font-weight:500; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); margin:0 0 .55rem;}
.litrev .lr-toc ol{margin:0; padding:0 0 0 1.2rem; font-size:.96rem;}
.litrev .lr-toc > ol{columns:2; column-gap:1.8rem;}
.litrev .lr-toc > ol > li{break-inside:avoid;}
.litrev .lr-toc ol ol{list-style:none; padding-left:.9rem; font-size:.9rem;}
.litrev .lr-toc li{margin:.18rem 0;}
.litrev .lr-toc a{color:var(--ink); border-bottom:none;}
.litrev .lr-toc a:hover{color:var(--accent);}
@media (min-width:1240px){
  .litrev .lr-toc{position:fixed; top:118px; left:calc(50vw - 600px); width:200px; margin:0; padding:0; background:none; border:none; border-radius:0; max-height:calc(100vh - 150px); overflow:auto;}
  .litrev .lr-toc p{margin:0 0 .6rem;}
  .litrev .lr-toc ol{padding-left:1.15rem; font-size:.9rem;}
  .litrev .lr-toc > ol{columns:1;}
  .litrev .lr-toc ol ol{padding-left:.6rem; font-size:.84rem;}
  .litrev .lr-toc li{margin:.34rem 0;}
  .litrev .lr-toc a{color:var(--slate);}
  .litrev .lr-toc a.active{color:var(--accent); font-weight:500;}
}
</style>

<div class="litrev" markdown="1">

<nav class="lr-toc">
<p>On this page</p>
<ol>
<li><a href="#scholar">Find papers with Google Scholar</a>
<ol>
<li><a href="#ranking">How Scholar orders results</a></li>
<li><a href="#links">Links around each result</a></li>
<li><a href="#advanced">Advanced search</a></li>
<li><a href="#data">Data</a></li>
</ol></li>
<li><a href="#matrix">Build the matrix</a>
<ol>
<li><a href="#tidy">Keep it tidy</a></li>
<li><a href="#example">Example</a></li>
<li><a href="#columns">Columns to include</a></li>
<li><a href="#extra-columns">Other useful columns</a></li>
</ol></li>
<li><a href="#stop">Know when to stop searching</a></li>
</ol>
</nav>

A literature review matrix is a spreadsheet with one row per paper and one column per thing you want to know about each paper: its research question, data, method, results, and limitations.
Filling it in forces you to read each paper for the same information.
Sorting it later, you'll spot patterns across papers that are hard to see one PDF at a time.
Raul Pacheco-Vega called this the [conceptual synthesis Excel dump](https://www.raulpacheco.org/2016/06/synthesizing-different-bodies-of-work-in-your-literature-review-the-conceptual-synthesis-excel-dump-technique/), and his site has [many more literature review resources](https://www.raulpacheco.org/resources/literature-reviews/).

## Find papers with Google Scholar {#scholar}

Most students, in my experience, use Google Scholar as a search box and rarely click anything below a result.
Scholar ranks each result by its own criteria, and every result also has links and tools below it that most students rarely click.

### Know how Scholar orders results {#ranking}

Google [says](https://scholar.google.com/intl/en/scholar/about.html) that Scholar "aims to rank documents the way researchers do, weighing the full text of each document, where it was published, who it was written by, as well as how often and how recently it has been cited in other scholarly literature."
By those criteria, Scholar judges the results on page nine less relevant than those on page one.
A paper that other scholars rarely cite may still be the right paper for you, so don't stop looking after the first page or two.
A recent paper hasn't had time to accumulate citations.
If other scholars rarely cite an older paper, ask yourself why they pass it over.

### Use the links and tools around each result {#links}

- **Cite**: the quotation-mark icon gives you a formatted citation in several styles, plus a BibTeX export for LaTeX users
- **Related articles**: lists papers that Scholar's algorithm judges similar to the one you found, and is most helpful at the start of a review
- **Cited by**: lists the papers Scholar has found that cite this one, so you can move forward in time from an older paper to the newer work that builds on it
- **Search within citing articles**: on the "Cited by" page, this checkbox restricts your search to the citing papers

That last option is one of the most powerful tools Scholar offers.
Suppose you know one or two seminal papers on a topic but not the recent evidence.
Open the seminal paper's "Cited by" list, check the box, and search for your keywords: you'll see only the citing papers that also match your keywords.

<figure>
<img src="{{ '/assets/img/scholar-search-within-citing.png' | relative_url }}" alt="Google Scholar results for the search term networks, restricted to papers citing Conley and Udry's &ldquo;Learning about a new technology: Pineapple in Ghana,&rdquo; with the Search within citing articles checkbox checked." loading="lazy">
<figcaption>The checkbox narrows the results to papers that both cite Conley and Udry's pineapple-adoption study and match the search term "networks," so only relevant follow-on work appears.</figcaption>
</figure>

### Advanced search and other tools {#advanced}

Scholar's advanced search is in the side drawer (the menu icon at the top left).
It lets you search the author, title, and publication fields separately, and limit results to a range of years.
Field searches help when your keywords are also common surnames.
If you want papers about wolves and hunting, you probably don't want everything written by a Dr. Hunt or a Professor Wolf.

A library link to the full text appears next to a result when your university has a subscription and either you're on campus or you've set up library links in Scholar's settings.
The envelope icon on a results page creates an email alert, so Scholar tells you when new papers match your search.

### Look for data too {#data}

Google's [Dataset Search](https://datasetsearch.research.google.com/) finds datasets rather than papers.
Not everything it lists is freely accessible, but you can use it to check which data sources exist for a topic.
For ready-made public statistics, try [Data Commons](https://datacommons.org/).

## Build the matrix {#matrix}

<div class="lr-callout" markdown="1">

Start from the template below, which has three sheets: a matrix with the columns below, a quotes sheet, and one describing each column.

<p class="lr-buttons">
<a href="{{ '/assets/files/lit-review-matrix-template.xlsx' | relative_url }}">Download the template (.xlsx)</a>
<a href="{{ '/assets/files/lit-review-matrix-template.csv' | relative_url }}">Download headers only (.csv)</a>
</p>

To use it in Google Sheets, open a new sheet and choose File, then Import, then Upload.

</div>

### Keep it tidy {#tidy}

Put one paper in each row and one piece of information in each column.
Never stack two kinds of information in one cell, such as the data source and the method, because you'd no longer be able to sort or filter on either.
If a paper uses two datasets, list both in the `data_source` cell, separated by semicolons; don't create a `data_source_2` column.
Keep column names short, lowercase, and free of spaces, so the sheet also reads cleanly into Stata, R, or Python.
Verbatim quotes are rare in economics; when a phrase is especially striking, record it exactly, with its page number.
The template's separate `quotes` sheet has these columns, one row per quote: `citation` (matching the matrix sheet's `citation` column), `page`, and `quote`.

### Example: air pollution and health {#example}

Ayal Weiner-Kaplow built this matrix of 44 papers on air pollution and health, to inform a study of how fine particulate matter affects cognition in Kenya.
I restructured it into tidy form, with one piece of information per column.
The original file had merged sample, data source, and method into one column, and pollutant and measurement method into another.

<p class="lr-buttons">
<a href="{{ '/assets/files/lit-review-matrix-example.xlsx' | relative_url }}">Download the example (.xlsx)</a>
<a href="{{ '/assets/files/lit-review-matrix-example.csv' | relative_url }}">Download the example (.csv)</a>
</p>

<div class="lr-scroll">
<table>
<thead><tr><th>Paper</th><th><code>location</code></th><th><code>time_period</code></th><th><code>explanatory</code></th><th><code>outcome_measure</code></th><th><code>identification</code></th></tr></thead>
<tbody>
<tr><td>Adhvaryu et al. (2016)</td><td>Western Sub-Saharan Africa</td><td>Aug. 1985-Dec. 2006</td><td>PM2.5; dust</td><td>Child mortality rates</td><td>Panel</td></tr>
<tr><td>Arceo, Hanna, and Oliva (2016)</td><td>Mexico: many municipalities of Mexico City</td><td>1997-2006</td><td>PM10; O3; SO2; CO</td><td>Weekly, municipality-level, mortality rates</td><td>Instrumental variables</td></tr>
<tr><td>Bharadwaj et al. (2017)</td><td>Santiago, Chile</td><td>births between 1992-2001 and corresponding test scores between 2002-2010</td><td>PM10; O3; CO</td><td>National 4th grade test score</td><td>Panel</td></tr>
<tr><td>Chang et al. (2016)</td><td>Northern California</td><td>2001-2003</td><td>PM2.5; PM10; NO2; O3; CO</td><td>Worker Productivity</td><td>Panel</td></tr>
<tr><td>Chay and Greenstone (2005)</td><td>United States</td><td>1969-1990</td><td>TSP</td><td>Measure of pollution impact: Housing prices</td><td>Instrumental variables</td></tr>
</tbody>
</table>
</div>

The preview shows five of the 44 rows and six of the 20 columns; the downloads have the rest.

### Columns to include {#columns}

I always include the columns below, whatever your topic; you may want extra ones depending on what you're studying.

| Column | What goes in it |
| ------ | --------------- |
| `citation` | Full citation for the paper |
| `year` | Publication year, in its own column so that you can sort by it |
| `research_question` | The main research question, in one sentence. For example: "What is the relationship between dust exposure in utero and child mortality in West Africa?" |
| `outcome` | The main outcome variable, in words (infant mortality, test scores, yields) |
| `outcome_measure` | How the paper measures the outcome: the source, unit, and time frame (deaths before age one, from birth histories) |
| `explanatory` | The main explanatory variable |
| `explanatory_measure` | How the paper measures the explanatory variable |
| `method` | The empirical method, which in applied microeconomics is typically the identification strategy: panel data with fixed effects, instrumental variables, regression discontinuity, a randomized trial, or a natural experiment that provides exogenous variation; for a randomized trial, describe the treatment |
| `data_source` | The datasets: a Demographic and Health Survey, a census, administrative records, or the authors' own survey |
| `sample` | Who or what the data cover, and the population they come from. Knowing the population and how the sample was drawn helps you judge how far the results generalize |
| `sampling_method` | How units entered the data: a random sample, a census of all units, program participants, or a convenience sample |
| `key_results` | The main estimates, with their size and units |
| `limitations` | The limitations the authors acknowledge, plus any you notice yourself: threats to identification, measurement problems, a sample that may not generalize |
| `related_articles` | Other papers in your matrix that this one builds on, replicates, or contradicts. Linking papers is an art, not a science |
| `comments` | Anything else, including how the paper relates to your own project |

### Other potentially useful columns {#extra-columns}

Add `location` (countries or regions) when your papers span many settings.
Add `time_period` (the years the data cover) regardless of how many settings your papers span.
The `outcome_measure` and `explanatory_measure` columns above are where you record how studies measure the outcome or the explanatory variable, whenever they measure it in very different ways.
Air pollution measures vary widely across studies, as these examples show:

- Hourly ozone (O₃), carbon monoxide (CO), and nitrogen dioxide (NO₂), and averages of PM2.5 and PM10, from a California Air Resources Board monitor 2.7 miles from a pear-packing factory ([Chang et al. 2016](https://doi.org/10.1257/pol.20150085))
- Weekly averages of CO, O₃, and PM10, weighted across all monitors within 20 miles of the mother's residential zip code in a study of birth outcomes ([Currie and Neidell 2005](https://doi.org/10.1093/qje/120.3.1003))
- Daily aerosol index for subdistricts of Indonesia, from 226 satellite grid points about 175 kilometers apart that cover roughly 3,700 subdistricts ([Jayachandran 2009](https://doi.org/10.3368/jhr.44.4.916))

## Know when to stop searching {#stop}

I tell students to watch for the same papers turning up again and again, both in the reference lists you're reading and in your own new searches that lead back to sources already in the matrix.
When that happens, you're starting to be in good shape.

Pacheco-Vega named this [concept saturation](https://www.raulpacheco.org/2016/06/how-to-do-a-literature-review-citation-tracing-concept-saturation-and-results-mind-mapping/) too, a term he borrowed from qualitative research methods.
He put it this way: "I define concept saturation as the point where I am seeing the same citations repeated on a regular basis."

In a [2017 post on how much reading is enough](https://www.raulpacheco.org/2017/06/how-many-sources-are-enough-six-questions-on-breadth-and-depth-of-literature-reviews/), he wrote: "I don't think you gain too much, marginally, from reading yet another paper on the same topic but using a different case study."
He was upfront, too, that the question has no clean answer.
In your matrix, that saturation will look like new rows that repeat values you already have in `method`, `data_source`, or `explanatory`.

</div>

<script>
(function(){
  var toc=document.querySelector('.litrev .lr-toc');
  if(!toc) return;
  var links={};
  toc.querySelectorAll('a').forEach(function(a){links[a.getAttribute('href').slice(1)]=a;});
  var heads=Array.prototype.filter.call(document.querySelectorAll('.litrev h2[id], .litrev h3[id]'),function(h){return links[h.id];});
  if(!heads.length) return;
  var current=null;
  function update(){
    var line=(window.innerHeight||document.documentElement.clientHeight)*0.25, pick=heads[0];
    heads.forEach(function(h){if(h.getBoundingClientRect().top<=line) pick=h;});
    if(pick===current) return;
    if(current) links[current.id].classList.remove('active');
    links[pick.id].classList.add('active');
    current=pick;
  }
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  update();
})();
</script>
