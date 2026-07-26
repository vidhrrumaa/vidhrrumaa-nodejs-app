# Calling the API from React

Two rules for the CSRF protection to work:

1. Every request needs `credentials: 'include'` so the cookie is sent/stored.
2. Send the token back in the `x-csrf-token` header on POSTs.

When sending a file via `FormData`, don't set `Content-Type` yourself - the
browser sets the correct `multipart/form-data; boundary=...` automatically.

---

## 1. A small reusable API helper (`src/api/mailer.js`)

```js
const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.your-domain.com/api/v1';

// Fetch a CSRF token (also sets the signed cookie via credentials:'include').
async function getCsrfToken() {
  const res = await fetch(`${API_BASE}/csrf-token`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not initialize secure session');
  const { csrfToken } = await res.json();
  return csrfToken;
}

// Generic secured POST of FormData.
async function postForm(path, formData) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken }, // NOTE: no Content-Type here
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || 'Request failed';
    const err = new Error(message);
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

export function sendContactMessage({ fullName, email, message, attachment }) {
  const fd = new FormData();
  fd.append('fullName', fullName);
  fd.append('email', email);
  fd.append('message', message);
  fd.append('website', ''); // honeypot: keep empty
  if (attachment) fd.append('attachment', attachment);
  return postForm('/email/contact', fd);
}

export function sendCareerApplication(app) {
  const fd = new FormData();
  fd.append('firstName', app.firstName);
  fd.append('lastName', app.lastName);
  fd.append('email', app.email);
  fd.append('contactNumber', app.contactNumber);
  fd.append('areaOfInterest', app.areaOfInterest);
  fd.append('yearsOfExperience', String(app.yearsOfExperience));
  // Multi-selects: send as JSON strings (the server parses either form).
  fd.append('domains', JSON.stringify(app.domains || []));
  fd.append('softwareExpertise', JSON.stringify(app.softwareExpertise || []));
  fd.append('coverLetter', app.coverLetter || '');
  fd.append('website', ''); // honeypot
  if (app.resume) fd.append('resume', app.resume);
  return postForm('/email/careers', fd);
}
```

---

## 2. Contact form component (`src/components/ContactForm.jsx`)

```jsx
import { useState } from 'react';
import { sendContactMessage } from '../api/mailer';

export default function ContactForm() {
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', message: '' });
    const f = e.target;
    try {
      await sendContactMessage({
        fullName: f.fullName.value,
        email: f.email.value,
        message: f.message.value,
        attachment: f.attachment.files[0] || null,
      });
      setStatus({ state: 'success', message: 'Thanks! We\'ll be in touch.' });
      f.reset();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="fullName" placeholder="Full name" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />
      <input name="attachment" type="file" />
      {/* Honeypot: visually hidden, must stay empty. */}
      <input name="website" tabIndex="-1" autoComplete="off"
             style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true" />
      <button disabled={status.state === 'sending'}>Send</button>
      {status.message && <p>{status.message}</p>}
    </form>
  );
}
```

---

## 3. Careers form (multi-selects + resume)

```jsx
import { useState } from 'react';
import { sendCareerApplication } from '../api/mailer';

export default function CareersForm() {
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', message: '' });
    const f = e.target;
    const getMulti = (name) =>
      Array.from(f[name].selectedOptions).map((o) => o.value);
    try {
      await sendCareerApplication({
        firstName: f.firstName.value,
        lastName: f.lastName.value,
        email: f.email.value,
        contactNumber: f.contactNumber.value,
        areaOfInterest: f.areaOfInterest.value,
        yearsOfExperience: Number(f.yearsOfExperience.value),
        domains: getMulti('domains'),
        softwareExpertise: getMulti('softwareExpertise'),
        coverLetter: f.coverLetter.value,
        resume: f.resume.files[0] || null,
      });
      setStatus({ state: 'success', message: 'Application submitted!' });
      f.reset();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First name" required />
      <input name="lastName" placeholder="Last name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="contactNumber" placeholder="Contact number" required />
      <input name="areaOfInterest" placeholder="Area of interest" required />
      <input name="yearsOfExperience" type="number" min="0" max="60" required />

      <select name="domains" multiple required>
        <option value="Banking">Banking</option>
        <option value="Healthcare">Healthcare</option>
        <option value="Retail">Retail</option>
      </select>

      <select name="softwareExpertise" multiple required>
        <option value="Java">Java</option>
        <option value="Node.js">Node.js</option>
        <option value="React">React</option>
        <option value="Python">Python</option>
      </select>

      <textarea name="coverLetter" placeholder="Cover letter / profile summary" />
      <input name="resume" type="file" required />
      <input name="website" tabIndex="-1" autoComplete="off"
             style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true" />
      <button disabled={status.state === 'sending'}>Apply</button>
      {status.message && <p>{status.message}</p>}
    </form>
  );
}
```

---

## Handling validation errors

On a `400`, the response includes `error.details` — an array of
`{ field, message }` you can map to inline field errors:

```js
catch (err) {
  if (err.details) {
    // err.details = [{ field: 'email', message: 'must be a valid email' }, ...]
  }
}
```
