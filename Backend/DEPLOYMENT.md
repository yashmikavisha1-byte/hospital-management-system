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
- `GOOGLE_CLIENT_ID`: the OAuth 2.0 Web application client ID
- `GOOGLE_CLIENT_SECRET`: the matching OAuth 2.0 client secret
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: optional bootstrap credentials; if set,
  the first admin is created when the service initializes
- `BOOTSTRAP_PATIENT_EMAIL`, `BOOTSTRAP_PATIENT_PASSWORD`,
  `BOOTSTRAP_PATIENT_AGE`, `BOOTSTRAP_PATIENT_GENDER`, and
  `BOOTSTRAP_PATIENT_PHONE`: optional initial patient account and linked
  patient profile. Set all five together. Use a unique password of at least
  12 characters. `BOOTSTRAP_PATIENT_NAME` and `BOOTSTRAP_PATIENT_ADDRESS`
  are optional.

Keep credentials in Vercel's environment-variable settings, not in Git. Deploy
the project, then test `https://<your-vercel-domain>/health`; it should return
`{"status":"ok"}`.

The bootstrap patient account is created only if its email is not already
registered. The matching patient profile is created if one does not exist.
Existing passwords are never reset by this bootstrap. After saving these
variables in the production backend settings, redeploy or restart the backend
and sign in on the Patient page with the configured email and password. Do not
use the local demo password for a production account.

## Reset or create a local admin login

If the admin email or password is unknown, set a new `ADMIN_EMAIL` and a
unique `ADMIN_PASSWORD` of at least 12 characters in `Backend/.env`. Do not use
a password that has appeared in a screenshot or message. From the repository
root, run:

```powershell
npm --prefix Backend run create-admin
```

This command connects directly to the configured `MONGO_URI`, creates the admin
if that email is unused, or resets the password if it already belongs to an
admin. It refuses to change a non-admin account into an admin. Sign in with
that exact email and the new password. Restarting the server is not required.

For local development only, if Atlas is unavailable and the backend starts
with its in-memory fallback, the backend creates these temporary demo logins
on startup:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@gmail.com | admin123 |
| Doctor | doctor@gmail.com | doctor123 |
| Patient | patient@gmail.com | patient123 |

These accounts exist only for that backend process and are lost when it stops.
Do not use them with a persistent or production database. To save accounts
permanently, configure a working `MONGO_URI` and run `node seedUsers.js` from
the `Backend` directory.

## 3. Configure Google sign-in

In Google Cloud Console, configure an OAuth consent screen and create an OAuth
client ID of type **Web application**. Add these authorized JavaScript origins:

- `http://localhost:5173` for local development
- `http://localhost:5175` if Vite starts on port 5175
- `https://yashmikavisha1-byte.github.io` for the deployed frontend

Set the matching client ID and client secret in the backend environment. Set
the same client ID as `VITE_GOOGLE_CLIENT_ID` in `client/.env` for local
development, then restart the Vite server. For production, add
`VITE_GOOGLE_CLIENT_ID` as a GitHub Actions repository variable if you want
Google sign-in enabled on the deployed site. The client ID is public; never
expose the client secret in the frontend or in a `VITE_` variable. The deploy
workflow warns when the ID is missing and only fails if a configured value is
not a valid Google OAuth Web client ID.

The login page provides separate Admin, Doctor, and Patient Google sign-in
buttons. Google email verification is checked by the backend. Admin and doctor
accounts must already exist with the matching role; only patient accounts can
be created through Google sign-up. Patient registration creates a linked
medical profile so the patient can use appointment and records features.

## 4. Connect the GitHub Pages frontend

Set a GitHub Actions repository variable named `VITE_API_URL` to the Vercel
project domain shown in Vercel followed by `/api`. For the current project,
use:

```text
https://hospital-management-system-puce-psi.vercel.app/api
```

In GitHub, open **Settings → Secrets and variables → Actions → Variables**,
add `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`, then run the **Deploy to GitHub
Pages** workflow (or push to `main`). The workflow accepts the HTTPS backend
origin with or without the `/api` suffix, normalizes it, and passes the API URL
to the frontend build. Confirm
`https://hospital-management-system-puce-psi.vercel.app/health` returns
`{"status":"ok"}` before expecting API requests to succeed; the Vercel
deployment must have its Production environment variables configured.
