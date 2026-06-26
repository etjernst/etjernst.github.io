---
layout: page
title: Version control with Git
description: A short, follow-along guide to tracking your work with Git and reading diffs, for the age of AI-assisted coding.
importance: 2
category: for students
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');

.gittut{
  --ink-strong:#17171f; --ink:#2c2c38; --slate:#5c6072;
  --paper:#fbfbfd; --paper-alt:#f1f0f9; --white:#fff;
  --accent:#5b4bdb; --code-ink:#3a2eb0; --accent-wash:rgba(91,75,219,.07);
  --border:#e7e6f1;
  --display:'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink); font-size:1.06rem; line-height:1.72;
  max-width:740px; margin:1.5rem auto 0;
}
.gittut *{box-sizing:border-box;}
.gittut .gt-sec{position:relative; padding:2.3rem 0;}
.gittut .gt-sec:first-of-type{padding-top:1rem;}
.gittut .gt-sec.gt-shade{background:var(--paper-alt); border:1px solid var(--border); border-radius:16px; padding:2.3rem 1.9rem; margin:1.1rem 0;}
.gittut .gt-sec.gt-shade .gt-num{right:.7rem; color:rgba(91,75,219,.11);}
.gittut .gt-sec.gt-shade pre{background:var(--white);}
.gittut .gt-num{position:absolute; top:1.7rem; right:-.2rem; font-family:var(--display); font-weight:700; font-size:clamp(3rem,9vw,5rem); line-height:1; color:var(--accent-wash); user-select:none; pointer-events:none; z-index:0;}
.gittut .gt-eyebrow{font-family:var(--display); font-weight:600; font-size:.72rem; letter-spacing:.18em; text-transform:uppercase; color:var(--accent); margin:0 0 .5rem;}
.gittut h2{font-family:var(--display); font-weight:600; color:var(--ink-strong); font-size:clamp(1.55rem,3.4vw,2.15rem); line-height:1.15; letter-spacing:.005em; margin:.15rem 0 1rem; position:relative; z-index:1;}
.gittut h3{font-family:var(--display); font-weight:600; color:var(--ink-strong); font-size:1.1rem; margin:1.5rem 0 .4rem;}
.gittut p{margin:0 0 1rem;}
.gittut a{color:var(--accent); text-decoration:none; border-bottom:1px solid rgba(91,75,219,.25);}
.gittut a:hover{border-bottom-color:var(--accent);}
.gittut .gt-lede{font-family:var(--display); font-weight:500; font-size:1.45rem; line-height:1.45; color:var(--ink-strong); letter-spacing:-.005em; margin:.1rem 0 1.5rem;}
.gittut .gt-lede code{font-size:.74em;}
.gittut code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.86em; background:var(--accent-wash); color:var(--code-ink); padding:.12em .4em; border-radius:5px;}
.gittut pre{background:#f5f5fb; color:var(--ink-strong); border:1px solid var(--border); border-radius:10px; padding:13px 16px; overflow:auto; font-size:.86rem; line-height:1.62; margin:1.1rem 0; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
.gittut pre code{background:none; color:inherit; padding:0; font-size:1em;}
.gittut pre .o{color:#5c6072;}
.gittut pre .add{color:#1a7f37;} .gittut pre .del{color:#cf222e;}
.gittut .gt-callout{background:var(--accent-wash); border-left:3px solid var(--accent); border-radius:0 9px 9px 0; padding:.85rem 1.1rem; margin:1.2rem 0; font-size:.99rem;}
.gittut .gt-callout strong{color:var(--accent);}
.gittut table{width:100%; border-collapse:collapse; font-size:.92rem; margin:1rem 0;}
.gittut th,.gittut td{border-bottom:1px solid var(--border); padding:.5rem .55rem; text-align:left; vertical-align:top;}
.gittut thead th{font-family:var(--display); color:var(--ink-strong); border-bottom:2px solid var(--border);}
.gittut td code{background:none; color:var(--code-ink); padding:0; white-space:nowrap;}
.gittut .gt-toc{background:var(--paper-alt); border:1px solid var(--border); border-radius:12px; padding:1.05rem 1.3rem; margin:1.2rem 0 .5rem;}
.gittut .gt-toc p{font-family:var(--display); font-weight:600; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); margin:0 0 .55rem;}
.gittut .gt-toc ol{margin:0; padding:0 0 0 1.2rem; font-size:.96rem; columns:2; column-gap:1.8rem;}
.gittut .gt-toc li{margin:.18rem 0; break-inside:avoid;}
.gittut .gt-toc a{color:var(--ink); border-bottom:none;}
.gittut .gt-toc a:hover{color:var(--accent);}
@media (min-width:1200px){
  .gittut .gt-toc{position:fixed; top:118px; left:calc(50vw - 592px); width:200px; margin:0; padding:0; background:none; border:none; border-radius:0; max-height:calc(100vh - 150px); overflow:auto;}
  .gittut .gt-toc p{margin:0 0 .6rem;}
  .gittut .gt-toc ol{columns:1; padding-left:1.15rem; font-size:.9rem;}
  .gittut .gt-toc li{margin:.34rem 0;}
  .gittut .gt-toc a{color:var(--slate); border-bottom:none;}
  .gittut .gt-toc a:hover{color:var(--accent);}
  .gittut .gt-toc a.active{color:var(--accent); font-weight:600;}
}
.gittut details.gt-more{border:1px solid var(--border); border-radius:10px; background:var(--white); margin:1.2rem 0;}
.gittut details.gt-more>summary{cursor:pointer; list-style:none; padding:.8rem 1.05rem; font-family:var(--display); font-weight:600; font-size:.97rem; color:var(--accent); display:flex; align-items:center; gap:.55rem;}
.gittut details.gt-more>summary::-webkit-details-marker{display:none;}
.gittut details.gt-more>summary::before{content:"+"; font-weight:700; font-size:1.15rem; line-height:1; width:.9rem; text-align:center;}
.gittut details.gt-more[open]>summary::before{content:"\2212";}
.gittut details.gt-more>summary:hover{background:var(--accent-wash); border-radius:9px 9px 0 0;}
.gittut details.gt-more .gt-more-body{padding:.2rem 1.05rem 1.1rem;}
.gittut details.gt-more .gt-more-body>:first-child{margin-top:0;}
.gittut figure{margin:1.4rem 0;}
.gittut figure img{width:100%; border:1px solid var(--border); border-radius:9px; display:block;}
.gittut figcaption{font-size:.85rem; color:var(--slate); margin-top:.45rem; text-align:center;}
.gittut .gt-download{display:inline-block; font-family:var(--display); font-weight:600; font-size:.9rem; padding:.5rem .95rem; border:1px solid var(--accent); border-radius:8px; color:var(--accent); margin:.5rem 0;}
.gittut .gt-download:hover{background:var(--accent); color:#fff;}
.gittut ol li, .gittut ul li{margin:.3rem 0;}
.gittut.gt-js .reveal{opacity:0; transform:translateY(20px); transition:opacity .7s ease, transform .7s ease;}
.gittut.gt-js .reveal.is-visible{opacity:1; transform:none;}
@media (prefers-reduced-motion:reduce){.gittut.gt-js .reveal{opacity:1; transform:none; transition:none;}}
</style>

<div class="gittut" id="gittut">

<nav class="gt-toc">
<p>On this page</p>
<ol>
<li><a href="#problem">Why you need this</a></li>
<li><a href="#build">Build a real repository</a></li>
<li><a href="#gitignore">Keep data out of git</a></li>
<li><a href="#diff">Learn to read a diff</a></li>
<li><a href="#github">Put it on GitHub</a></li>
<li><a href="#share">Share it with a supervisor</a></li>
<li><a href="#undo">When it goes wrong</a></li>
<li><a href="#ai">Git in the age of AI</a></li>
<li><a href="#card">The whole thing on one card</a></li>
</ol>
</nav>

<section class="gt-sec reveal" id="problem">
<span class="gt-num">01</span>
<p class="gt-eyebrow">the problem</p>
<h2>You already know why you need this</h2>
<p class="gt-lede">Picture your thesis folder. In it: <code>paper_final.do</code>, <code>paper_final_v2.do</code>, <code>paper_final_USE_THIS.do</code>, and <code>paper_final_v2_actually.do</code>. You can't remember which one made Figure 3, one of them is broken, and it is 11 p.m. the night before the submission deadline.</p>
<p>We have all lived in this folder, and it is a miserable place to live. Git is the way out, and the best part is how little of it you need: a handful of commands gets you almost the entire payoff. Open a terminal and follow along, because reading about git works about as well as reading about swimming.</p>
<p>One more reason, and it matters more every month. When you paste a chunk of your script into an AI and it hands back a "fixed" version, git is what lets you see exactly what it changed, and undo it if it is wrong. The habit that this page teaches is the same one that keeps that borrowed code honest.</p>
</section>

<section class="gt-sec gt-shade reveal" id="build">
<span class="gt-num">02</span>
<p class="gt-eyebrow">follow along</p>
<h2>Build a real repository</h2>
<p>Two one-time setup steps first, needed only once per computer. Tell git who you are, so your commits carry your name, and have new repositories start on a branch called <code>main</code>:</p>
<pre><code>git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main</code></pre>
<p>One note on where you type all this. On a Mac, use the built-in Terminal. On Windows, use Git Bash rather than PowerShell, because PowerShell writes files in a format that breaks the <code>echo</code> examples below.</p>
<p>Now make a real repository of your own, so every command is one that you actually run. Make a folder, move into it, and turn it into a repository:</p>
<pre><code>mkdir thesis
cd thesis
git init</code></pre>
<p>Git confirms it, and quietly creates a hidden <code>.git</code> folder where your whole history will live:</p>
<pre><code>Initialized empty Git repository in /Users/you/thesis/.git/</code></pre>
<p>Make a first file, then run the command you will use more than any other, the one that answers "what is going on in here?":</p>
<pre><code>echo "use survey_data, clear" &gt; clean.do
git status</code></pre>
<pre><code>Untracked files:
        clean.do

nothing added to commit but untracked files present</code></pre>
<p>Your real output may carry a couple of extra lines; that is normal. "Untracked" means that git can see the file but is not yet recording its history. Saving a snapshot takes two steps, and this is the bit everyone trips on. You stage what you want with <code>git add</code>, then record it with <code>git commit</code>. Watch the file move from untracked to staged to committed:</p>
<pre><code>git add clean.do
git commit -m "Add initial cleaning script"</code></pre>
<pre><code>[main (root-commit) a1b2c3d] Add initial cleaning script
 1 file changed, 1 insertion(+)</code></pre>
<p>That is your first commit. Now change the file, so there is something to compare:</p>
<pre><code>echo "keep if year &gt;= 2010" &gt;&gt; clean.do
git diff</code></pre>
<pre><code><span class="o">@@ -1 +1,2 @@</span>
 use survey_data, clear
<span class="add">+keep if year &gt;= 2010</span></code></pre>
<p>The green line with the leading <code>+</code> is what you added. Stage and commit it too, then look at the history you just built:</p>
<pre><code>git add clean.do
git commit -m "Restrict sample to 2010 onward"
git log --oneline</code></pre>
<pre><code>f4e5d6c Restrict sample to 2010 onward
a1b2c3d Add initial cleaning script</code></pre>
<p>Two commits, each a labeled snapshot you can return to. That is the whole loop. Everything else on this page is a variation on it.</p>
</section>

<section class="gt-sec reveal" id="gitignore">
<span class="gt-num">03</span>
<p class="gt-eyebrow">before you go online</p>
<h2>Keep data out of git</h2>
<p class="gt-lede">Some files should never go into git: your data, anything confidential, and the cruft your software leaves behind.</p>
<p>This matters most for data. Once you push a file to GitHub it lives on someone else's server, and even if you delete it later it lingers in the history.</p>
<p>Proprietary survey data, anything with personal information, an API key pasted into a script: none of it should leave your laptop this way. The fix is one file named <code>.gitignore</code> that lists what git should pretend it cannot see.</p>
<p>Make it at the top of your repository, before you start committing in earnest:</p>
<pre><code>echo "data/" &gt; .gitignore
echo "*.dta" &gt;&gt; .gitignore
echo "*.csv" &gt;&gt; .gitignore</code></pre>
<p>From now on <code>git status</code> quietly skips everything in your <code>data/</code> folder and every <code>.dta</code> and <code>.csv</code> file. Commit the <code>.gitignore</code> itself, so anyone who clones the repository inherits the same rules:</p>
<pre><code>git add .gitignore
git commit -m "Ignore data files"</code></pre>
<p>One catch worth knowing now: <code>.gitignore</code> only stops git from tracking files it is not already tracking. If you committed a data file before adding it to <code>.gitignore</code>, git keeps tracking it. Tell git to forget it with <code>git rm --cached data.csv</code>, which leaves the file on your disk, then commit the change.</p>
<div class="gt-callout">Those three patterns cover Stata and CSV data in a <code>data/</code> folder. If your data lives somewhere else or comes in other formats, add a line for each: <code>*.xlsx</code>, <code>*.sav</code>, <code>*.RData</code>, and so on. The rule of thumb: <strong>if you would not email it to a stranger, it belongs in .gitignore.</strong></div>
<p>Here is a fuller starter file that also ignores the temporary files Stata, R, and your operating system scatter around. Save it as <code>.gitignore</code> at the top of your repository and edit to taste:</p>
<a class="gt-download" href="{{ '/assets/git-tutorial/sample.gitignore' | relative_url }}" download=".gitignore">Download a sample .gitignore</a>
<details class="gt-more">
<summary>See what is in it</summary>
<div class="gt-more-body">
<pre><code># Data: never commit raw or confidential data
data/
*.dta
*.csv
*.xlsx
*.sav
*.RData

# Logs and temporary output
*.log
*.smcl
*.tmp

# Operating-system and editor clutter
.DS_Store
Thumbs.db
*~

# Secrets: API keys, passwords, tokens
.env
secrets*</code></pre>
</div>
</details>
</section>

<section class="gt-sec gt-shade reveal" id="diff">
<span class="gt-num">04</span>
<p class="gt-eyebrow">the one superpower</p>
<h2>Learn to read a diff</h2>
<p class="gt-lede">Here is the single most useful thing on this page. A diff is git showing you, in red and green, exactly what changed. That is it.</p>
<p>But reading a diff is how you catch the stray debugging line before it ships, how you find the one moment last Tuesday when the regression broke, and how you stay the author of your own project when an AI is typing alongside you. Two commands cover it. <code>git diff</code> shows what you have changed but not yet staged; <code>git diff --staged</code> shows what you are about to commit. A leading <code>-</code> marks a red line you removed; a leading <code>+</code> marks a green line you added. A line you edited appears as both, stacked.</p>
<p>On GitHub the same diff gets friendlier. A single new line looks like this:</p>
<div style="border:1px solid #d0d7de; border-radius:8px; overflow:hidden; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.84rem; line-height:1.7; margin:1.1rem 0;">
  <div style="background:#f6f8fa; border-bottom:1px solid #d0d7de; padding:7px 12px; color:#57606a;">clean.do</div>
  <div>
    <div style="display:flex;"><span style="display:inline-block; width:2.4em; text-align:right; padding:0 8px; color:#8c959f; background:#fafbfc;">1</span><span style="padding:0 10px; white-space:pre;">&nbsp; use survey_data, clear</span></div>
    <div style="display:flex; background:#e6ffec;"><span style="display:inline-block; width:2.4em; text-align:right; padding:0 8px; color:#8c959f; background:#ccffd8;">2</span><span style="padding:0 10px; white-space:pre;"><span style="color:#1a7f37;">+</span> keep if year &gt;= 2010</span></div>
  </div>
</div>
<p>and a changed line shows the old version in red above the new one in green:</p>
<div style="border:1px solid #d0d7de; border-radius:8px; overflow:hidden; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.84rem; line-height:1.7; margin:1.1rem 0;">
  <div style="background:#f6f8fa; border-bottom:1px solid #d0d7de; padding:7px 12px; color:#57606a;">clean.do</div>
  <div>
    <div style="display:flex; background:#ffebe9;"><span style="display:inline-block; width:2.4em; text-align:right; padding:0 8px; color:#8c959f; background:#ffd7d5;">13</span><span style="padding:0 10px; white-space:pre;"><span style="color:#cf222e;">-</span> drop if income &lt; 0</span></div>
    <div style="display:flex; background:#e6ffec;"><span style="display:inline-block; width:2.4em; text-align:right; padding:0 8px; color:#8c959f; background:#ccffd8;">13</span><span style="padding:0 10px; white-space:pre;"><span style="color:#1a7f37;">+</span> drop if income &lt; 0 | missing(income)</span></div>
  </div>
</div>
<p>The diff shows you what changed; your commit message should say it in words, so the history is readable later. Compare a message that helps future-you with one that does not:</p>
<pre><code><span class="o"># Vague: useless to future-you</span>
git commit -m "update"

<span class="o"># Clear: says exactly what changed</span>
git commit -m "Drop duplicate household IDs before the merge"</code></pre>
<div class="gt-callout">The habit that pays off forever: <strong>commit small and often, with a message that says what changed.</strong> And read your own diff before every commit, so you always know what you are saving.</div>
</section>

<section class="gt-sec reveal" id="github">
<span class="gt-num">05</span>
<p class="gt-eyebrow">going online</p>
<h2>Put it on GitHub</h2>
<p>So far this lives only on your laptop. GitHub gives it a backup and a home. On <a href="https://github.com/">github.com</a>, click New, name the repository, and leave it completely empty. Do not let GitHub add a README or a <code>.gitignore</code> for you. If it creates even one file, the repository starts its own separate history, and GitHub rejects your first push with a confusing error. Once the empty repository exists, GitHub hands you a URL ending in <code>.git</code>. Connect the two and send your commits up:</p>
<pre><code>git remote add origin https://github.com/yourname/thesis.git
git branch -M main
git push -u origin main</code></pre>
<div class="gt-callout">The first time you push, GitHub needs to confirm it is really you. It opens a browser sign-in through the Git Credential Manager, or asks for a Personal Access Token you generate in your GitHub account settings. Your ordinary GitHub website password will not work here, and that is expected.</div>
<p><code>origin</code> is just the conventional name for your GitHub copy, and <code>-u</code> remembers the connection so that from now on a bare <code>git push</code> does the job. Refresh the GitHub page and your files and history are sitting there.</p>
<p>From here the daily rhythm has a shape worth burning into memory, because pushing is the last step, not the only one. You cannot push what you have not committed, and you cannot commit what you have not staged. The full loop:</p>
<pre><code>git pull                  <span class="o"># 1. grab anything new on GitHub</span>
<span class="o"># ... edit your files ...</span>
git status                <span class="o"># 2. what changed?</span>
git diff                  <span class="o"># 3. read what changed</span>
git add clean.do          <span class="o"># 4. stage it</span>
git commit -m "Winsorize income before the regression"   <span class="o"># 5. commit it</span>
git push                  <span class="o"># 6. send your commits up</span></code></pre>
<p>Pull at the start so you begin from the latest version, work in the middle, and push when you reach a natural stopping point. Pull while your working tree is clean; if git ever complains about local changes, commit them first. <code>git push</code> does exactly one thing: it uploads commits you have already made. Skip the stage and commit, and there is simply nothing for it to send.</p>
</section>

<section class="gt-sec gt-shade reveal" id="share">
<span class="gt-num">06</span>
<p class="gt-eyebrow">working with others</p>
<h2>Share it with a supervisor</h2>
<p>Once your repository is on GitHub, it becomes the easiest way to show someone exactly what you did. No more zipping files or pasting code into an email that mangles the formatting.</p>
<p>First, give the other person access. On your repository page, open Settings, then Collaborators, and add them by their GitHub username. They get an invitation, and once they accept they can see everything in the repository, including the full history.</p>
<figure>
<img src="{{ '/assets/git-tutorial/add-collaborator.png' | relative_url }}" alt="The Collaborators page in GitHub repository settings, with a box to add someone by username">
<figcaption>Settings &rarr; Collaborators &rarr; Add people, then enter their GitHub username.</figcaption>
</figure>
<p>Now the genuinely useful part. On GitHub you can link to one exact file, or even one exact line, and send that link in an email. Instead of "the code for Figure 3 is somewhere in my analysis script," you send a link that opens at precisely that line:</p>
<ol>
<li>Open the file on GitHub and click the number next to the line where the code starts. Shift-click a second line number to select a range.</li>
<li>The address bar updates with the lines, something like <code>.../analysis.do#L42-L60</code>.</li>
<li>Copy that link and paste it into your email. It opens right at the code that makes Figure 3.</li>
</ol>
<figure>
<img src="{{ '/assets/git-tutorial/line-permalink.png' | relative_url }}" alt="A range of lines selected on GitHub, highlighted, with the line numbers in the URL">
<figcaption>Click a line number, shift-click another for a range, and the link points straight at that code.</figcaption>
</figure>
<div class="gt-callout">Press <code>y</code> on the keyboard before you copy, and GitHub rewrites the address into a permalink tied to the current commit. That link keeps pointing at the same code even after you edit the file later.</div>
<details class="gt-more">
<summary>Even better: open an issue and keep the discussion next to the code</summary>
<div class="gt-more-body">
<p>An issue is a little discussion thread attached to your repository, made for exactly this. Click the Issues tab, then New issue, write what you want a second opinion on, and paste your line link into the description. Your supervisor gets a notification, replies in the thread, and the whole conversation lives next to the code instead of scattered across your inbox.</p>
<p>Paste a code link into an issue and GitHub expands it into a preview of those exact lines, so whoever is reading does not even have to click through.</p>
</div>
</details>
</section>

<section class="gt-sec reveal" id="undo">
<span class="gt-num">07</span>
<p class="gt-eyebrow">undo</p>
<h2>When it goes wrong, and it will</h2>
<p>The reward for committing often is that mistakes stop being scary. Say that you let an AI rewrite your whole cleaning script and it is quietly broken. One command throws away the mess and drops you back at your last commit:</p>
<pre><code>git restore clean.do      <span class="o"># just this file</span>
git restore .             <span class="o"># everything uncommitted</span></code></pre>
<p>Anything you committed is safe; only your uncommitted edits to tracked files vanish. Two honest caveats. If you already ran <code>git add</code> on the broken version, use <code>git restore --staged --worktree .</code> instead, which undoes the staged and unstaged changes together. And if the AI created brand-new files, git is not tracking them yet. <code>git restore</code> leaves those alone, so you delete them by hand.</p>
<p>With that caveat, this is the command that lets you be brave. Try the wild idea, and if it flops, <code>git restore .</code> and you are home.</p>
</section>

<section class="gt-sec gt-shade reveal" id="ai">
<span class="gt-num">08</span>
<p class="gt-eyebrow">the modern bit</p>
<h2>Git in the age of AI</h2>
<p>An AI will hand you code that is fast, confident, and occasionally wrong in ways that are easy to miss. The single most important habit has nothing to do with git: make sure that you understand any code an AI gives you before you use it. If you cannot explain what a line does, do not ship it, no matter who or what wrote it.</p>
<p>Git is what makes that habit safe to practice. Three moves do most of the work.</p>
<h3>Commit before you paste in a big rewrite</h3>
<p>With a clean snapshot behind you, whatever the AI does is one <code>git restore .</code> from undone, so you can try the bold suggestion without fear.</p>
<h3>Read the diff of what it gave you</h3>
<p>Ask it to fix one line and you may get forty changed lines back. <code>git diff</code> shows you the other thirty-nine before they quietly become part of your project. Reviewing the diff is now a bigger part of the work than typing the lines ever was.</p>
<h3>Let it help you fix errors</h3>
<p>When a command fails, copy the error message together with the few lines that produced it, paste both into the AI, and ask what went wrong. The exact error text is the most useful thing that you can hand it. And because you committed first, you can try its suggested fix, read the diff, and <code>git restore .</code> if it makes things worse.</p>
<div class="gt-callout">Pasting a confusing diff back to the AI and asking it to explain the change, or to draft your commit message, is fair game and genuinely handy. The line that does not move: <strong>you understand the code yourself before it goes in.</strong></div>
<details class="gt-more">
<summary>A worked example: ask the AI to explain a diff and draft the message</summary>
<div class="gt-more-body">
<p>Say that <code>git diff</code> shows you this, and you are not certain what changed or how to describe it:</p>
<pre><code><span class="del">-egen mean_income = mean(income)</span>
<span class="add">+egen mean_income = mean(income), by(village)</span></code></pre>
<p>Paste it into the AI with a prompt like:</p>
<pre><code>Here is a git diff from my Stata cleaning script.
Explain in one sentence what changed and what it now
does differently, then suggest a short commit message.</code></pre>
<p>You get back something like: the mean is now computed within each village rather than across the whole sample, so <code>mean_income</code> becomes a village-level average. And a commit message it might draft:</p>
<pre><code>git commit -m "Compute mean income by village, not pooled"</code></pre>
<p>You read the diff, confirm that the explanation matches what you actually see, and only then commit. The AI drafted the words; you stayed the author.</p>
</div>
</details>
</section>

<section class="gt-sec reveal" id="card">
<span class="gt-num">09</span>
<p class="gt-eyebrow">keep this</p>
<h2>The whole thing on one card</h2>
<table>
<thead><tr><th>Command</th><th>What it does</th></tr></thead>
<tbody>
<tr><td><code>git init</code></td><td>Start tracking the current folder</td></tr>
<tr><td><code>.gitignore</code></td><td>A file listing what git should never track (data, secrets)</td></tr>
<tr><td><code>git status</code></td><td>Show what changed and what is staged</td></tr>
<tr><td><code>git add &lt;file&gt;</code></td><td>Stage a file for the next commit</td></tr>
<tr><td><code>git add .</code></td><td>Stage everything that changed</td></tr>
<tr><td><code>git commit -m "msg"</code></td><td>Record the staged changes as a snapshot</td></tr>
<tr><td><code>git diff</code></td><td>Show unstaged changes, line by line</td></tr>
<tr><td><code>git diff --staged</code></td><td>Show what you are about to commit</td></tr>
<tr><td><code>git log --oneline</code></td><td>List past commits, compactly</td></tr>
<tr><td><code>git restore .</code></td><td>Discard uncommitted changes</td></tr>
<tr><td><code>git push</code> / <code>git pull</code></td><td>Send commits to GitHub / bring them down</td></tr>
</tbody>
</table>
<p>If you remember nothing else: commit small, commit often, and read the diff before every commit. That one habit will save you more grief than every advanced feature combined.</p>
</section>

</div>

<script>
(function(){
  var root=document.getElementById('gittut');
  if(!root) return;
  root.classList.add('gt-js');
  var els=Array.prototype.slice.call(root.querySelectorAll('.reveal'));
  function show(el){el.classList.add('is-visible');}
  if(!('IntersectionObserver' in window)){els.forEach(show);return;}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){show(e.target);io.unobserve(e.target);}});
  },{threshold:0.12});
  function init(){
    var vh=window.innerHeight||document.documentElement.clientHeight;
    els.forEach(function(el){
      if(el.getBoundingClientRect().top < vh*0.92){show(el);} else {io.observe(el);}
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}

  var toc=root.querySelector('.gt-toc');
  if(toc && 'IntersectionObserver' in window){
    var links={};
    toc.querySelectorAll('a').forEach(function(a){links[a.getAttribute('href').slice(1)]=a;});
    var spy=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          for(var k in links){links[k].classList.remove('active');}
          if(links[e.target.id]) links[e.target.id].classList.add('active');
        }
      });
    },{rootMargin:'-15% 0px -75% 0px'});
    root.querySelectorAll('.gt-sec[id]').forEach(function(s){spy.observe(s);});
  }
})();
</script>
