require('dotenv').config();
const { sendGreetingMail } = require('../utils/mailer');

async function testMail() {
    console.log('Testing SendGrid with:');
    console.log('API Key:', process.env.SENDGRID_API_KEY ? 'Present' : 'Missing');
    console.log('Email From:', process.env.EMAIL_FROM);
    
    try {
        await sendGreetingMail('nirjan4102@gmail.com', 'Test User');
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Test email failed.');
    }
}

testMail();
