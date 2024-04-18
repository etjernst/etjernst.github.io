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

<h3>peer-reviewed</h3>
<ul>
{% bibliography --query @*[keywords=peer\_reviewed] %}
</ul>

<h3>policy notes & other</h3>
<ul>
{% bibliography --query @*[keywords=non\_refereed\_pubs OR policy\_brief] %}
</ul>

</div>
