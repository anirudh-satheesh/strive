# Strive

Strive is a modern fitness tracking application built with React, TypeScript, and Vite. It helps users manage their exercise library, track workouts, and visualize progress.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd strive
```

### 2. Install Dependencies

Install the required packages using npm:

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add your Firebase configuration. You can use the provided `.env.example` as a template:

```bash
cp .env.example .env
```

Fill in the `.env` file with your actual Firebase project credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Generate Firebase Configuration

The project uses a custom script to generate a static Firebase configuration file for specific deployment needs. Run the following command:

```bash
node create-firebase-config.mjs
```

This will create `public/firebase-config.js` based on your environment variables.

### 5. Run the Project

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in the `dist` directory.

## Linting

To check for linting errors:

```bash
npm run lint
```

## Project Structure

- `src/`: Core application logic and components.
- `public/`: Static assets and generated configuration.
- `legacy/`: Legacy code and components.
