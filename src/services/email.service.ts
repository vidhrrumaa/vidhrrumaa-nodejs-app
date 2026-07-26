import config from '../config';
import mailer from './mailer.service';

export interface ContactData {
  fullName: string;
  email: string;
  message: string;
}

export interface CareerData {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  areaOfInterest: string;
  yearsOfExperience: number;
  domains: string[];
  softwareExpertise: string[];
  coverLetter?: string;
}

type UploadedFile = Express.Multer.File;

// Escape user input so it can't inject markup into the email HTML.
function escapeHtml(str: unknown = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const v = Array.isArray(value) ? value.join(', ') : value;
  return `<tr><td style="padding:6px 12px;font-weight:600;vertical-align:top">${escapeHtml(
    label
  )}</td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`;
}

function wrapTable(title: string, rowsHtml: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
    <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
    <table style="border-collapse:collapse;border:1px solid #eee">${rowsHtml}</table>
  </div>`;
}

function toAttachments(file?: UploadedFile) {
  if (!file) return [];
  return [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }];
}

async function sendContactMessage(data: ContactData, file?: UploadedFile) {
  const rows = [
    row('Full name', data.fullName),
    row('Email', data.email),
    row('Message', data.message),
    file ? row('Attachment', file.originalname) : '',
  ].join('');

  return mailer.sendMail({
    from: config.mail.from,
    to: config.mail.contactTo,
    replyTo: `${data.fullName} <${data.email}>`,
    subject: `New contact message from ${data.fullName}`,
    html: wrapTable('New Contact Message', rows),
    attachments: toAttachments(file),
  });
}

async function sendCareerApplication(data: CareerData, file?: UploadedFile) {
  const rows = [
    row('First name', data.firstName),
    row('Last name', data.lastName),
    row('Email', data.email),
    row('Contact number', data.contactNumber),
    row('Area of interest', data.areaOfInterest),
    row('Years of experience', data.yearsOfExperience),
    row('Domain(s)', data.domains),
    row('Software expertise', data.softwareExpertise),
    row('Cover letter / summary', data.coverLetter),
    file ? row('Resume', file.originalname) : '',
  ].join('');

  return mailer.sendMail({
    from: config.mail.from,
    to: config.mail.careersTo,
    replyTo: `${data.firstName} ${data.lastName} <${data.email}>`,
    subject: `Career application: ${data.firstName} ${data.lastName} (${data.areaOfInterest})`,
    html: wrapTable('New Career Application', rows),
    attachments: toAttachments(file),
  });
}

export { sendContactMessage, sendCareerApplication };
export default { sendContactMessage, sendCareerApplication };
