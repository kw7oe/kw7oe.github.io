const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'sans': ['Source Sans Pro', ...defaultTheme.fontFamily.sans],
        'serif': ['Lora', ...defaultTheme.fontFamily.serif],
      },
      typography: {
        DEFAULT: {
          css: {
            // h1: {
            //   marginTop: "5rem"
            // },
            h4: {
              marginTop: "2.5rem",
              marginBottom: "1.5rem"
            },
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
              "padding": "0",
              "color": "#333"
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
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/line-clamp'),
  ]
}

