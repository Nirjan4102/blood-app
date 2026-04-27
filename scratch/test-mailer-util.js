
require('dotenv').config();
const { sendGreetingMail, notifyDonors } = require('../utils/mailer');

async function test() {
    console.log('Testing sendGreetingMail...');
    try {
        await sendGreetingMail('test-recipient@example.com', 'Test User');
        console.log('sendGreetingMail success!');
    } catch (err) {
        console.error('sendGreetingMail failed:', err.message);
    }

    console.log('\nTesting notifyDonors...');
    const donorsWithUrls = [
        {
            donor: { email: 'test-recipient@example.com', name: 'Donor 1', blood_group: 'O+' },
            acceptUrl: 'http://localhost:3000/accept?id=1'
        }
    ];
    const requesterInfo = { name: 'Patient A', bloodGroup: 'O+', village: 'Test Village' };
    
    try {
        await notifyDonors(donorsWithUrls, requesterInfo);
        console.log('notifyDonors finished processing.');
    } catch (err) {
        console.error('notifyDonors failed:', err.message);
    }
}

test();
