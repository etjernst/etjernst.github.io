---
layout: page
permalink: /publications/
title: publications
nav: true
nav_order: 2

---
<!-- _pages/publications.md -->
<div class="publications">

<h2>Peer-Reviewed Publications</h2>
<ul>
{% bibliography --query @*[keywords=peer\_reviewed] %}
</ul>

<h2>Non-Refereed Publications</h2>
<ul>
{% bibliography --query @*[keywords=non_refereed_pubs OR policy_brief] %}
</ul>

</div>
