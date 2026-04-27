
require('dotenv').config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
    to: 'test-recipient@example.com', 
    from: {
        email: process.env.EMAIL_FROM,
        name: 'LifeSave Blood Network'
    },
    subject: 'SendGrid Test (Object From)',
    text: 'This is a test email from the blood app using object from.',
};

console.log('Using API Key:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
console.log('Using From Email:', process.env.EMAIL_FROM);

sgMail.send(msg)
    .then(() => {
        console.log('Email sent successfully!');
    })
    .catch((error) => {
        console.error('Email failed!');
        if (error.response) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
    });
