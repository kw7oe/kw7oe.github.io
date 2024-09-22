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
      colors: {
	df: {
	  bg: "#ebe5df",
	  "fg-400": "#4c4769",
	  "fg-300": "#575279",
	  "fg-200": "#625c87",
	  "fg-100": "#a8a3b3",
	}
      },
      typography: {
	DEFAULT: {
	  css: {
	    h4: {
	      marginTop: "2.5rem",
	      marginBottom: "1.5rem"
	    },
	    "hr": {
	      "borderColor": "#d8d0ca"
	    },
	    "pre": {
	      "backgroundColor": "#e0dad5",
	      "marginTop": "0.75rem",
	      "marginBottom": "1.25rem",
	      "borderRadius": "0.25rem",
	      "lineHeight": "1.5",
	      "whiteSpace": "pre-wrap",
	      "overflowX": "auto",
	    },
	    "pre code": {
	      "color": "#333"
	    },
	    "code": {
	      "font-size": "0.875rem",
	      "background-color": "#e0dad5",
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

