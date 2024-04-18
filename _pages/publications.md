---
layout: page
permalink: /publications/
title: publications
nav: true
nav_order: 2
toc:
  sidebar: left
  - title: peer-reviewed
    url: #peer-reviewed
  - title: policy-briefs
    url: #policy-briefs  
  - title: non-refereed
    url: #non-refereed-pubs
    
---
<!-- _pages/publications.md -->
<div class="publications">

<h3>peer-reviewed</h3>
<ul>
{% bibliography --query @*[keywords=peer\_reviewed] %}
</ul>
</div>

<div class="publications">

<h3>policy briefs</h3>
<ul>
{% bibliography --query @*[keywords=policy\_brief] %}
</ul>

<h3>non-refereed pubs</h3>
<ul>
{% bibliography --query @*[keywords=non\_refereed\_pubs] %}
</ul>

</div>
