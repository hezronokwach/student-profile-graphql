School Profile GraphQL
A Vanilla JavaScript web app that displays a user's school profile, including ID, login, XP, grades, and statistical graphs (XP over time, pass/fail ratio) using GraphQL queries and SVG-based visualizations with D3.js. Features JWT-based authentication and a responsive UI.
Features

Login Page: Authenticates users via username/email and password, storing a JWT.
Profile Page: Displays user ID, login, total XP, recent grades, and two SVG graphs (line chart for XP, pie chart for pass/fail ratio).
GraphQL Queries: Fetches data using normal, nested, and argument-based queries.
Responsive Design: Works on desktop and mobile.
Built with Vite: Modern build tool for development and production.

Prerequisites

Node.js (v16 or higher)
npm
Access to the GraphQL API endpoint (https://((DOMAIN))/api/graphql-engine/v1/graphql) and auth endpoint (https://((DOMAIN))/api/auth/signin).

Setup

Clone the repository:git clone https://github.com/your-username/school-profile-graphql.git
cd school-profile-graphql


Install dependencies:npm install


Update the API endpoint:
Replace ((DOMAIN)) in src/js/login.js and src/js/profile.js with the actual domain.



Running Locally

Start the development server:npm start


Open http://localhost:5173/index.html in your browser.
Log in with your credentials to view the profile page.

Building for Production

Build the app:npm run build


The production-ready files are in the dist/ folder.

Deploying to GitHub Pages

Install gh-pages:npm install --save-dev gh-pages


Update package.json scripts:"scripts": {
  "start": "vite",
  "build": "vite build",
  "deploy": "gh-pages -d dist"
}


Set the homepage in package.json:"homepage": "https://your-username.github.io/school-profile-graphql"


Deploy:npm run build
npm run deploy


Access at https://your-username.github.io/school-profile-graphql.

Project Structure

src/: Source files
css/: Styles (login.css, profile.css, styles.css)
js/: Scripts (login.js, main.js, profile.js)
pages/: HTML pages (login.html, profile.html)
index.html: Main entry point


vite.config.js: Vite configuration
dist/: Built files for production

Dependencies

axios: HTTP requests for login
graphql-request: GraphQL queries
jwt-decode: JWT parsing
vite: Build tool
d3.js: SVG graphs (via CDN)

Notes

Replace ((DOMAIN)) with the actual API domain.
Test GraphQL queries in GraphiQL if available.
Ensure CORS is enabled on the API server for deployment.

License
MIT
