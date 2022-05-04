---
title: "{{ .Name  | humanize }}"
date: {{ .Date }}
draft: true
chapter: {{ index (split .File.TranslationBaseName "_") 0 }}
section:
---

_Coming soon..._
