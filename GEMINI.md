# Gemini Project: ERechnung SaaS

This document provides a comprehensive overview of the ERechnung SaaS project, designed to give an AI assistant the context needed to understand and contribute to the project.

## Project Overview

ERechnung is a Software-as-a-Service (SaaS) platform for creating and managing electronic invoices, specifically tailored for the German market with support for ZUGFeRD 2.x / Factur-X standards.

The project is structured as a monorepo with two main components:

*   **`frontend`**: A modern web application built with Next.js (App Router), TypeScript, and Tailwind CSS. It provides the user interface for all features.
*   **`backend`**: A Node.js and Express API written in TypeScript. It handles business logic, data persistence, and communication with the database.

The entire application is containerized using Docker for consistent development and deployment environments.

### Key Technologies

*   **Frontend**:
    *   Framework: Next.js 16 (App Router)
    *   Language: TypeScript
    *   Styling: Tailwind CSS
    *   UI Components: Shadcn/UI, Lucide Icons
    *   Charts: Recharts
*   **Backend**:
    *   Framework: Express.js
    *   Language: TypeScript
    *   Database: PostgreSQL
    *   Authentication: JWT (JSON Web Tokens)
*   **Infrastructure**:
    *   Containerization: Docker, Docker Compose

## Building and Running the Project

The project is designed to be run using Docker Compose, which orchestrates the backend, database, and other services.

### Development Environment

**1. Start all services:**

The primary way to run the entire application stack is with Docker Compose.

```bash
# This command will build the images if they don't exist and start all services.
docker-compose up -d --build
```

**2. Running Frontend in local dev mode:**

For a faster development feedback loop, you can run the frontend Next.js application directly on your host machine.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000` and will connect to the backend API running in Docker on `http://localhost:3001`.

**3. Running Backend in local dev mode:**

You can also run the backend directly on your host machine.

```bash
cd backend
npm install
npm run dev
```

The backend will be available at `http://localhost:3001`.

### Key Scripts

**Frontend (`frontend/package.json`):**

*   `npm run dev`: Starts the Next.js development server.
*   `npm run build`: Creates a production build of the frontend.
*   `npm run start`: Starts the production server for the built Next.js app.
*   `npm run lint`: Lints the frontend codebase.

**Backend (`backend/package.json`):**

*   `npm run dev`: Starts the backend server in development mode with hot-reloading (`tsx`).
*   `npm run build`: Compiles the TypeScript code to JavaScript.
*   `npm run start`: Runs the compiled JavaScript code.
*   `npm run lint`: Lints the backend codebase.

## Development Conventions

*   **Code Style**: The project uses ESLint for both frontend and backend to enforce a consistent code style.
*   **Monorepo Structure**: All project code is contained within the root directory, separated into `frontend` and `backend` folders.
*   **Configuration**: Environment variables are used for configuration (see `backend/.env.example` and `docker-compose.yml`). The frontend uses Next.js's built-in environment variable support.
*   **API Communication**: The frontend communicates with the backend via a RESTful API. The base URL for the API in development is `http://localhost:3001`.
*   **Database**: A PostgreSQL database is used for data storage. The schema is initialized via the `backend/init.sql` file when the Docker container is first created.
*   **Project State**: The file `verbesserung.txt` contains a detailed list of completed tasks, ongoing work, critical bugs, and future feature plans. This file is an excellent resource for understanding the project's current status and priorities.
