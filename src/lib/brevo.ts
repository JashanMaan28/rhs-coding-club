// Brevo API integration using official SDK
import { 
  TransactionalEmailsApi, 
  ContactsApi, 
  TransactionalEmailsApiApiKeys,
  ContactsApiApiKeys
} from '@getbrevo/brevo';
import { getEmailSettingsWithDefaults } from './services/settings';

export interface NewsletterSubscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, unknown>;
}

export interface TransactionalEmail {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  sender?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
}

/** Escape HTML entities to prevent XSS in email templates */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

class BrevoService {
  private readonly apiKey = process.env.BREVO_API_KEY;
  private apiInstance: TransactionalEmailsApi | null = null;
  private contactsApiInstance: ContactsApi | null = null;

  private initializeAPIs() {
    if (!this.apiKey) {
      // Only log error if we're actually trying to use the service
      if (typeof window === 'undefined') {
        // Only log on server-side
        console.error('BREVO_API_KEY is not configured');
      }
      return false;
    }

    if (!this.apiInstance || !this.contactsApiInstance) {
      // Initialize API instances with authentication
      this.apiInstance = new TransactionalEmailsApi();
      this.apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, this.apiKey);

      this.contactsApiInstance = new ContactsApi();
      this.contactsApiInstance.setApiKey(ContactsApiApiKeys.apiKey, this.apiKey);
    }

