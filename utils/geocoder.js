const axios = require('axios');

/**
 * Converts address fields into [longitude, latitude] coordinates using Geoapify.
 * Specifically tuned to prioritize West Bengal, India.
 */
const getCoordinates = async (address) => {
    try {
        const { village, post, district } = address;
        
        // We force "West Bengal, India" into the string to ensure the 15km radius works locally
        const searchText = `${village}, ${post}, ${district}, West Bengal, India`;
        const apiKey = process.env.GEOAPIFY_API_KEY;

        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchText)}&filter=countrycode:in&apiKey=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.features && response.data.features.length > 0) {
            // Geoapify returns [longitude, latitude]
            const coords = response.data.features[0].geometry.coordinates;
            return coords; 
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
};

module.exports = { getCoordinates };