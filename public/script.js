document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_BASE_URL = '/api/places';
    
    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const resultsContainer = document.getElementById('results-container');
    const rawJsonContainer = document.getElementById('raw-json');
    const rawJsonWrapper = document.getElementById('raw-json-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const toggleViewBtn = document.getElementById('toggle-view');
    const clearResultsBtn = document.getElementById('clear-results');
    const healthStatus = document.getElementById('health-status');
    const healthText = document.getElementById('health-text');
    
    // Forms
    const searchForm = document.getElementById('search-form');
    const nearbyForm = document.getElementById('nearby-form');
    const detailsForm = document.getElementById('details-form');
    const loadTypesBtn = document.getElementById('load-types-btn');
    const healthCheckBtn = document.getElementById('health-check-btn');
    
    // State Management
    let currentView = 'formatted'; // 'formatted' or 'json'
    let placeTypes = [];
    
    // Initialize Application
    init();
    
    function init() {
        setupTabNavigation();
        setupEventListeners();
        checkApiHealth();
        loadPlaceTypes();
    }
    
    // Tab Navigation System
    function setupTabNavigation() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                switchTab(targetTab);
            });
        });
    }
    
    function switchTab(tabName) {
        // Update tab buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab contents
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Clear results when switching tabs
        clearResults();
    }
    
    // Event Listeners Setup
    function setupEventListeners() {
        // Search Form
        searchForm.addEventListener('submit', handleSearch);
        
        // Nearby Form
        nearbyForm.addEventListener('submit', handleNearbySearch);
        
        // Details Form
        detailsForm.addEventListener('submit', handlePlaceDetails);
        
        // Load Types Button
        loadTypesBtn.addEventListener('click', displayPlaceTypes);
        
        // Health Check Button
        healthCheckBtn.addEventListener('click', checkApiHealth);
        
        // Result Controls
        toggleViewBtn.addEventListener('click', toggleResultView);
        clearResultsBtn.addEventListener('click', clearResults);
        
        // Auto-populate type selects when types are loaded
        window.addEventListener('typesLoaded', populateTypeSelects);
    }
    
    // API Health Check
    async function checkApiHealth() {
        try {
            showLoading();
            const response = await fetch('/health');
            const data = await response.json();
            
            updateHealthStatus(true, `API is healthy - ${data.service}`);
            displayHealthResults(data);
            
        } catch (error) {
            updateHealthStatus(false, 'API is unavailable');
            showError('Failed to connect to API: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    function updateHealthStatus(isHealthy, message) {
        healthStatus.className = `status-dot ${isHealthy ? 'healthy' : 'error'}`;
        healthText.textContent = message;
    }
    
    // Load Place Types
    async function loadPlaceTypes() {
        try {
            const response = await fetch(`${API_BASE_URL}/types`);
            const data = await response.json();
            
            if (data.success) {
                placeTypes = data.data;
                window.dispatchEvent(new Event('typesLoaded'));
            }
        } catch (error) {
            console.error('Failed to load place types:', error);
        }
    }
    
    function populateTypeSelects() {
        const selects = ['search-type', 'nearby-type'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // Clear existing options (except first one)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Add place types
            placeTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = formatPlaceType(type);
                select.appendChild(option);
            });
        });
    }
    
    function displayPlaceTypes() {
        const typesGrid = document.getElementById('types-grid');
        
        if (placeTypes.length === 0) {
            typesGrid.innerHTML = '<p>Loading place types...</p>';
            loadPlaceTypes().then(() => {
                if (placeTypes.length > 0) {
                    displayPlaceTypes();
                }
            });
            return;
        }
        
        typesGrid.innerHTML = '';
        
        placeTypes.forEach(type => {
            const typeCard = document.createElement('div');
            typeCard.className = 'type-card';
            typeCard.innerHTML = `
                <i class="${getPlaceTypeIcon(type)}"></i>
                <span>${formatPlaceType(type)}</span>
            `;
            
            // Make cards interactive
            typeCard.addEventListener('click', () => {
                switchTab('nearby');
                document.getElementById('nearby-type').value = type;
            });
            
            typesGrid.appendChild(typeCard);
        });
        
        showResults(`
            <div class="welcome-message">
                <i class="fas fa-list"></i>
                <h3>Available Place Types</h3>
                <p>Click any type below to use it in nearby search, or explore all ${placeTypes.length} supported types.</p>
            </div>
        `);
    }
    
    // Search Handlers
    async function handleSearch(e) {
        e.preventDefault();
        
        const query = document.getElementById('search-query').value.trim();
        const lat = parseFloat(document.getElementById('search-lat').value) || null;
        const lng = parseFloat(document.getElementById('search-lng').value) || null;
        const radius = parseInt(document.getElementById('search-radius').value) || null;
        const type = document.getElementById('search-type').value || null;
        
        if (!query) {
            showError('Please enter a search query');
            return;
        }
        
        const body = { query };
        if (lat && lng) body.location = { lat, lng };
        if (radius) body.radius = radius;
        if (type) body.type = type;
        
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            handleApiResponse(data, 'search');
            
        } catch (error) {
            showError('Search failed: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    async function handleNearbySearch(e) {
        e.preventDefault();
        
        const lat = parseFloat(document.getElementById('nearby-lat').value);
        const lng = parseFloat(document.getElementById('nearby-lng').value);
        const type = document.getElementById('nearby-type').value;
        const radius = parseInt(document.getElementById('nearby-radius').value) || 5000;
        
        if (isNaN(lat) || isNaN(lng)) {
            showError('Please enter valid latitude and longitude');
            return;
        }
        
        if (!type) {
            showError('Please select a place type');
            return;
        }
        
        const body = {
            location: { lat, lng },
            type,
            radius
        };
        
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/nearby`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            handleApiResponse(data, 'nearby');
            
        } catch (error) {
            showError('Nearby search failed: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    async function handlePlaceDetails(e) {
        e.preventDefault();
        
        const placeId = document.getElementById('place-id').value.trim();
        
        if (!placeId) {
            showError('Please enter a place ID');
            return;
        }
        
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/${placeId}`);
            const data = await response.json();
            handleApiResponse(data, 'details');
            
        } catch (error) {
            showError('Failed to get place details: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    // Response Handlers
    function handleApiResponse(data, type) {
        updateRawJson(data);
        
        if (!data.success) {
            showError(data.error || 'API request failed');
            return;
        }
        
        switch (type) {
            case 'search':
            case 'nearby':
                displayPlaceResults(data.data, data.message);
                break;
            case 'details':
                displayPlaceDetails(data.data, data.message);
                break;
            default:
                displayGenericResults(data);
        }
    }
    
    function displayHealthResults(data) {
        const html = `
            <div class="place-card">
                <div class="place-header">
                    <div class="place-name">API Health Status</div>
                    <div class="place-rating">
                        <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                        ${data.status}
                    </div>
                </div>
                <div class="place-details">
                    <div class="detail-item">
                        <i class="fas fa-server"></i>
                        Service: ${data.service}
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        Timestamp: ${new Date(data.timestamp).toLocaleString()}
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-globe"></i>
                        Status: Operational
                    </div>
                </div>
            </div>
        `;
        showResults(html);
    }
    
    function displayPlaceResults(places, message) {
        if (!places || places.length === 0) {
            showResults(`
                <div class="welcome-message">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>${message || 'Try adjusting your search criteria.'}</p>
                </div>
            `);
            return;
        }
        
        const html = `
            <div class="results-header" style="margin-bottom: 20px;">
                <h3><i class="fas fa-map-marker-alt"></i> ${message}</h3>
            </div>
            ${places.map(place => createPlaceCard(place)).join('')}
        `;
        
        showResults(html);
    }
    
    function displayPlaceDetails(place, message) {
        const html = `
            <div class="results-header" style="margin-bottom: 20px;">
                <h3><i class="fas fa-info-circle"></i> ${message}</h3>
            </div>
            ${createDetailedPlaceCard(place)}
        `;
        
        showResults(html);
    }
    
    function createPlaceCard(place) {
        const rating = place.rating ? `
            <div class="place-rating">
                <i class="fas fa-star"></i>
                ${place.rating.toFixed(1)}
            </div>
        ` : '';
        
        const priceLevel = place.priceLevel ? '💰'.repeat(place.priceLevel) : '';
        const isOpen = place.isOpen !== undefined ? 
            `<span style="color: ${place.isOpen ? 'var(--success-color)' : 'var(--error-color)'}">
                ${place.isOpen ? '🟢 Open' : '🔴 Closed'}
            </span>` : '';
        
        return `
            <div class="place-card">
                <div class="place-header">
                    <div>
                        <div class="place-name">${place.name}</div>
                        <div class="place-address">${place.address}</div>
                    </div>
                    ${rating}
                </div>
                <div class="place-details">
                    <div class="detail-item">
                        <i class="fas fa-map-pin"></i>
                        ${place.location.lat.toFixed(4)}, ${place.location.lng.toFixed(4)}
                    </div>
                    ${priceLevel ? `<div class="detail-item"><i class="fas fa-dollar-sign"></i> ${priceLevel}</div>` : ''}
                    ${isOpen ? `<div class="detail-item"><i class="fas fa-clock"></i> ${isOpen}</div>` : ''}
                    <div class="detail-item">
                        <i class="fas fa-tags"></i>
                        ${place.types.slice(0, 3).map(formatPlaceType).join(', ')}
                    </div>
                </div>
                <div class="place-id" onclick="copyToClipboard('${place.id}', this)" title="Click to copy Place ID">
                    <i class="fas fa-copy"></i> ID: ${place.id}
                </div>
            </div>
        `;
    }
    
    function createDetailedPlaceCard(place) {
        const photos = place.photos && place.photos.length > 0 ? `
            <div class="photo-gallery">
                ${place.photos.slice(0, 6).map(photo => 
                    `<img src="${photo}" alt="${place.name}" onclick="openPhotoModal('${photo}')">`
                ).join('')}
            </div>
        ` : '';
        
        const reviews = place.reviews && place.reviews.length > 0 ? `
            <div style="margin-top: 15px;">
                <h4><i class="fas fa-comments"></i> Recent Reviews</h4>
                ${place.reviews.slice(0, 3).map(review => `
                    <div style="border-left: 3px solid var(--border-color); padding-left: 10px; margin: 10px 0;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <span>${'⭐'.repeat(review.rating)}</span>
                            <strong>${review.author}</strong>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${review.text.slice(0, 200)}${review.text.length > 200 ? '...' : ''}</p>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        const contact = `
            <div style="margin-top: 15px;">
                <h4><i class="fas fa-address-book"></i> Contact Information</h4>
                <div class="place-details">
                    ${place.phoneNumber ? `<div class="detail-item"><i class="fas fa-phone"></i> ${place.phoneNumber}</div>` : ''}
                    ${place.website ? `<div class="detail-item"><i class="fas fa-globe"></i> <a href="${place.website}" target="_blank">Website</a></div>` : ''}
                </div>
            </div>
        `;
        
        const hours = place.openingHours && place.openingHours.length > 0 ? `
            <div style="margin-top: 15px;">
                <h4><i class="fas fa-clock"></i> Opening Hours</h4>
                ${place.openingHours.map(hour => `<div style="font-size: 0.9rem; color: var(--text-secondary);">${hour}</div>`).join('')}
            </div>
        ` : '';
        
        return createPlaceCard(place).replace('</div>', '') + photos + reviews + contact + hours + '</div>';
    }
    
    // Utility Functions
    function formatPlaceType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function getPlaceTypeIcon(type) {
        const iconMap = {
            restaurant: 'fas fa-utensils',
            gas_station: 'fas fa-gas-pump',
            hospital: 'fas fa-hospital',
            pharmacy: 'fas fa-pills',
            bank: 'fas fa-university',
            atm: 'fas fa-credit-card',
            shopping_mall: 'fas fa-shopping-bag',
            grocery_store: 'fas fa-shopping-cart',
            hotel: 'fas fa-bed',
            tourist_attraction: 'fas fa-camera',
            park: 'fas fa-tree',
            school: 'fas fa-graduation-cap',
            gym: 'fas fa-dumbbell',
            movie_theater: 'fas fa-film',
            library: 'fas fa-book',
            church: 'fas fa-church',
            mosque: 'fas fa-mosque',
            police: 'fas fa-shield-alt',
            fire_station: 'fas fa-fire-extinguisher',
            post_office: 'fas fa-mail-bulk',
            car_rental: 'fas fa-car',
            beauty_salon: 'fas fa-cut',
            dentist: 'fas fa-tooth',
            doctor: 'fas fa-user-md'
        };
        return iconMap[type] || 'fas fa-map-marker-alt';
    }
    
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        resultsContainer.innerHTML = '';
    }
    
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }
    
    function showResults(html) {
        resultsContainer.innerHTML = html;
        currentView = 'formatted';
        rawJsonWrapper.classList.add('hidden');
        updateToggleButton();
    }
    
    function showError(message) {
        const html = `
            <div class="place-card" style="border-color: var(--error-color);">
                <div class="place-header">
                    <div class="place-name" style="color: var(--error-color);">
                        <i class="fas fa-exclamation-triangle"></i> Error
                    </div>
                </div>
                <div class="place-address">${message}</div>
            </div>
        `;
        showResults(html);
    }
    
    function updateRawJson(data) {
        rawJsonContainer.textContent = JSON.stringify(data, null, 2);
    }
    
    function toggleResultView() {
        if (currentView === 'formatted') {
            resultsContainer.classList.add('hidden');
            rawJsonWrapper.classList.remove('hidden');
            currentView = 'json';
        } else {
            resultsContainer.classList.remove('hidden');
            rawJsonWrapper.classList.add('hidden');
            currentView = 'formatted';
        }
        updateToggleButton();
    }
    
    function updateToggleButton() {
        const span = toggleViewBtn.querySelector('span');
        const icon = toggleViewBtn.querySelector('i');
        
        if (currentView === 'formatted') {
            span.textContent = 'Show Raw JSON';
            icon.className = 'fas fa-code';
        } else {
            span.textContent = 'Show Formatted';
            icon.className = 'fas fa-eye';
        }
    }
    
    function clearResults() {
        resultsContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-rocket"></i>
                <h3>Welcome to TalkForce.ai Location Services!</h3>
                <p>Select a feature above to start exploring our AI-powered location API.</p>
            </div>
        `;
        rawJsonContainer.textContent = '';
        rawJsonWrapper.classList.add('hidden');
        currentView = 'formatted';
        updateToggleButton();
    }
    
    // Global functions for interactive elements
    window.copyToClipboard = function(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = element.innerHTML;
            element.innerHTML = '<i class="fas fa-check"></i> Copied!';
            element.style.background = 'var(--success-color)';
            element.style.color = 'white';
            
            setTimeout(() => {
                element.innerHTML = originalText;
                element.style.background = 'var(--bg-color)';
                element.style.color = 'var(--text-secondary)';
            }, 2000);
        });
    };
    
    window.openPhotoModal = function(photoUrl) {
        // Simple photo modal - you could enhance this with a proper modal
        window.open(photoUrl, '_blank');
    };
    
    function displayGenericResults(data) {
        const html = `
            <div class="place-card">
                <div class="place-header">
                    <div class="place-name">API Response</div>
                </div>
                <div class="place-address">${data.message || 'Request completed successfully'}</div>
                <div class="place-details">
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        Status: ${data.success ? 'Success' : 'Failed'}
                    </div>
                    ${data.count !== undefined ? `<div class="detail-item"><i class="fas fa-list-ol"></i> Count: ${data.count}</div>` : ''}
                </div>
            </div>
        `;
        showResults(html);
    }
}); 