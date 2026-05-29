// --- State & DOM Elements ---
let searchTimeout = null;
let homeLoaded = false;
let browseLoaded = false;
let sidebarLoaded = false;

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const homeContent = document.getElementById('home-content');
const libraryContent = document.getElementById('library-content'); // Now used for Search Browse
const sidebarPlaylists = document.getElementById('sidebar-playlists'); // New sidebar area

// Views
const views = {
    home: document.getElementById('view-home'),
    search: document.getElementById('view-search'),
    library: document.getElementById('view-library') // Now acts as the "Browse" section for Search
};

// Nav Links
const navLinks = {
    home: document.getElementById('nav-home'),
    search: document.getElementById('nav-search')
};

// --- Routing Logic ---
function navigateTo(route) {
    // Default to home if route is invalid
    if (route !== 'home' && route !== 'search') route = 'home';

    // Update URL hash without jumping
    window.history.pushState(null, null, `#${route}`);

    // Hide all views, remove active from all links
    Object.keys(views).forEach(key => {
        if(views[key]) views[key].style.display = 'none';
    });
    Object.keys(navLinks).forEach(key => {
        if(navLinks[key]) navLinks[key].classList.remove('active');
    });

    // Handle Active Link
    if (navLinks[route]) navLinks[route].classList.add('active');

    // Handle View Display
    if (route === 'home') {
        views.home.style.display = 'block';
        if (!homeLoaded) loadHomePage();
    } else if (route === 'search') {
        searchInput.focus();
        if (searchInput.value.trim().length > 0) {
            views.search.style.display = 'block'; // Show results if there's a query
        } else {
            views.library.style.display = 'block'; // Show colored categories if empty
            if (!browseLoaded) loadBrowsePage();
        }
    }
}

// Handle hash changes (back/forward browser buttons)
window.addEventListener('hashchange', () => {
    const route = window.location.hash.substring(1) || 'home';
    navigateTo(route);
});

// Setup click listeners for sidebar
Object.keys(navLinks).forEach(route => {
    if(navLinks[route]) {
        navLinks[route].addEventListener('click', () => {
            navigateTo(route);
        });
    }
});

// --- Initialization ---
// Initial load routing
const initialRoute = window.location.hash.substring(1) || 'home';
navigateTo(initialRoute);
loadSidebarPlaylists(); // Always load sidebar on startup


// --- Page Loaders ---
async function loadSidebarPlaylists() {
    if (sidebarLoaded) return;
    try {
        const res = await fetch('/api/sidebar');
        if (!res.ok) throw new Error('Failed to load sidebar data');
        const data = await res.json();
        
        let html = '';
        if (data.playlists && data.playlists.length > 0) {
            data.playlists.forEach(pl => {
                const img = pl.images && pl.images.length > 0 ? pl.images[0].url : 'https://via.placeholder.com/48';
                const owner = pl.owner ? pl.owner.display_name : 'Spotify';
                html += `
                    <div class="sidebar-playlist-item">
                        <img src="${img}" alt="${pl.name}">
                        <div class="sidebar-playlist-info">
                            <div class="sidebar-playlist-title" title="${pl.name}">${pl.name}</div>
                            <div class="sidebar-playlist-desc">Playlist • ${owner}</div>
                        </div>
                    </div>
                `;
            });
        }
        sidebarPlaylists.innerHTML = html;
        sidebarLoaded = true;
    } catch (e) {
        console.error(e);
        sidebarPlaylists.innerHTML = `<p style="color:red;text-align:center;">Failed to load.</p>`;
    }
}

