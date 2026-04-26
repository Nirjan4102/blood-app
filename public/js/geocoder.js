/**
 * LIFESAVE — Browser-side Geocoder (Geoapify)
 * Converts address fields into [longitude, latitude] coordinates.
 * Specifically tuned to prioritize West Bengal, India.
 * Depends on: config.js (must be loaded first)
 */
async function getCoordinates(address) {
    try {
        const { village, post, district } = address;

        // We force "West Bengal, India" into the string to ensure the 15km radius works locally
        const searchText = `${village}, ${post}, ${district}, West Bengal, India`;
        const apiKey = LIFESAVE_CONFIG.GEOAPIFY_API_KEY;

        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchText)}&filter=countrycode:in&apiKey=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            // Geoapify returns [longitude, latitude]
            return data.features[0].geometry.coordinates;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}
