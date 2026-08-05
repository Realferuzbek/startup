# Makleer.uz

Makleer is a rental marketplace for Uzbekistan that connects estate agents
(maklers) with customers. This guide explains how to run the website on your own
computer. You do not need to be a programmer to follow it — just do each
numbered step in order.

## 1. Install the required software (one time only)

1. Install **Node.js version 20 or newer**. Go to https://nodejs.org, download
   the version labeled "LTS", and run the installer with the default options.
2. After it finishes, open a terminal (on Windows this is called
   **PowerShell** — search for it in the Start menu) and type the command
   below, then press Enter:

   ```
   node --version
   ```

   You should see a number like `v20.x.x` or higher. If you do, the software is
   installed correctly.

## 2. Install the project (one time only)

1. Open the terminal in the project folder (the folder that contains this
   README file).
2. Type this command and press Enter, then wait for it to finish (it may take a
   few minutes):

   ```
   npm install
   ```

## 3. Add your secret keys

The website needs four secret values to connect to its services. They are kept
in a private file called `.env.local` that is never shared or uploaded.

1. In the project folder, find the file named **`.env.example`**.
2. Make a copy of it and rename the copy to **`.env.local`**.
3. Open `.env.local` in a text editor. You will see four lines, each ending
   with an `=` sign:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_YANDEX_MAPS_API_KEY=
   ```

4. Paste the correct value after each `=` sign (no spaces, no quotes). The first
   three come from the Supabase project dashboard; the last one is the Yandex
   Maps API key.
5. Save the file.

> **Important:** Every one of the four values must be filled in. If any value is
> missing, the website will refuse to start and will show a message naming
> exactly which value is missing. That is intentional — it protects you from
> running the site with a broken configuration.

## 4. Run the website on your computer

1. In the terminal, type this command and press Enter:

   ```
   npm run dev
   ```

2. Wait until you see a line that shows a web address, usually
   `http://localhost:3000`.
3. Open that address in your web browser. You will be sent automatically to the
   Uzbek version of the site at `http://localhost:3000/uz`.
4. To stop the website, click the terminal and press **Ctrl + C**.

## 5. Build the website for production

When you are ready to publish the site, you create an optimized version:

1. Type this command and press Enter, then wait for it to finish:

   ```
   npm run build
   ```

2. To run that optimized version locally, type:

   ```
   npm start
   ```

That's it. For day-to-day work you only need step 4 (`npm run dev`).
