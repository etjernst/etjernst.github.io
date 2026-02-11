---
layout: page
permalink: /resources/
title: resources
description: Resources for students.
nav: true
nav_order: 5
display_categories: [for students]
horizontal: false
published: true
---

<div class="projects">
{%- if page.display_categories %}
  {%- for category in page.display_categories %}
  <h2 class="category">{{ category }}</h2>
  {%- assign categorized_resources = site.resources | where: "category", category -%}
  {%- assign sorted_resources = categorized_resources | sort: "importance" %}
  <div class="grid">
    {%- for project in sorted_resources -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
  {% endfor %}

{%- else -%}
  {%- assign sorted_resources = site.resources | sort: "importance" -%}
  <div class="grid">
    {%- for project in sorted_resources -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
{%- endif -%}
</div>
