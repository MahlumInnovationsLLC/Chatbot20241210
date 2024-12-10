/** @type {import('tailwindcss').Config} */
export default {
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