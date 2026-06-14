/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#008ACF', // PAF secondary (light primary)
                    DEFAULT: '#034EA2', // PAF primary
                    dark: '#023d82', // PAF primary hover
                },
                secondary: {
                    light: '#33AADF', // secondary light
                    DEFAULT: '#008ACF', // PAF secondary
                    dark: '#006FA8', // secondary dark
                },
                background: {
                    light: '#F3F4F6', // Gray 100
                    DEFAULT: '#F9FAFB', // Gray 50
                    dark: '#111827', // Gray 900
                },
                card: {
                    light: '#FFFFFF',
                    dark: '#1F2937', // Gray 800
                },
                text: {
                    light: '#1F2937', // Gray 800
                    dark: '#F9FAFB', // Gray 50
                    muted: '#6B7280', // Gray 500
                }
            },
            fontFamily: {
                sans: ['Inter', 'Nunito', 'ui-sans-serif', 'system-ui'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'card': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
            }
        },
    },
    plugins: [
        tailwindcssAnimate
    ],
}
