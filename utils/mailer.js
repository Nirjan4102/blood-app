const sgMail = require('@sendgrid/mail');

// Load API Key from .env
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends a welcome email to a newly registered donor
 */
const sendGreetingMail = async (toEmail, name) => {
    const msg = {
        to: toEmail,
        from: {
            email: process.env.EMAIL_FROM,
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

    await sgMail.send(msg);
};

/**
 * Notifies multiple donors about a nearby blood request
 * @param {Array} donorsWithUrls - Array of { donor, acceptUrl }
 * @param {Object} requesterInfo - { name, bloodGroup, village }
 */
const notifyDonors = async (donorsWithUrls, requesterInfo) => {
    const { name, bloodGroup, village } = requesterInfo;

    const emailPromises = donorsWithUrls.map(({ donor, acceptUrl }) => {
        const msg = {
            to: donor.email,
            from: {
                email: process.env.EMAIL_FROM,
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

        return sgMail.send(msg).catch(() => {});
    });

    await Promise.allSettled(emailPromises);
};

/**
 * Notifies the patient/requester that a donor is on their way
 */
const notifyRequester = async (reqEmail, donorName, donorMobile) => {
    const msg = {
        to: reqEmail,
        from: {
            email: process.env.EMAIL_FROM,
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

    await sgMail.send(msg).catch(() => {});
};

module.exports = { sendGreetingMail, notifyDonors, notifyRequester };