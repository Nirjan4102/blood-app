const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { getCoordinates } = require('../utils/geocoder');
const { notifyDonors } = require('../utils/mailer');

/**
 * POST /api/request-blood
 * Logic: Geocode Patient -> Search 15km Radius via PostGIS RPC -> Notify Donors via Email
 */
router.post('/request-blood', async (req, res) => {
    try {
        const { name, mobile, email, village, post, district, state, bloodGroup } = req.body;

        // 1. Get Patient's Coordinates
        const coords = await getCoordinates({ village, post, district, state });

        if (!coords) {
            return res.status(400).json({ 
                error: "Location Error: Could not determine coordinates for the request area." 
            });
        }

        // 2. Search for Donors within 15km using the PostGIS RPC function
        //    This replaces MongoDB's $near + $maxDistance + 90-day filter
        const { data: donors, error } = await supabase.rpc('find_nearby_donors', {
            search_blood_group: bloodGroup.toUpperCase(),
            search_lng: coords[0],
            search_lat: coords[1],
            max_distance_meters: 15000,
            min_days_since_donation: 90
        });

        if (error) {
            console.error('Supabase RPC error:', error.message);
            return res.status(500).json({ error: "Internal Server Error." });
        }

        // 3. Handle case where no donors are found
        if (!donors || donors.length === 0) {
            return res.status(404).json({ 
                message: `No eligible ${bloodGroup} donors found within 15km of your location.` 
            });
        }

        // 4. Build per-donor accept URLs (each includes that donor's ID)
        //    Note: Supabase uses UUID 'id' instead of MongoDB's '_id'
        const baseAcceptUrl = `${process.env.BASE_URL}/api/donors/accept`;
        const donorsWithUrls = donors.map(donor => ({
            donor: {
                ...donor,
                // Map Supabase snake_case back to the format mailer.js expects
                bloodGroup: donor.blood_group
            },
            acceptUrl: `${baseAcceptUrl}?donorId=${donor.id}&reqName=${encodeURIComponent(name)}&reqMobile=${mobile}&reqLat=${coords[1]}&reqLng=${coords[0]}&reqEmail=${encodeURIComponent(email)}`
        }));

        // 5. Trigger the emails to all found donors
        await notifyDonors(donorsWithUrls, { name, bloodGroup, village });

        res.status(200).json({ 
            message: `Emergency request broadcasted! We notified ${donors.length} nearby donor(s).` 
        });

    } catch (error) {
        console.error('Request blood error:', error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

module.exports = router;