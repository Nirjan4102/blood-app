const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { getCoordinates } = require('../utils/geocoder');
const { sendGreetingMail, notifyRequester } = require('../utils/mailer');

/**
 * POST /api/donors/register
 * Logic: Standard donor registration with Geocoding (Supabase/PostGIS)
 */
router.post('/register', async (req, res) => {
    try {
        const { name, mobile, email, village, post, district, state, bloodGroup, lastDonationDate } = req.body;

        const coords = await getCoordinates({ village, post, district, state });

        if (!coords) {
            return res.status(400).json({ error: "Location not found. Please check your address details." });
        }

        const cleanEmail = (email || '').toLowerCase().trim();

        // Insert donor into Supabase with PostGIS POINT geometry
        const { data, error } = await supabase
            .from('donors')
            .insert({
                name,
                mobile,
                email: cleanEmail,
                blood_group: (bloodGroup || '').toUpperCase(),
                last_donation_date: lastDonationDate ? new Date(lastDonationDate).toISOString() : null,
                village,
                post,
                district,
                state,
                // PostGIS expects WKT format: POINT(longitude latitude)
                location: `POINT(${coords[0]} ${coords[1]})`
            })
            .select();

        if (error) {
            // Supabase unique constraint violation code
            if (error.code === '23505') {
                return res.status(400).json({ error: "This email is already registered." });
            }
            console.error('Supabase insert error:', error.message);
            return res.status(500).json({ error: "Server Error" });
        }

        // Send greeting mail (async, don't block response)
        sendGreetingMail(cleanEmail, name).catch(err => {
            console.error('Failed to send greeting email after registration.');
        });

        res.status(201).json({ message: "Registration successful!" });

    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * GET /api/donors/accept
 * Logic: Updated to BROADCAST donor details to the Requester in real-time
 */
router.get('/accept', async (req, res) => {
    try {
        const { donorId, reqEmail, reqName, reqMobile, reqLat, reqLng } = req.query;
        
        // 1. Get the Socket.io instance attached to the app in server.js
        const io = req.app.get('socketio');

        // 2. Update donor's last donation date and get their full info
        const { data: updatedDonor, error } = await supabase
            .from('donors')
            .update({ last_donation_date: new Date().toISOString() })
            .eq('id', donorId)
            .select()
            .single();

        if (error || !updatedDonor) {
            return res.status(404).send("Donor record not found.");
        }

        // 3. BROADCAST: Only the donor who clicked 'Accept' is sent to the requester
        // We use reqEmail as the Room ID so only the correct requester sees it
        if (io) {
            io.to(reqEmail).emit('donor-accepted', {
                name: updatedDonor.name,
                mobile: updatedDonor.mobile,
                email: updatedDonor.email,
                bloodGroup: updatedDonor.blood_group,
                location: `${updatedDonor.village}, ${updatedDonor.district}`
            });
        }

        // 4. Send the automated email notification to the requester as a backup
        notifyRequester(reqEmail, updatedDonor.name, updatedDonor.mobile).catch(() => {});

        // 5. Redirect the donor to the Map View on the FRONTEND
        const frontendUrl = process.env.BASE_URL || '';
        const redirectUrl = `${frontendUrl}/map-view.html?` + 
            `reqName=${encodeURIComponent(reqName)}` +
            `&reqMobile=${reqMobile}` +
            `&reqLat=${reqLat}` +
            `&reqLng=${reqLng}` +
            `&donorName=${encodeURIComponent(updatedDonor.name)}` +
            `&donorMobile=${updatedDonor.mobile}`;
        
        res.redirect(redirectUrl);

    } catch (error) {
        console.error('Accept error:', error.message);
        res.status(500).send("An error occurred while accepting the request.");
    }
});

module.exports = router;