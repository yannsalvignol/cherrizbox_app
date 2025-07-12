import { Alert } from 'react-native';
import { Resend } from 'resend';

// !! IMPORTANT !!
// This is a high-security risk. Your Resend API key will be exposed in your app's frontend code.
// It is strongly recommended to move this logic to a secure backend server or a serverless function for production.
// Add your Resend API key to your .env file as EXPO_PUBLIC_RESEND_API_KEY
const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;

let resend: Resend | null = null;
if (resendApiKey) {
    resend = new Resend(resendApiKey);
} else {
    console.warn("Resend API key is not configured. Email sending will be disabled. Please set EXPO_PUBLIC_RESEND_API_KEY in your .env file.");
}

export const sendVerificationEmail = async (email: string, code: string) => {
    if (!resend) {
        console.error('Resend is not initialized. Cannot send email.');
        // In a real app, you might want to return a more user-friendly error.
        // For this implementation, we can simulate success to allow UI flow testing.
        Alert.alert(
            "Email Not Sent (DEMO)",
            `Resend API key not found. For testing, your code is: ${code}`
        );
        return { success: true };
    }

    try {
        await resend.emails.send({
            from: 'security@email.cherrizbox.com', // IMPORTANT: This domain must be verified in your Resend account.
            to: email,
            subject: 'Your Cherrizbox Verification Code',
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #f5f5f5;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    }
                    .header {
                        background-color: #FB2355;
                        padding: 40px;
                        text-align: center;
                    }
                    .header img {
                        max-width: 90px;
                        border-radius: 18px;
                        border: 3px solid rgba(255,255,255,0.8);
                    }
                    .header h1 {
                        color: #ffffff;
                        font-size: 28px;
                        margin-top: 10px;
                        font-weight: 600;
                    }
                    .content {
                        padding: 40px 30px;
                        color: #333;
                        line-height: 1.6;
                    }
                    .content h2 {
                        font-size: 24px;
                        font-weight: 600;
                        color: #111;
                    }
                    .code-container {
                        background-color: #f0f0f0;
                        border-radius: 8px;
                        padding: 20px;
                        text-align: center;
                        margin: 30px 0;
                    }
                    .code {
                        font-size: 38px;
                        font-weight: 700;
                        letter-spacing: 6px;
                        color: #FB2355;
                        margin: 0;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        font-size: 12px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <!-- If you provide a public URL for your logo, I can add it here. Example: -->
                        <!-- <img src="YOUR_LOGO_URL" alt="Cherrizbox Logo"> -->
                        <h1>Cherrizbox</h1>
                    </div>
                    <div class="content">
                        <h2>Email Verification</h2>
                        <p>Hi there,</p>
                        <p>Thanks for signing up! Please use the code below to verify your email address and complete your registration.</p>
                        <div class="code-container">
                            <p class="code">${code}</p>
                        </div>
                        <p>This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
                        <p>Best,<br>The Cherrizbox Team</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2024 Cherrizbox. All Rights Reserved.</p>
                </div>
            </body>
            </html>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        return { success: false, error: 'Failed to send verification email.' };
    }
}; 