    return true;
  }

  /**
   * Get email settings from Firestore (server-side only)
   */
  private async getEmailSettings() {
    try {
      const settings = await getEmailSettingsWithDefaults();
      return {
        senderEmail: settings.senderEmail || process.env.BREVO_SENDER_EMAIL || '',
        senderName: settings.senderName || process.env.BREVO_SENDER_NAME || 'RHS Coding Club',
        replyToEmail: settings.replyToEmail || settings.senderEmail,
      };
    } catch (error) {
      console.error('Error fetching email settings, using defaults:', error);
      return {
        senderEmail: process.env.BREVO_SENDER_EMAIL || '',
        senderName: process.env.BREVO_SENDER_NAME || 'RHS Coding Club',
        replyToEmail: process.env.BREVO_SENDER_EMAIL || '',
      };
    }
  }  /**
   * Subscribe a user to the newsletter
   */
  async subscribeToNewsletter(subscriber: NewsletterSubscriber): Promise<boolean> {
    if (!this.initializeAPIs() || !this.contactsApiInstance) {
      return false;
    }

    try {
      const createContact = {
        email: subscriber.email,
        attributes: {
          FIRSTNAME: subscriber.firstName || '',
          LASTNAME: subscriber.lastName || '',
          ...subscriber.attributes,
        },
        listIds: [1], // Replace with your actual list ID
        updateEnabled: true,
      };

      await this.contactsApiInstance.createContact(createContact);
      return true;
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      return false;
    }
  }

  /**
   * Unsubscribe a user from the newsletter
   */
  async unsubscribeFromNewsletter(email: string): Promise<boolean> {
    if (!this.initializeAPIs() || !this.contactsApiInstance) {
      return false;
    }

    try {
      await this.contactsApiInstance.deleteContact(email);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
      return false;
    }
  }

  /**
   * Send a transactional email
   */
  async sendTransactionalEmail(emailData: TransactionalEmail): Promise<boolean> {
    if (!this.initializeAPIs() || !this.apiInstance) {
      return false;
    }

    try {
      const emailSettings = await this.getEmailSettings();
      
      const sendSmtpEmail = {
        to: emailData.to,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        textContent: emailData.textContent,
        sender: emailData.sender || {
          email: emailSettings.senderEmail,
          name: emailSettings.senderName,
        },
        replyTo: emailData.replyTo || {
          email: emailSettings.replyToEmail,
          name: emailSettings.senderName,
        },
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      return true;
    } catch (error) {
      console.error('Error sending transactional email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new members
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const welcomeEmailData: TransactionalEmail = {
      to: [{ email, name }],
      subject: 'Welcome to RHS Coding Club! 🎉',
      htmlContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to RHS Coding Club</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    background-color: #fafafa; 
                    color: #0a0a0a; 
                    margin: 0; 
                    padding: 0; 
                    line-height: 1.6;
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    border: 1px solid #e4e4e7; 
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
                .header { 
                    background-color: #0a0a0a; 
                    color: #fafafa; 
                    padding: 32px 24px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: 600; 
                    letter-spacing: -0.025em;
                }
                .header p { 
                    margin: 8px 0 0 0; 
                    font-size: 16px; 
                    opacity: 0.8; 
                    color: #a1a1aa;
                }
                .content { 
                    padding: 32px 24px; 
                }
                .content h2 { 
                    font-size: 24px; 
                    margin-top: 0; 
                    margin-bottom: 16px; 
                    color: #0a0a0a; 
                    font-weight: 600;
                }
                .content p { 
                    font-size: 16px; 
                    line-height: 1.6; 
                    margin-bottom: 16px; 
                    color: #52525b;
                }
                .features { 
                    background-color: #f4f4f5; 
                    border: 1px solid #e4e4e7;
                    border-radius: 8px; 
                    padding: 24px; 
                    margin: 24px 0; 
                }
                .features h3 {
                    margin-top: 0; 
                    color: #0a0a0a; 
                    font-size: 18px;
                    font-weight: 600;
                }
                .feature-list { 
                    list-style: none; 
                    padding: 0; 
                    margin: 0; 
                }
                .feature-list li { 
                    padding: 8px 0; 
                    font-size: 15px; 
                    display: flex; 
                    align-items: center; 
                    color: #52525b;
                }
                .feature-list li::before { 
                    content: "•"; 
                    margin-right: 12px; 
                    font-size: 16px; 
                    color: #0a0a0a;
                    font-weight: bold;
                }
                .cta-section { 
                    text-align: center; 
                    margin: 32px 0; 
                }
                .cta-button { 
                    background-color: #0a0a0a; 
                    color: #fafafa !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: 500; 
                    display: inline-block; 
                    border: 1px solid #0a0a0a;
                    transition: all 0.2s ease;
                }
                .cta-button:hover {
                    background-color: #18181b;
                    border-color: #18181b;
                }
                .footer { 
                    background-color: #f4f4f5; 
                    padding: 24px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #71717a; 
                    border-top: 1px solid #e4e4e7; 
                }
                .footer a { 
                    color: #0a0a0a; 
                    text-decoration: none; 
                    font-weight: 500;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to RHS Coding Club!</h1>
                    <p>We're excited to have you join our community</p>
                </div>
                <div class="content">
                    <h2>Hey ${escapeHtml(name)}!</h2>
                    <p>We're thrilled to have you join our community of passionate student developers at Ripon High School.</p>
                    
                    <div class="features">
                        <h3>What you can expect:</h3>
                        <ul class="feature-list">
                            <li>Weekly coding workshops and tutorials</li>
                            <li>Collaborative project opportunities</li>
                            <li>Coding competitions and challenges</li>
                            <li>Networking with fellow students and industry professionals</li>
                            <li>Mentorship and learning resources</li>
                        </ul>
                    </div>

                    <p>Our next meeting is this Friday at 3:30 PM in Computer Lab 1. We can't wait to see you there!</p>
                    
                    <div class="cta-section">
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events" class="cta-button">View Upcoming Events</a>
                    </div>

                    <p>Welcome to the team! 🚀</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                    <p>
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}">Visit our website</a> |
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contact">Contact us</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `
        🎉 Welcome to RHS Coding Club, ${name}!
        
        We're excited to have you join our community of passionate student developers.
        
        Here's what you can expect:
        • Weekly coding workshops and tutorials
        • Collaborative project opportunities
        • Coding competitions and challenges
        • Networking with fellow students and industry professionals
        • Mentorship and learning resources
        
        Our next meeting is this Friday at 3:30 PM in Computer Lab 1. We can't wait to see you there!
        
        Welcome to the team! 🚀
        
        Best regards,
        The RHS Coding Club Team
        
        --
        © ${new Date().getFullYear()} RHS Coding Club
        Website: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}
      `,
    };

    return this.sendTransactionalEmail(welcomeEmailData);
  }

  /**
   * Send welcome email to newsletter subscribers
   */
  async sendNewsletterWelcomeEmail(email: string): Promise<boolean> {
    const welcomeEmailData: TransactionalEmail = {
      to: [{ email }],
      subject: 'Welcome to RHS Coding Club Newsletter! 🚀',
      htmlContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to RHS Coding Club Newsletter</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    background-color: #fafafa; 
                    color: #0a0a0a; 
                    margin: 0; 
                    padding: 0; 
                    line-height: 1.6;
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    border: 1px solid #e4e4e7; 
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
                .header { 
                    background-color: #0a0a0a; 
                    color: #fafafa; 
                    padding: 32px 24px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: 600; 
                    letter-spacing: -0.025em;
                }
                .header p { 
                    margin: 8px 0 0 0; 
                    font-size: 16px; 
                    opacity: 0.8; 
                    color: #a1a1aa;
                }
                .content { 
                    padding: 32px 24px; 
                }
                .content h2 { 
                    font-size: 24px; 
                    margin-top: 0; 
                    margin-bottom: 16px; 
                    color: #0a0a0a; 
                    font-weight: 600;
                }
                .content p { 
                    font-size: 16px; 
                    line-height: 1.6; 
                    margin-bottom: 16px; 
                    color: #52525b;
                }
                .features { 
                    background-color: #f4f4f5; 
                    border: 1px solid #e4e4e7;
                    border-radius: 8px; 
                    padding: 24px; 
                    margin: 24px 0; 
                }
                .features h3 {
                    margin-top: 0; 
                    color: #0a0a0a; 
                    font-size: 18px;
                    font-weight: 600;
                }
                .feature-list { 
                    list-style: none; 
                    padding: 0; 
                    margin: 0; 
                }
                .feature-list li { 
                    padding: 8px 0; 
                    font-size: 15px; 
                    display: flex; 
                    align-items: center; 
                    color: #52525b;
                }
                .feature-list li::before { 
                    content: "•"; 
                    margin-right: 12px; 
                    font-size: 16px; 
                    color: #0a0a0a;
                    font-weight: bold;
                }
                .cta-section { 
                    text-align: center; 
                    margin: 32px 0; 
                }
                .cta-button { 
                    background-color: #0a0a0a; 
                    color: #fafafa !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: 500; 
                    display: inline-block; 
                    border: 1px solid #0a0a0a;
                    transition: all 0.2s ease;
                }
                .cta-button:hover {
                    background-color: #18181b;
                    border-color: #18181b;
                }
                .footer { 
                    background-color: #f4f4f5; 
                    padding: 24px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #71717a; 
                    border-top: 1px solid #e4e4e7; 
                }
                .footer a { 
                    color: #0a0a0a; 
                    text-decoration: none; 
                    font-weight: 500;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to Our Newsletter!</h1>
                    <p>You're now part of the RHS Coding Club community</p>
                </div>
                <div class="content">
                    <h2>Thanks for subscribing!</h2>
                    <p>We're thrilled to have you join our community of passionate student developers at Ripon High School.</p>
                    
                    <div class="features">
                        <h3>What you'll receive:</h3>
                        <ul class="feature-list">
                            <li>Updates on upcoming coding workshops and events</li>
                            <li>New coding challenges and competitions</li>
                            <li>Featured student projects and achievements</li>
                            <li>Programming tips and learning resources</li>
                            <li>Club meeting reminders and announcements</li>
                        </ul>
                    </div>

                    <p>Want to get more involved? Consider joining our club officially!</p>
                    
                    <div class="cta-section">
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join" class="cta-button">Join RHS Coding Club</a>
                    </div>

                    <p>Follow us on our journey as we learn, build, and code together!</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                    <p>
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}">Visit our website</a> |
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contact">Contact us</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;">
                    <p style="font-size: 12px; color: #a1a1aa;">
                        You received this email because you subscribed to the RHS Coding Club newsletter.<br>
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/newsletter-unsubscribe?email=${encodeURIComponent(email)}" style="color: #71717a; text-decoration: underline;">Unsubscribe</a> | 
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/newsletter/unsubscribe" style="color: #71717a; text-decoration: underline;">Manage preferences</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `
        🎉 Welcome to RHS Coding Club Newsletter!

        Thanks for subscribing!

        We're thrilled to have you join our community of passionate student developers at Richmond High School.

        What you'll receive:
        ✨ Updates on upcoming coding workshops and events
        ✨ New coding challenges and competitions  
        ✨ Featured student projects and achievements
        ✨ Programming tips and learning resources
        ✨ Club meeting reminders and announcements

        Want to get more involved? Consider joining our club officially!
        Visit: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join

        Follow us on our journey as we learn, build, and code together!

        Best regards,
        The RHS Coding Club Team

        --
        © ${new Date().getFullYear()} RHS Coding Club
        Website: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}
      `,
    };

    return this.sendTransactionalEmail(welcomeEmailData);
  }

  /**
   * Send new challenge notification to newsletter subscribers
   */
  async sendNewChallengeNotification(
    subscriberEmails: string[],
    challengeTitle: string,
    challengeDescription: string,
    challengeDifficulty: string,
    challengePoints: number,
    challengeUrl: string
  ): Promise<boolean> {
    const emailPromises = subscriberEmails.map(email => {
      const notificationEmailData: TransactionalEmail = {
        to: [{ email }],
        subject: `🚀 New Coding Challenge: ${escapeHtml(challengeTitle)}`,
        htmlContent: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Coding Challenge</title>
              <style>
                  body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                      background-color: #fafafa; 
                      color: #0a0a0a; 
                      margin: 0; 
                      padding: 0; 
                      line-height: 1.6;
                  }
                  .container { 
                      max-width: 600px; 
                      margin: 20px auto; 
                      background-color: #ffffff; 
                      border-radius: 8px; 
                      overflow: hidden; 
                      border: 1px solid #e4e4e7; 
                      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                  }
                  .header { 
                      background-color: #0a0a0a; 
                      color: #fafafa; 
                      padding: 32px 24px; 
                      text-align: center; 
                  }
                  .header h1 { 
                      margin: 0; 
                      font-size: 28px; 
                      font-weight: 600; 
                      letter-spacing: -0.025em;
                  }
                  .content { 
                      padding: 32px 24px; 
                  }
                  .challenge-card {
                      background-color: #f4f4f5;
                      border: 1px solid #e4e4e7;
                      border-radius: 8px;
                      padding: 24px;
                      margin: 24px 0;
                  }
                  .difficulty-badge {
                      display: inline-block;
                      padding: 4px 12px;
                      border-radius: 16px;
                      font-size: 12px;
                      font-weight: 500;
                      text-transform: uppercase;
                      margin-bottom: 16px;
                  }
                  .difficulty-easy { background-color: #dcfce7; color: #166534; }
                  .difficulty-medium { background-color: #fef3c7; color: #92400e; }
                  .difficulty-hard { background-color: #fecaca; color: #dc2626; }
                  .cta-button { 
                      background-color: #0a0a0a; 
                      color: #fafafa !important; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: 500; 
                      display: inline-block; 
                      margin: 16px 0;
                  }
                  .footer { 
                      background-color: #f4f4f5; 
                      padding: 24px; 
                      text-align: center; 
                      font-size: 14px; 
                      color: #71717a; 
                      border-top: 1px solid #e4e4e7; 
                  }
                  .footer a { 
                      color: #0a0a0a; 
                      text-decoration: none; 
                      font-weight: 500;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>🚀 New Coding Challenge!</h1>
                  </div>
                  <div class="content">
                      <h2>A new challenge is waiting for you!</h2>
                      <p>Hey there, coder! We've just released a new coding challenge that we think you'll love.</p>
                      
                      <div class="challenge-card">
                          <div class="difficulty-badge difficulty-${escapeHtml(challengeDifficulty.toLowerCase())}">${escapeHtml(challengeDifficulty)}</div>
                          <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #0a0a0a;">${escapeHtml(challengeTitle)}</h3>
                          <p style="margin: 0 0 16px 0; color: #52525b;">${escapeHtml(challengeDescription)}</p>
                          <p style="margin: 0; font-weight: 600; color: #0a0a0a;">💎 ${escapeHtml(String(challengePoints))} points</p>
                      </div>

                      <p>Ready to test your skills? Click the button below to start the challenge!</p>
                      
                      <div style="text-align: center;">
                          <a href="${escapeHtml(challengeUrl)}" class="cta-button">Start Challenge</a>
                      </div>

                      <p>Good luck, and happy coding! 🎯</p>
                  </div>
                  <div class="footer">
                      <p>© ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                      <p>
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}">Visit our website</a> |
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contact">Contact us</a>
                      </p>
                      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;">
                      <p style="font-size: 12px; color: #a1a1aa;">
                          You received this email because you subscribed to the RHS Coding Club newsletter.<br>
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/newsletter-unsubscribe?email=${encodeURIComponent(email)}" style="color: #71717a; text-decoration: underline;">Unsubscribe</a> | 
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/newsletter/unsubscribe" style="color: #71717a; text-decoration: underline;">Manage preferences</a>
                      </p>
                  </div>
              </div>
          </body>
          </html>
        `,
        textContent: `
          🚀 New Coding Challenge: ${challengeTitle}

          A new challenge is waiting for you!

          Hey there, coder! We've just released a new coding challenge that we think you'll love.

          Challenge: ${challengeTitle}
          Difficulty: ${challengeDifficulty}
          Points: ${challengePoints}
          Description: ${challengeDescription}

          Ready to test your skills? Visit: ${challengeUrl}

          Good luck, and happy coding! 🎯

          --
          © ${new Date().getFullYear()} RHS Coding Club
          Website: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}

          You received this email because you subscribed to the RHS Coding Club newsletter.
          Unsubscribe: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/newsletter-unsubscribe?email=${encodeURIComponent(email)}
        `,
      };

      return this.sendTransactionalEmail(notificationEmailData);
    });

    try {
      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
      
      return successCount > 0;
    } catch (error) {
      console.error('Error sending challenge notifications:', error);
      return false;
    }
  }

  /**
   * Send contact form notification
   */
  async sendContactFormNotification(
    senderEmail: string,
    senderName: string,
    subject: string,
    message: string
  ): Promise<boolean> {
    const emailSettings = await this.getEmailSettings();
    
    const notificationEmailData: TransactionalEmail = {
      to: [{ email: emailSettings.replyToEmail, name: emailSettings.senderName }],
      subject: `New Contact Form Submission: ${escapeHtml(subject)}`,
      htmlContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Contact Form Submission</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    background-color: #fafafa; 
                    color: #0a0a0a; 
                    margin: 0; 
                    padding: 0; 
                    line-height: 1.6;
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    border: 1px solid #e4e4e7; 
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
                .header { 
                    background-color: #0a0a0a; 
                    color: #fafafa; 
                    padding: 32px 24px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: 600; 
                    letter-spacing: -0.025em;
                }
                .content { 
                    padding: 32px 24px; 
                }
                .content h2 { 
                    font-size: 20px; 
                    margin-top: 0; 
                    margin-bottom: 16px; 
                    color: #0a0a0a; 
                    font-weight: 600;
                }
                .info-table { 
                    width: 100%; 
                    margin-bottom: 24px; 
                    border-collapse: collapse; 
                    background-color: #f4f4f5;
                    border: 1px solid #e4e4e7;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .info-table td { 
                    padding: 12px 16px; 
                    vertical-align: top; 
                }
                .info-table td:first-child { 
                    font-weight: 600; 
                    color: #0a0a0a; 
                    width: 100px; 
                    background-color: #f9fafb;
                }
                .info-table td:last-child {
                    color: #52525b;
                }
                .info-table tr:not(:last-child) td {
                    border-bottom: 1px solid #e4e4e7;
                }
                .message-box { 
                    background-color: #f4f4f5; 
                    border: 1px solid #e4e4e7; 
                    border-radius: 8px; 
                    padding: 20px; 
                    white-space: pre-wrap; 
                    word-wrap: break-word; 
                    font-size: 15px; 
                    line-height: 1.6; 
                    color: #52525b;
                }
                .footer { 
                    background-color: #f4f4f5; 
                    padding: 24px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #71717a; 
                    border-top: 1px solid #e4e4e7; 
                }
                .footer a { 
                    color: #0a0a0a; 
                    text-decoration: none; 
                    font-weight: 500;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📧 New Website Message</h1>
                </div>
                <div class="content">
                    <h2>Contact Form Submission</h2>
                    <table class="info-table">
                        <tr>
                            <td>From:</td>
                            <td>${escapeHtml(senderName)}</td>
                        </tr>
                        <tr>
                            <td>Email:</td>
                            <td><a href="mailto:${encodeURIComponent(senderEmail)}" style="color: #0a0a0a; font-weight: 500;">${escapeHtml(senderEmail)}</a></td>
                        </tr>
                        <tr>
                            <td>Subject:</td>
                            <td>${escapeHtml(subject)}</td>
                        </tr>
                    </table>
                    <h2>Message</h2>
                    <div class="message-box">
                        ${escapeHtml(message).replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div class="footer">
                    <p>This email was sent from the contact form on the RHS Coding Club website.</p>
                    <p>&copy; ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `
        📧 New Contact Form Submission
        
        From: ${senderName} (${senderEmail})
        Subject: ${subject}
        
        Message:
        ${message}
        
        --
        This email was sent from the contact form on the RHS Coding Club website.
        © ${new Date().getFullYear()} RHS Coding Club. All rights reserved.
      `,
      replyTo: { email: senderEmail, name: senderName },
    };

    return this.sendTransactionalEmail(notificationEmailData);
  }

  /**
   * Send a custom newsletter to multiple recipients
   */
  async sendCustomNewsletter(recipients: string[], subject: string, message: string): Promise<boolean> {
    if (!this.initializeAPIs()) {
      return false;
    }

    try {
      // Create newsletter-style HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml(subject)}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #fafafa;
                    color: #0a0a0a;
                    margin: 0;
                    padding: 0;
                    line-height: 1.6;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e4e4e7;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
                .header {
                    background-color: #0a0a0a;
                    color: #fafafa;
                    text-align: center;
                    padding: 32px 24px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                    letter-spacing: -0.025em;
                }
                .header p {
                    margin: 8px 0 0 0;
                    font-size: 16px;
                    opacity: 0.8;
                    color: #a1a1aa;
                }
                .content {
                    padding: 32px 24px;
                }
                .subject {
                    font-size: 24px;
                    font-weight: 600;
                    color: #0a0a0a;
                    margin-bottom: 24px;
                    text-align: center;
                    line-height: 1.3;
                }
                .message {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #52525b;
                    white-space: pre-wrap;
                    margin-bottom: 32px;
                    background-color: #f4f4f5;
                    border: 1px solid #e4e4e7;
                    border-radius: 8px;
                    padding: 24px;
                }
                .footer {
                    background-color: #f4f4f5;
                    text-align: center;
                    padding: 24px;
                    border-top: 1px solid #e4e4e7;
                }
                .footer p {
                    margin: 0;
                    color: #71717a;
                    font-size: 14px;
                }
                .footer a {
                    color: #0a0a0a;
                    text-decoration: none;
                    font-weight: 500;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
                .unsubscribe {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #e4e4e7;
                }
                .unsubscribe a {
                    color: #71717a;
                    font-size: 12px;
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>� RHS Coding Club Newsletter</h1>
                    <p>Stay updated with the latest from our community</p>
                </div>
                <div class="content">
                    <div class="subject">${escapeHtml(subject)}</div>
                    <div class="message">${escapeHtml(message)}</div>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                    <p>
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}">Visit our website</a> |
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contact">Contact us</a>
                    </p>
                    <div class="unsubscribe">
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/newsletter/unsubscribe">Unsubscribe from newsletter</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `;

      // Create plain text version
      const textContent = `
        📧 RHS Coding Club Newsletter
        
        ${subject}
        
        ${message}
        
        ---
        
        © ${new Date().getFullYear()} RHS Coding Club. All rights reserved.
        
        Website: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}
        To unsubscribe: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/newsletter/unsubscribe
      `;

      const emailSettings = await this.getEmailSettings();

      // Send email to all recipients
      const emailData: TransactionalEmail = {
        to: recipients.map(email => ({ email })),
        subject: `📧 ${subject}`,
        htmlContent,
        textContent,
        sender: { email: emailSettings.senderEmail, name: emailSettings.senderName },
      };

      return this.sendTransactionalEmail(emailData);
    } catch (error) {
      console.error('Error sending custom newsletter:', error);
      return false;
    }
  }
}

export const brevoService = new BrevoService();
