---
layout: page
permalink: /research/
title: research
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

* [publications](#published)
* [working papers](#working-papers)
* [other writing](#policy-briefs)
* [policy briefs](#other-writing)

<div class="publications">
  <ul>
  {% bibliography -f papers --group_by type %}
  </ul>
</div>
