# Deploying to GoDaddy

Two common setups - pick the one that matches your plan.

- **A. cPanel shared/Business hosting** - uses "Setup Node.js App" (Passenger).
- **B. VPS/Dedicated** - you control the OS, run with PM2 + Nginx.

You need a plan with "Setup Node.js App" in cPanel, or a VPS/Dedicated
server. Basic static/PHP hosting won't run Node.

## A. cPanel ("Setup Node.js App")

1. **Upload the code.** Don't upload `node_modules`. Use cPanel's Git Version
   Control to clone the repo, or zip-upload and extract via File Manager.
   `app.js` must sit at the project root - Passenger uses it as the startup file.

2. **Create the app.** cPanel -> Setup Node.js App -> Create Application:
   - Node.js version: 18.x or newer
   - Application mode: Production
   - Application root: the folder you uploaded to
   - Application URL: e.g. `api.your-domain.com`
   - Application startup file: `app.js`

3. **Set environment variables.** In the same screen, add every variable from
   `.env.example` with real values (or upload a `.env.prod` file instead -
   it's loaded automatically when `NODE_ENV=production`, which "Application
   mode: Production" sets for you).
   Generate `CSRF_SECRET` with:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. **Install and build.** Click "Run NPM Install", then in the app's terminal:
   ```
   npm run build
   ```
   Passenger runs `app.js` with plain `node`, which requires the compiled
   `dist/` folder - re-run `npm run build` after every code change.

5. **Restart** the app in cPanel. Test:
   ```
   https://api.your-domain.com/api/v1/health
   ```

6. **Point React at it.** Set `CORS_ORIGINS` to your site's exact origin(s),
   and use the Application URL as the API base in React. Requests need
   `credentials: 'include'` since the CSRF cookie is used.

## B. VPS/Dedicated (Node + PM2 + Nginx)

```bash
# install Node + PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# get the code and build
git clone <your-repo> vidhrrumaa-nodejs-app
cd vidhrrumaa-nodejs-app
npm install
npm run build
cp .env.example .env.prod && nano .env.prod

# run with PM2 (cluster mode uses all CPU cores)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Put Nginx in front for TLS:

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;
    # ssl_certificate / ssl_certificate_key ... (Let's Encrypt / certbot)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`TRUST_PROXY=1` in `.env.prod` makes Express read those `X-Forwarded-*` headers
correctly for rate limiting and secure cookies.

## Email/SMTP notes

- GoDaddy Workspace Email: `smtpout.secureserver.net`, port `465`, `SMTP_SECURE=true`.
- Microsoft 365 via GoDaddy: `smtp.office365.com`, port `587`, `SMTP_SECURE=false`.
- Send from an address on your own domain and set up SPF/DKIM so mail isn't
  marked as spam. The server checks the SMTP connection at boot and logs the
  result, so bad credentials show up immediately.

## Checklist

- [ ] `app.js` is at the project root and set as the startup file.
- [ ] `node_modules` not uploaded; installed on the server instead.
- [ ] `npm run build` has been run so `dist/` exists.
- [ ] All env vars set (`CORS_ORIGINS`, `CSRF_SECRET`, `SMTP_*`).
- [ ] `NODE_ENV=production` and `TRUST_PROXY=1`.
- [ ] HTTPS is active (required for the secure CSRF cookie in production).
- [ ] `GET /api/v1/health` returns ok.
- [ ] A test submission arrives in the `MAIL_CONTACT_TO` inbox.
