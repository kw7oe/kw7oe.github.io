---
title: "{{ index (split (replace .Name "-" " " ) "_") 1 | title }}"
date: {{ .Date }}
draft: true
chapter: {{ index (split .File.TranslationBaseName "_") 0 }}
---


