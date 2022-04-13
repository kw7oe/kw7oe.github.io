module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.html"
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            "pre": {
              "backgroundColor": "#edf2f7",
              "marginTop": "0.75rem",
              "marginBottom": "1.25rem",
              "padding": "0.5rem",
              "borderRadius": "0.25rem",
              "lineHeight": "1.5",
              "whiteSpace": "pre-wrap",
              "overflowX": "auto",
            },
            "pre code": {
              "padding": "0"
            },
            "code": {
              "font-size": "0.875rem",
              "background-color": "#edf2f7",
              "padding": "0.25rem",
              "border-radius": "0.25rem",
              "width": "100%"
            }
          }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/line-clamp'),
  ]
}

