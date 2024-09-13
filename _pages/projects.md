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
    width: 330px;  /* Set a fixed width for all project boxes */
    height: 400px; /* Set a fixed height for all project boxes */
    overflow: hidden;
    padding: 15px;
    border: none;
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
    max-height: 3em; /* Limit title to two lines */
    text-overflow: ellipsis; /* Truncate long titles with ellipsis */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3; /* Limit title to 3 lines */
  }

  .project-description {
    flex-grow: 1;
    flex-shrink: 0; /* Prevents shrinking */
    max-height: 6em; /* Limit description height to fit */
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; /* Limit description to 2 lines */
    line-height: 1.4em;
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