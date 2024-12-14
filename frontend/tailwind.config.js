/** @type {import('tailwindcss').Config} */
export default {
    // Enable dark mode by using a class on the html or body element
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
            }
        },
    },
    plugins: [],
}