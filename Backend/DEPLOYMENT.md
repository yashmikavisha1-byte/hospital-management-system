# Deploy the backend to Vercel

The API is configured for Vercel in this directory. It uses MongoDB Atlas for
persistent storage. Production startup fails if `MONGO_URI` is missing or the
database cannot be reached; it will not silently switch to temporary
in-memory data.

## 1. Create a MongoDB Atlas database

Create a database user and an Atlas cluster, then copy the application's
connection string. Replace the username and password placeholders and include
the `hospital` database name, for example:

```text
mongodb+srv://<username>:<password>@<cluster-host>/hospital?retryWrites=true&w=majority
```

In Atlas **Network Access**, allow connections from the host where the API will
run. Serverless hosting may not provide a fixed outbound IP; if Atlas requires
it, `0.0.0.0/0` permits connections from any IP. Use a strong, unique database
password and review your hosting plan's network-security options.

## 2. Deploy the backend

In Vercel, import this GitHub repository as a new project. Set **Root
Directory** to `Backend`, enable **Include files outside the root directory**
if Vercel offers that option, and use Node.js 22.x. `vercel.json` explicitly
builds only `api/index.js` as a serverless function and routes requests to it,
so application modules such as `app.js` are not treated as functions.

Add these environment variables in the Vercel project settings for Production:

- `NODE_ENV`: `production`
- `MONGO_URI`: the Atlas connection string
- `JWT_SECRET`: a long, random secret
- `JWT_EXPIRES_IN`: `8h`
- `CLIENT_URL`: `https://yashmikavisha1-byte.github.io`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: optional; if set, the first admin is
  created when the service initializes

Keep credentials in Vercel's environment-variable settings, not in Git. Deploy
the project, then test `https://<your-vercel-domain>/health`; it should return
`{"status":"ok"}`.

## 3. Connect the GitHub Pages frontend

Set a GitHub Actions repository variable named `VITE_API_URL` to the Vercel
project domain shown in Vercel followed by `/api`. For the current project,
use:

```text
https://hospital-management-system-puce-psi.vercel.app/api
```

In GitHub, open **Settings → Secrets and variables → Actions → Variables**,
add `VITE_API_URL`, then run the **Deploy to GitHub Pages** workflow (or push
to `main`). The workflow accepts the HTTPS backend origin with or without the
`/api` suffix, normalizes it, and passes the resulting API URL to the frontend
build. Confirm `https://hospital-management-system-puce-psi.vercel.app/health`
returns `{"status":"ok"}` before expecting API requests to succeed; the Vercel
deployment must have its Production environment variables configured.
