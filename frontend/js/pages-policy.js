// ============================================================
// POLICY PAGES — placeholder structure with correct headings.
// Final legal wording is reviewed and added before production.
// ============================================================
import { escapeHtml } from './ui.js';

function policyPage(title, sections) {
  return {
    title,
    html: `
      <div class="card policy-body">
        <div class="placeholder-note">
          ⚠️ Placeholder content — the final legal wording will be reviewed and added before production launch.
        </div>
        <h2 style="font-size:1.3rem;font-weight:800">${escapeHtml(title)}</h2>
        ${sections.map(([h, body]) => `
          <h3>${escapeHtml(h)}</h3>
          ${body}
        `).join('')}
      </div>
    `,
  };
}

export async function PrivacyPage() {
  return policyPage('Privacy Policy', [
    ['1. Information We Collect', '<p>This platform collects only the minimum information needed to operate: your display name and district. We do not collect email addresses, phone numbers, or passwords during the demo phase. (Placeholder)</p>'],
    ['2. How We Use Information', '<p>Collected information is used to manage your profile, task history, and coin balance. (Placeholder)</p>'],
    ['3. Data Storage', '<p>In this demo build, all data is stored locally on your device. Final storage policy will be defined before production. (Placeholder)</p>'],
    ['4. Third-Party Services', '<p>WhatsApp is used only as an external communication channel via direct chat links. (Placeholder)</p>'],
    ['5. Your Rights', '<p>You may request correction or removal of your profile data by contacting the administrator. (Placeholder)</p>'],
    ['6. Changes to This Policy', '<p>Any updates will be posted on this page before the production launch. (Placeholder)</p>'],
  ]);
}

export async function TermsPage() {
  return policyPage('Terms of Service', [
    ['1. About the Platform', '<p>This platform lets users complete small tasks and earn coins after administrator verification. (Placeholder)</p>'],
    ['2. Eligibility', '<p>Users must provide accurate profile information. One profile per person. (Placeholder)</p>'],
    ['3. Task Rules', '<p>Tasks must be completed honestly with genuine proof. Fake, edited, or duplicate submissions are rejected. (Placeholder)</p>'],
    ['4. Coin Rewards', '<p>Coins are credited manually by the administrator after verification. Coins are not automatic and hold no cash value in this phase. (Placeholder)</p>'],
    ['5. Account Suspension', '<p>The administrator may block accounts that violate the rules. (Placeholder)</p>'],
    ['6. Limitation of Liability', '<p>Final legal terms will be added before production launch. (Placeholder)</p>'],
  ]);
}

export async function TaskRulesPage() {
  return policyPage('Task & Reward Rules', [
    ['1. Complete Tasks Honestly', '<ul><li>Follow every step listed in the task instructions.</li><li>Record your screen from the beginning until completion.</li></ul>'],
    ['2. Prohibited Behavior', '<ul><li>Submitting edited or fake proof.</li><li>Duplicate submissions for the same task.</li><li>Using bots, emulators, or multiple accounts.</li></ul>'],
    ['3. Verification', '<p>All submissions are reviewed manually by the administrator. Rewards are added only after verification. (Placeholder)</p>'],
    ['4. Rejections', '<p>Rejected submissions do not earn coins. Repeated violations may lead to account blocking. (Placeholder)</p>'],
    ['5. Coin Adjustments', '<p>The administrator may adjust coins for corrections, with a recorded reason. (Placeholder)</p>'],
  ]);
}

export async function ContactPage() {
  return {
    title: 'Contact / Support',
    html: `
      <div class="card policy-body">
        <div class="placeholder-note">
          ⚠️ Placeholder content — final contact details will be added before production launch.
        </div>
        <h2 style="font-size:1.3rem;font-weight:800">Contact / Support</h2>
        <h3>Need Help?</h3>
        <p>The fastest way to reach the administrator is through WhatsApp. Use the WhatsApp button on the tasks page or your profile page.</p>
        <h3>Task Submissions</h3>
        <p>Send your task-completion videos to the administrator on WhatsApp. Include your User ID so your submission can be matched to your profile.</p>
        <h3>Support Hours</h3>
        <p>Placeholder — support hours will be announced before production launch.</p>
      </div>
    `,
  };
}