async function loadHomePage() {
    try {
        const res = await fetch('/api/home');
        if (!res.ok) throw new Error('Failed to load home data');
        const data = await res.json();
        
        let html = '';
        
        // Featured Playlists Hero
        if (data.featuredPlaylists && data.featuredPlaylists.length > 0) {
            const feat = data.featuredPlaylists[0];
            const img = feat.images[0] ? feat.images[0].url : 'https://via.placeholder.com/500';
            html += `
                <div class="hero-banner">
                    <div class="hero-overlay"></div>
                    <div class="hero-content">
                        <img src="${img}" alt="${feat.name}" class="hero-art">
                        <div class="hero-info">
                            <span class="hero-tag">Playlist</span>
                            <h1 class="hero-title">${feat.name}</h1>
                            <p class="hero-desc">${feat.description || 'Discover new music with this featured playlist.'}</p>
                            <button class="hero-play-btn"><i class="fas fa-play"></i> Play</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // New Releases
        if (data.newReleases && data.newReleases.length > 0) {
            html += `<h2 class="section-title">Made For You</h2><div class="cards-grid">`;
            data.newReleases.forEach(album => {
                const img = album.images[0] ? album.images[0].url : 'https://via.placeholder.com/200';
                const artists = album.artists.map(a => a.name).join(', ');
                html += `
                    <div class="music-card">
                        <div class="mc-img">
                            <img src="${img}" alt="${album.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                            <div class="mc-play"><i class="fas fa-play" style="color: black; font-size: 16px; margin-left: 3px;"></i></div>
                        </div>
                        <div class="mc-title" title="${album.name}">${album.name}</div>
                        <div class="mc-desc" title="${artists}">${artists}</div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        homeContent.innerHTML = html;
        homeLoaded = true;
    } catch (e) {
        console.error(e);
        homeContent.innerHTML = `<p style="color:red;text-align:center;">Error loading home data. Check server logs.</p>`;
    }
}

async function loadBrowsePage() {
    try {
        const res = await fetch('/api/library');
        if (!res.ok) throw new Error('Failed to load browse data');
        const data = await res.json();
        
        let html = '';
        if (data.categories && data.categories.length > 0) {
            data.categories.forEach(cat => {
                const img = cat.images && cat.images.length > 0 ? cat.images[0].url : 'https://via.placeholder.com/200';
                // Pick random color from a set
                const colors = ['#E13300', '#1E3264', '#E8115B', '#148A08', '#BA5D07', '#E1118C', '#8C1932', '#B49BC8', '#27856A'];
                const bg = colors[Math.floor(Math.random() * colors.length)];
                html += `
                    <div class="genre-card" style="background-color: ${bg};">
                        <span class="genre-name">${cat.name}</span>
                        <img src="${img}" class="genre-art">
                    </div>
                `;
            });
        }

        libraryContent.innerHTML = html;
        browseLoaded = true;
    } catch (e) {
        console.error(e);
        libraryContent.innerHTML = `<p style="color:red;text-align:center;">Error loading categories.</p>`;
    }
}

// --- Search Logic ---
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Automatically switch to search view if typing
    if (window.location.hash !== '#search' && query.length > 0) {
        navigateTo('search');
    } else if (window.location.hash === '#search') {
        if (query.length > 0) {
            views.library.style.display = 'none';
            views.search.style.display = 'block';
        } else {
            views.search.style.display = 'none';
            views.library.style.display = 'block';
            if (!browseLoaded) loadBrowsePage();
        }
    }
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length > 0) {
        // Show searching state
        resultsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-subdued); margin-top: 40px;">Searching...</p>';
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchSpotify(query);
        }, 500);
    } else {
        resultsContainer.innerHTML = '';
    }
});

async function searchSpotify(query) {
    try {
        // We hit our own backend server instead of Spotify directly
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        displayResults(data.tracks.items);
    } catch (error) {
        console.error('Error searching:', error);
        resultsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #E8115B; margin-top: 40px; padding: 20px; background: rgba(232, 17, 91, 0.1); border-radius: 8px;">
                <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 12px;"></i>
                <p><strong>Error:</strong> ${error.message}</p>
            </div>
        `;
    }
}

function displayResults(tracks) {
    resultsContainer.innerHTML = ''; // Clear previous results

    if (!tracks || tracks.length === 0) {
        resultsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-subdued); margin-top: 40px;">No results found for your search.</p>';
        return;
    }

    tracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'music-card';

        const image = track.album.images.length > 0 ? track.album.images[0].url : 'https://via.placeholder.com/200';
        const artistNames = track.artists.map(artist => artist.name).join(', ');

        card.innerHTML = `
            <div class="mc-img">
                <img src="${image}" alt="${track.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                <div class="mc-play">
                    <i class="fas fa-play" style="color: black; font-size: 16px; margin-left: 3px;"></i>
                </div>
            </div>
            <div class="mc-title" title="${track.name}">${track.name}</div>
            <div class="mc-desc" title="${artistNames}">${artistNames}</div>
        `;

        resultsContainer.appendChild(card);
    });
}
