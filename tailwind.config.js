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
                    light: '#60A5FA', // Blue 400
                    DEFAULT: '#3B82F6', // Blue 500
                    dark: '#2563EB', // Blue 600
                },
                secondary: {
                    light: '#34D399', // Emerald 400
                    DEFAULT: '#10B981', // Emerald 500
                    dark: '#059669', // Emerald 600
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
