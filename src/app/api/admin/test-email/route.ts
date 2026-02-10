import { NextRequest, NextResponse } from 'next/server';
import { brevoService } from '@/lib/brevo';
import { getEmailSettingsWithDefaults } from '@/lib/services/settings';
import { verifyAdminOrOfficer } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminOrOfficer(request);
    if (!authResult.authorized) return authResult.response;

    const body = await request.json();
    const { recipientEmail, recipientName } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Get current email settings
    const emailSettings = await getEmailSettingsWithDefaults();

    // Send test email
    const success = await brevoService.sendTransactionalEmail({
      to: [{ email: recipientEmail, name: recipientName || 'User' }],
      subject: '✅ Test Email from RHS Coding Club',
      htmlContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email</title>
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
                }
                .content { 
                    padding: 32px 24px; 
                }
                .success-badge {
                    display: inline-block;
                    background-color: #10b981;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 500;
                    margin-bottom: 16px;
                }
                .info-box {
                    background-color: #f4f4f5;
                    border-left: 4px solid #0a0a0a;
                    padding: 16px;
                    margin: 16px 0;
                    border-radius: 4px;
                }
                .footer { 
                    background-color: #f4f4f5; 
                    padding: 24px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #71717a; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Email Configuration Test</h1>
                </div>
                <div class="content">
                    <div class="success-badge">Success!</div>
                    <h2>Your email configuration is working correctly</h2>
                    <p>If you're receiving this email, it means your email settings are properly configured and emails are being sent successfully.</p>
                    
                    <div class="info-box">
                        <h3 style="margin-top: 0;">Current Configuration</h3>
                        <p style="margin: 8px 0;"><strong>Sender Name:</strong> ${emailSettings.senderName}</p>
                        <p style="margin: 8px 0;"><strong>Sender Email:</strong> ${emailSettings.senderEmail}</p>
                        <p style="margin: 8px 0;"><strong>Reply-To Email:</strong> ${emailSettings.replyToEmail}</p>
                        <p style="margin: 8px 0; margin-bottom: 0;"><strong>Test Sent:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <p>You can now safely use this configuration to send automated emails to your members.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} RHS Coding Club. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `Email Configuration Test

Success! Your email configuration is working correctly.

If you're receiving this email, it means your email settings are properly configured and emails are being sent successfully.

Current Configuration:
- Sender Name: ${emailSettings.senderName}
- Sender Email: ${emailSettings.senderEmail}
- Reply-To Email: ${emailSettings.replyToEmail}
- Test Sent: ${new Date().toLocaleString()}

You can now safely use this configuration to send automated emails to your members.

© ${new Date().getFullYear()} RHS Coding Club. All rights reserved.
      `,
    });

    if (success) {
      return NextResponse.json({ 
        message: 'Test email sent successfully',
        settings: {
          senderName: emailSettings.senderName,
          senderEmail: emailSettings.senderEmail,
          replyToEmail: emailSettings.replyToEmail,
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email. Please check your Brevo API configuration.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
