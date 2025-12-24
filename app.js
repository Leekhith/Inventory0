// GLOBAL VARIABLES
let map, userMarker;
let userLat = localStorage.getItem('userLat') || 17.6868; // Default Vizag
let userLng = localStorage.getItem('userLng') || 83.2185;

// 1. INITIALIZE MAP
document.addEventListener('DOMContentLoaded', () => {
    // Only init map if the container exists
    if(document.getElementById('map')) {
        initMap();
    }
});

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([userLat, userLng], 14);
    
    // Use CartoDB Voyager tiles for a softer, Google-like look
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap & CartoDB',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Create Custom "Blue Dot" Icon
    var blueDotIcon = L.divIcon({
        className: 'user-location-dot', // Uses the CSS we just added
        iconSize: [20, 20],
        iconAnchor: [10, 10] // Center the point
    });

    // Add User Marker with Custom Icon
    userMarker = L.marker([userLat, userLng], { icon: blueDotIcon }).addTo(map);

    // Load initial data
    loadMapProperties('');
    
    // Attach Search Listener
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => loadMapProperties(e.target.value));
    }
}

// 2. LOCATE USER FUNCTION (Linked to Button)
window.locateUser = function() {
    const btn = document.getElementById('fab-location-btn');
    if(btn) btn.innerText = '⏳'; // Show loading icon

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Success
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            
            // Save
            localStorage.setItem('userLat', userLat);
            localStorage.setItem('userLng', userLng);

            // Update Map
            if(map) {
                map.setView([userLat, userLng], 15);
                userMarker.setLatLng([userLat, userLng]);
            }

            if(btn) btn.innerText = '✅';
            setTimeout(() => { if(btn) btn.innerText = '📍'; }, 2000);
            
        },
        (error) => {
            // Error
            console.error(error);
            alert("Error: Unable to retrieve location. Check GPS permissions.");
            if(btn) btn.innerText = '❌';
        },
        { enableHighAccuracy: true } // Force GPS
    );
}

// 3. LOAD PROPERTIES
async function loadMapProperties(filterText) {
    // 1. Clean up old pins
    if(map) {
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer !== userMarker) {
                map.removeLayer(layer);
            }
        });
    }

    // 2. Fetch Data
    let query = _supabase.from('properties').select('*');
    if (filterText) {
        query = query.or(`title.ilike.%${filterText}%,property_type.ilike.%${filterText}%`);
    }

    const { data, error } = await query;

    // --- DEBUGGING ALERT ---
    if (error) {
        alert("Database Error: " + error.message);
    } else {
        // This will tell you if it found 0, 1, or 5 properties
        console.log("Found properties: " + data.length); 
        if(data.length === 0) {
             alert("Database connected, but found 0 properties. Try adding one!");
        }
    }
    // -----------------------

    if(data) {
        data.forEach(p => {
            if(p.latitude && p.longitude) {
                // Create Marker
                const marker = L.marker([p.latitude, p.longitude]).addTo(map);
                
                // Click Event -> Open Card
                marker.on('click', () => {
    const card = document.getElementById('property-card');
    
    // Fill Text
    document.getElementById('card-title').innerText = p.title;
    document.getElementById('card-price').innerText = '$' + p.price;
    document.getElementById('card-type').innerText = (p.property_type || 'Apartment') + ' • ' + p.listing_type;
    
    // Find the existing button and update its behavior
    // (Assuming you have only one button in .card-content)
    const btn = card.querySelector('.card-content button');
    if(btn) {
        btn.onclick = function() {
            window.location.href = `property-details.html?id=${p.id}`;
        };
    }
    
    card.classList.remove('hidden');
});
            }
        });
    }
}

function closeCard() {
    document.getElementById('property-card').classList.add('hidden');
}

// ==========================================
// ADD PROPERTY LOGIC
// ==========================================
const addPropertyForm = document.getElementById('add-property-form');
if (addPropertyForm) {
    // 1. Handle "Get Location" on the List Page
    const locBtn = document.getElementById('get-location-btn');
    if(locBtn) {
        locBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return alert('Geolocation not supported');
            document.getElementById('location-status').innerText = 'Locating...';

            navigator.geolocation.getCurrentPosition((pos) => {
                // Store locally to use in submission
                localStorage.setItem('tempLat', pos.coords.latitude);
                localStorage.setItem('tempLng', pos.coords.longitude);
                document.getElementById('location-status').innerText = '✅ Location Captured!';
            });
        });
    }

    // 2. Handle Form Submit
    addPropertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lat = localStorage.getItem('tempLat');
        const lng = localStorage.getItem('tempLng');

        if (!lat) return alert('Please click "Get Current Location" first.');

        const title = document.getElementById('title').value;
        const price = document.getElementById('price').value;
        const listingType = document.getElementById('listing_type').value;

        // Get current user
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return alert('Please login first.');

        // Save to DB
        const { error } = await _supabase.from('properties').insert([{ 
            owner_id: user.id,
            title: title, 
            price: price, 
            listing_type: listingType,
            property_type: 'Apartment',
            latitude: lat, 
            longitude: lng 
        }]);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Property listed!');
            window.location.href = 'index.html';
        }
    });
}

// ==========================================
// ADD PRODUCT LOGIC
// ==========================================
const addProductForm = document.getElementById('add-product-form');
if (addProductForm) {
    // 1. Handle Location
    const pLocBtn = document.getElementById('get-prod-loc-btn');
    if(pLocBtn) {
        pLocBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return alert('Geolocation not supported');
            document.getElementById('prod-loc-status').innerText = 'Locating...';
            
            navigator.geolocation.getCurrentPosition((pos) => {
                localStorage.setItem('tempProdLat', pos.coords.latitude);
                localStorage.setItem('tempProdLng', pos.coords.longitude);
                document.getElementById('prod-loc-status').innerText = '✅ Location Captured!';
            });
        });
    }

    // 2. Handle Submit
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lat = localStorage.getItem('tempProdLat');
        const lng = localStorage.getItem('tempProdLng');

        if (!lat) return alert("Please click 'Capture Location' first.");

        const name = document.getElementById('p-name').value;
        const price = document.getElementById('p-price').value;
        const desc = document.getElementById('p-desc').value;

        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return alert('Please login first.');

        const { error } = await _supabase.from('products').insert([{ 
            seller_id: user.id, 
            name: name, 
            price: price, 
            description: desc,
            latitude: lat,
            longitude: lng
        }]);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Product listed!');
            window.location.href = 'products.html';
        }
    });
}