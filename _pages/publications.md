---
layout: page
permalink: /publications/
title: publications
description: 
nav: true
nav_order: 2
toc:
  - name: peer-reviewed
  - name: other writing
  - subsections:
    - name: policy briefs
    - name: non-refereed pubs
    # if a section has subsections, you can add them as follows:
    # subsections:
    #   - name: Example Child Subsection 1
    #   - name: Example Child Subsection 2

---
<!-- _pages/publications.md -->

<div class="post" id="top">

</div>

* [peer-reviewed pubs](#peer-reviewed)
* [working papers](#working-papers)
* other writing
  * [policy briefs](#policy-briefs)
  * [non-refereed pubs](#non-refereed)

<div class="publications">
<h3 id="peer-reviewed">peer-reviewed</h3>

<ul>
{% bibliography --query @*[keywords=peer\_reviewed] %}
</ul>
</div>

<div class="publications" id="working-papers">

<h3 id="working-papers">working papers</h3>

<ul>
{% bibliography --query @*[keywords=working\_paper] %}
</ul>
</div>


<div class="publications">

<h3 id="policy-briefs">policy briefs</h3>

<a href="#top">back to top</a>

<ul>
{% bibliography --query @*[keywords=policy\_brief] %}
</ul>

<h3 id="non-refereed">non-refereed pubs</h3>

<a href="#top">back to top</a>

<ul>
{% bibliography --query @*[keywords=non\_refereed\_pubs] %}
</ul>

</div>
