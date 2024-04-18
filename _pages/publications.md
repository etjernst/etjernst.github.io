---
layout: page
permalink: /publications/
title: publications
nav: true
nav_order: 2
toc:
  sidebar: left
---
<!-- _pages/publications.md -->
<div class="publications">

<h3>Policy Notes</h3>
<ul>
{% bibliography --query @*[keywords=policy_brief] %}
</ul>

<h3>Other Non-Peer-Reviewed Publications</h3>
<ul>
{% bibliography --query @*[keywords=non_refereed_pubs] %}
</ul>


</div>
