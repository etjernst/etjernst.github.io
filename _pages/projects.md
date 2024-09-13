---
layout: page
title: projects
permalink: /projects/
description: ongoing field work projects
nav: true
nav_order: 3
display_categories: [ongoing]
horizontal: false
published: true
---

<style>
  /* Define styles for uniform box sizing */
  .grid .project-card {
    width: 300px;  /* Set a fixed width for all project boxes */
    height: 350px; /* Set a fixed height for all project boxes */
    overflow: hidden;
    border: 1px solid #ddd;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .project-card img {
    width: 100%;
    height: 150px;
    object-fit: cover; /* Ensure images are cropped to fit the box */
  }

  .project-title {
    font-size: 18px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* Truncate long titles with ellipsis */
  }

  .project-description {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<!-- pages/projects.md -->
<div class="projects">
{%- if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized projects -->
  {%- for category in page.display_categories %}
  <h2 class="category">{{ category }}</h2>
  {%- assign categorized_projects = site.projects | where: "category", category -%}
  {%- assign sorted_projects = categorized_projects | sort: "importance" %}
  <!-- Generate cards for each project -->
  {% if page.horizontal -%}
  <div class="container">
    <div class="row row-cols-2">
    {%- for project in sorted_projects -%}
      {% include projects_horizontal.html %}
    {%- endfor %}
    </div>
  </div>
  {%- else -%}
  <div class="grid">
    {%- for project in sorted_projects -%}
      <div class="project-card">
        {% include projects.html %}
      </div>
    {%- endfor %}
  </div>
  {%- endif -%}
  {% endfor %}

{%- else -%}
<!-- Display projects without categories -->
  {%- assign sorted_projects = site.projects | sort: "importance" -%}
  <!-- Generate cards for each project -->
  {% if page.horizontal -%}
  <div class="container">
    <div class="row row-cols-2">
    {%- for project in sorted_projects -%}
      {% include projects_horizontal.html %}
    {%- endfor %}
    </div>
  </div>
  {%- else -%}
  <div class="grid">
    {%- for project in sorted_projects -%}
      <div class="project-card">
        {% include projects.html %}
      </div>
    {%- endfor %}
  </div>
  {%- endif -%}
{%- endif -%}
</div>