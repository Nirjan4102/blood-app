require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

if (!apiKey || !emailFrom) {
    console.error('❌ Missing SENDGRID_API_KEY or EMAIL_FROM in .env');
    process.exit(1);
}

sgMail.setApiKey(apiKey);

async function verifySendGrid() {
    console.log('🔍 Checking SendGrid configuration...');
    console.log(`   From Email: ${emailFrom}`);
    
    const msg = {
        to: emailFrom, // Send to yourself to test
        from: emailFrom,
        subject: 'LIFESAVE SendGrid Verification Test',
        text: 'If you receive this, your SendGrid configuration and Sender Verification are working correctly!',
    };

    try {
        await sgMail.send(msg);
        console.log('✅ SUCCESS: SendGrid API key is valid and Sender is verified!');
    } catch (error) {
        console.error('❌ FAILURE: SendGrid verification failed.');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Body:', JSON.stringify(error.response.body, null, 2));
            
            if (error.response.body && error.response.body.errors) {
                const isUnverified = error.response.body.errors.some(e => e.message.includes('sender identity'));
                if (isUnverified) {
                    console.error('\n💡 TIP: Your "From" email is NOT verified in SendGrid. You must verify it at: https://app.sendgrid.com/settings/sender_auth');
                }
            }
        } else {
            console.error('   Message:', error.message);
        }
    }
}

verifySendGrid();
