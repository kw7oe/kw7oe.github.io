# AGENTS.md

1. Prefer targeted reads/searches (`rg` with narrow scopes) over broad scans.
2. Do not scan generated directories (`public/`, minified bundles, build artifacts) unless explicitly required.
   - Treat `themes/my-theme/assets/css/styles.css` as generated output; do not read it unless explicitly requested or needed for verification.
3. Summarize command output instead of returning large raw output blocks.
4. Avoid repeated full-file reads when small line-range reads are sufficient.
5. Batch related edits and run verification at milestone points rather than after every small change.
6. Keep style edits in canonical source files; avoid duplicate edits across generated/compiled assets unless necessary.
7. Use one build/test pass per milestone by default, then an optional final confirmation pass.
8. When debugging UI, prefer inspecting source templates/styles first; check with the user when insufficient.
9. Avoid inspect rendered output when source-level checks are insufficient.
10. Do not run Tailwind build/watch commands for verification by default; assume the user already has a Tailwind server running unless they explicitly ask you to run it.
