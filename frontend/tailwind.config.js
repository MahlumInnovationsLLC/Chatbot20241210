/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}"
    ],
    theme: {
        extend: {
            colors: {
                'futuristic-bg': '#0f0f0f',
                'futuristic-accent': '#3b82f6',
            },
            keyframes: {
                slideDown: {
                    '0%': { transform: 'translateY(-20%)', opacity: '0' },
                    '100%': { transform: 'translateY(0%)', opacity: '1' },
                }
            },
            animation: {
                slideDown: 'slideDown 0.3s ease-out forwards'
            }
        },
    },
    plugins: [],
}