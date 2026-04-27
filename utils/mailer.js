const sgMail = require('@sendgrid/mail');

// Load API Key from .env
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
    sgMail.setApiKey(apiKey);
} else {
    console.warn('⚠️ SENDGRID_API_KEY is not set. Emails will not be sent.');
}

/**
 * Helper to sanitize email strings
 */
const sanitizeEmail = (email) => (email ? email.toLowerCase().trim() : '');

/**
 * Sends a welcome email to a newly registered donor
 */
const sendGreetingMail = async (toEmail, name) => {
    const cleanTo = sanitizeEmail(toEmail);
    const cleanFrom = sanitizeEmail(process.env.EMAIL_FROM);

    if (!cleanTo || !cleanFrom) {
        console.error('❌ Cannot send greeting email: missing recipient or sender address.');
        return;
    }

    const msg = {
        to: cleanTo,
        from: {
            email: cleanFrom,
            name: 'LifeSave Blood Network'
        },
        subject: 'Welcome to the LifeSave Network!',
        text: `Hello ${name}, thank you for registering as a blood donor in our network.`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #d32f2f;">Welcome, ${name}!</h2>
                <p>Thank you for registering as a donor. Your details are now active in our system.</p>
                <p>When someone within 15km of your location needs your blood group, you will receive an urgent email notification.</p>
                <br>
                <p>Best Regards,<br><strong>LifeSave Team</strong></p>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log(`✅ Greeting email sent to ${cleanTo}`);
    } catch (error) {
        console.error('❌ SendGrid Error (sendGreetingMail):');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Body:', JSON.stringify(error.response.body, null, 2));
        } else {
            console.error('   Message:', error.message);
        }
        throw error;
    }
};

/**
 * Notifies multiple donors about a nearby blood request
 */
const notifyDonors = async (donorsWithUrls, requesterInfo) => {
    const { name, bloodGroup, village } = requesterInfo;
    const cleanFrom = sanitizeEmail(process.env.EMAIL_FROM);

    if (!donorsWithUrls || donorsWithUrls.length === 0) {
        console.log('ℹ️ No donors to notify.');
        return;
    }

    const emailPromises = donorsWithUrls.map(({ donor, acceptUrl }) => {
        const cleanTo = sanitizeEmail(donor.email);
        
        if (!cleanTo) return Promise.resolve();

        const msg = {
            to: cleanTo,
            from: {
                email: cleanFrom,
                name: 'URGENT Blood Request'
            },
            subject: `URGENT: ${bloodGroup} Blood Needed in ${village}`,
            html: `
                <div style="font-family: Arial; border: 2px solid #d32f2f; padding: 20px;">
                    <h2 style="color: #d32f2f;">Emergency Blood Request!</h2>
                    <p>Hello <strong>${donor.name}</strong>, someone near you needs <strong>${bloodGroup}</strong> blood.</p>
                    <p><strong>Location:</strong> ${village}</p>
                    <p><strong>Patient Name:</strong> ${name}</p>
                    <br>
                    <a href="${acceptUrl}" 
                       style="background-color: #d32f2f; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                       ACCEPT & VIEW LOCATION
                    </a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">If you have donated in the last 90 days, please ignore this email.</p>
                </div>
            `
        };

        return sgMail.send(msg)
            .then(() => console.log(`✅ Notification email sent to donor: ${cleanTo}`))
            .catch((error) => {
                console.error(`❌ SendGrid Error (notifyDonors) for ${cleanTo}:`);
                if (error.response) {
                    console.error('   Status:', error.response.status);
                    console.error('   Body:', JSON.stringify(error.response.body, null, 2));
                } else {
                    console.error('   Message:', error.message);
                }
            });
    });

    await Promise.allSettled(emailPromises);
};

/**
 * Notifies the patient/requester that a donor is on their way
 */
const notifyRequester = async (reqEmail, donorName, donorMobile) => {
    const cleanTo = sanitizeEmail(reqEmail);
    const cleanFrom = sanitizeEmail(process.env.EMAIL_FROM);

    if (!cleanTo || !cleanFrom) return;

    const msg = {
        to: cleanTo,
        from: {
            email: cleanFrom,
            name: 'LifeSave Update'
        },
        subject: 'A Donor is Coming!',
        html: `
            <div style="font-family: Arial; padding: 20px; border: 1px solid #4CAF50;">
                <h2 style="color: #4CAF50;">Good News!</h2>
                <p>A donor has accepted your blood request.</p>
                <p><strong>Donor Name:</strong> ${donorName}</p>
                <p><strong>Donor Contact:</strong> <a href="tel:${donorMobile}">${donorMobile}</a></p>
                <p>Please contact them immediately to coordinate.</p>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log(`✅ Requester notification email sent to ${cleanTo}`);
    } catch (error) {
        console.error('❌ SendGrid Error (notifyRequester):', error.response ? JSON.stringify(error.response.body, null, 2) : error.message);
    }
};

module.exports = { sendGreetingMail, notifyDonors, notifyRequester };