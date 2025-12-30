
# GeoLiner QC - Deployment Guide

## How to Publish this App

This is a React application built with Vite. To publish it to the web so you can install it on your phone:

### 1. Download Source Code
Download the project files from your editor to your local computer.

### 2. Install Dependencies
Open a terminal (Command Prompt) in the project folder and run:
```bash
npm install
```

### 3. Build for Production
Run the build command to create the optimized app:
```bash
npm run build
```
This will create a `dist` folder. This folder contains your actual application.

### 4. Deploy

#### Option A: PC / Desktop (Netlify Drop)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the `dist` folder onto the page.
3. Your app is now live!

#### Option B: Tablet / Mobile (StackBlitz)
If you do not have a computer, you can use a Cloud IDE:
1. Go to [StackBlitz.com](https://stackblitz.com).
2. Start a new **React TypeScript** project.
3. Copy the code from `App.tsx`, `components/`, etc., into the online editor.
4. StackBlitz will build the app in the browser and give you a live URL.

#### Option C: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` inside the project folder.

## How to Update

1. Ask the AI to make changes.
2. Download the updated files.
3. Run `npm run build` again.
4. Upload the new `dist` folder to Netlify/Vercel.
