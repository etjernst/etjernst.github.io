---
layout: page
permalink: /publications/
title: publications
description: 
nav: true
nav_order: 2
---
<!-- _pages/publications.md -->

* [peer-reviewed pubs](#peer-reviewed)
* [policy briefs](policy-briefs)
* [non-refereed pubs](#non-refereed)

<div class="publications" id="top">

<h3 id="peer-reviewed">peer-reviewed</h3>

<ul>
{% bibliography --query @*[keywords=peer\_reviewed] %}
</ul>
</div>

<div class="publications">

<h3 id="policy-briefs">policy briefs</h3>
<ul>
[back to top](top)
</ul>
<ul>
{% bibliography --query @*[keywords=policy\_brief] %}
</ul>

<h3 id="non-refereed">non-refereed pubs</h3>

[back to top](top)

<ul>
{% bibliography --query @*[keywords=non\_refereed\_pubs] %}
</ul>

</div>
