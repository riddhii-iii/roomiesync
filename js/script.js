/* RoomieSync Firebase app
   -----------------------
   This is still a simple static website. Firebase provides the shared backend:
   - Firebase Auth: email/password signup, login, logout
   - Firestore: public profile documents and room listing documents
   - Storage: uploaded profile photos and room images
*/

const DEMO_IMAGE = 'images/room-1.svg';
const DEMO_AVATAR = 'images/avatar-1.svg';
const THEME_KEY = 'roomieSyncTheme';

let appData = { profiles: [], rooms: [] };
let currentUser = null;
let currentProfile = null;

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function applyTheme(theme) {
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selectedTheme;
  localStorage.setItem(THEME_KEY, selectedTheme);

  const toggle = qs('#themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-label', `Switch to ${selectedTheme === 'dark' ? 'light' : 'dark'} mode`);
    toggle.innerHTML = selectedTheme === 'dark'
      ? '<span class="theme-icon">☀</span><span>Light</span>'
      : '<span class="theme-icon">☾</span><span>Dark</span>';
  }
}

function initThemeToggle() {
  const nav = qs('.nav');
  if (!nav || qs('#themeToggle')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'themeToggle';
  button.className = 'theme-toggle';
  nav.appendChild(button);

  applyTheme(getSavedTheme());
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

function hasFirebase() {
  return Boolean(window.firebase && window.auth && window.db && window.storage);
}

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  const amount = Number(value || 0);
  return '₹' + amount.toLocaleString('en-IN');
}

function tagsFromText(text) {
  return String(text || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function arrayIntersection(a = [], b = []) {
  return a.filter(item => b.includes(item));
}

function computeCompatibility(a = {}, b = {}) {
  let score = 45;
  const aPrefs = a.preferences || {};
  const bPrefs = b.preferences || {};

  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) score += 12;
  if (aPrefs.food && bPrefs.food && aPrefs.food === bPrefs.food) score += 12;
  if (aPrefs.sleep && bPrefs.sleep && aPrefs.sleep === bPrefs.sleep) score += 12;
  if (aPrefs.smoking && bPrefs.smoking && aPrefs.smoking === bPrefs.smoking) score += 10;
  if (aPrefs.pets && bPrefs.pets && aPrefs.pets === bPrefs.pets) score += 8;

  const budgetDiff = Math.abs(Number(aPrefs.budget || 0) - Number(bPrefs.budget || 0));
  if (aPrefs.budget && bPrefs.budget && budgetDiff <= 3000) score += 12;

  score += Math.min(arrayIntersection(a.tags || [], b.tags || []).length * 5, 15);
  return Math.max(40, Math.min(99, Math.round(score)));
}

function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  element.style.display = 'block';
}

function showSuccess(element, message) {
  if (!element) return;
  element.textContent = message;
  element.style.color = '#10B981';
  element.style.background = 'rgba(16, 185, 129, 0.12)';
  element.style.borderColor = 'rgba(16, 185, 129, 0.35)';
  element.classList.add('show');
  element.style.display = 'block';
}

function hideError(element) {
  if (!element) return;
  element.textContent = '';
  element.classList.remove('show');
  element.style.display = 'none';
}

function setButtonLoading(button, text) {
  if (!button) return;
  button.disabled = true;
  button.dataset.originalText = button.dataset.originalText || button.textContent;
  button.textContent = text;
}

function resetButton(button) {
  if (!button) return;
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

async function fetchStarterData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Could not load demo data');
    return await res.json();
  } catch (error) {
    return { profiles: [], rooms: [] };
  }
}

function firebaseSetupMessage() {
  const message = `
    <div class="placeholder-loading">
      Connect your Firebase config in <strong>firebase-config.js</strong> to load shared public data.
    </div>
  `;
  qsa('.matches-grid, .rooms-grid, .featured-rooms-grid').forEach(container => {
    container.innerHTML = message;
  });
}

async function loadProfilesFromFirestore() {
  const snapshot = await db.collection('profiles').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadRoomsFromFirestore() {
  const snapshot = await db.collection('rooms').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadSharedData() {
  const starter = await fetchStarterData();

  if (!hasFirebase()) {
    appData = {
      profiles: starter.profiles || [],
      rooms: starter.rooms || []
    };
    renderAll();
    return;
  }

  try {
    const [profiles, rooms] = await Promise.all([
      loadProfilesFromFirestore(),
      loadRoomsFromFirestore()
    ]);

    appData = {
      profiles: [...profiles, ...(starter.profiles || [])],
      rooms: [...rooms, ...(starter.rooms || [])]
    };
    renderAll();
  } catch (error) {
    console.error('Firestore load error:', error);
    appData = { profiles: starter.profiles || [], rooms: starter.rooms || [] };
    renderAll();
  }
}

async function loadCurrentProfile(user) {
  if (!user || !hasFirebase()) return null;
  const doc = await db.collection('profiles').doc(user.uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function uploadImage(file, folder) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('Please upload an image file.');
  if (file.size > 3 * 1024 * 1024) throw new Error('Image size must be below 3 MB.');

  // Image upload flow:
  // 1. Put the file in Firebase Storage.
  // 2. Get its public download URL.
  // 3. Save that URL in Firestore, so all users can display the image.
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
  const path = `${folder}/${Date.now()}-${safeName}`;
  const snapshot = await storage.ref(path).put(file);
  return snapshot.ref.getDownloadURL();
}

function getProfileById(id) {
  return appData.profiles.find(profile => String(profile.id) === String(id));
}

function requireLogin() {
  if (currentUser) return true;
  window.location.href = 'login.html';
  return false;
}

function updateNavbarLoginState() {
  const nav = qs('.nav');
  if (!nav) return;

  const loginLink = nav.querySelector('a[href="login.html"]');
  const logoutButton = nav.querySelector('.logout-btn');
  const profileLink = nav.querySelector('a[href="profile.html"]');
  const postRoomLink = nav.querySelector('a[href="post-room.html"]');

  if (currentUser) {
    if (!profileLink) loginLink?.insertAdjacentHTML('beforebegin', '<a href="profile.html">Profile</a>');
    if (!postRoomLink) loginLink?.insertAdjacentHTML('beforebegin', '<a href="post-room.html">Post Room</a>');
    if (loginLink) {
      loginLink.textContent = 'Logout';
      loginLink.href = '#';
      loginLink.classList.add('logout-btn');
      loginLink.addEventListener('click', handleLogout);
    }
  } else {
    profileLink?.remove();
    postRoomLink?.remove();
    if (logoutButton) {
      logoutButton.textContent = 'Login';
      logoutButton.href = 'login.html';
      logoutButton.classList.remove('logout-btn');
      logoutButton.removeEventListener('click', handleLogout);
    }
  }
}

function renderAll() {
  renderHeroPreview();
  renderFeaturedRooms();
  renderMatches();
  renderRooms();
  renderProfileIfNeeded();
}

function renderHeroPreview() {
  const preview = qs('.hero-right .roommate-card.preview');
  if (!preview) return;
  const profile = currentProfile || appData.profiles[0];
  if (!profile) return;
  const compat = currentProfile ? computeCompatibility(currentProfile, profile) : (profile.compatibility || 86);

  preview.innerHTML = `
    <img src="${escapeHTML(profile.avatar || profile.photoURL || DEMO_AVATAR)}" alt="${escapeHTML(profile.name)}" class="avatar">
    <div class="card-body">
      <div class="card-header">
        <h3>${escapeHTML(profile.name)}</h3>
        <div class="compat">${compat}% Match</div>
      </div>
      <p class="muted">${escapeHTML(profile.city || 'Campus community')}</p>
      <p class="bio">${escapeHTML(profile.bio || 'Looking for a compatible roommate.')}</p>
      <div class="tags">${(profile.tags || ['Student']).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
    </div>
  `;
}

function renderMatches() {
  const grid = qs('.matches-grid');
  if (!grid) return;

  const profiles = appData.profiles
    .filter(profile => !currentUser || profile.id !== currentUser.uid)
    .map(profile => ({
      ...profile,
      compatibility: currentProfile ? computeCompatibility(currentProfile, profile) : (profile.compatibility || 75)
    }))
    .sort((a, b) => b.compatibility - a.compatibility);

  if (!profiles.length) {
    grid.innerHTML = '<div class="placeholder-loading">No roommate profiles yet. Create your profile to appear here.</div>';
    return;
  }

  grid.innerHTML = profiles.map(profile => `
    <article class="card roommate-card">
      <img src="${escapeHTML(profile.avatar || profile.photoURL || DEMO_AVATAR)}" alt="${escapeHTML(profile.name)}" class="avatar">
      <div class="card-body">
        <div class="card-header">
          <h3>${escapeHTML(profile.name || 'Roommate')}</h3>
          <div class="compat">${profile.compatibility}% Compatible</div>
        </div>
        <p class="muted">${escapeHTML(profile.age ? `${profile.age} years` : 'Age not added')} • ${escapeHTML(profile.city || 'City not added')}</p>
        <p class="muted">${escapeHTML(profile.occupation || 'Student / young professional')}</p>
        <p class="bio">${escapeHTML(profile.bio || 'This roommate has not added a bio yet.')}</p>
        <div class="tags">${(profile.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
        <div class="match-signals">
          <span>${escapeHTML(profile.preferences?.sleep || 'Flexible')}</span>
          <span>${escapeHTML(profile.preferences?.food || 'Any food')}</span>
          <span>${money(profile.preferences?.budget || 0)} budget</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-ghost" href="profile.html?id=${encodeURIComponent(profile.id)}">View Profile</a>
        </div>
      </div>
    </article>
  `).join('');
}

function roomCard(room) {
  return `
    <article class="card room-card">
      <img src="${escapeHTML(room.image || room.imageUrl || DEMO_IMAGE)}" alt="${escapeHTML(room.title || 'Room image')}" class="room-img">
      <div class="card-body">
        <div class="room-card-topline">
          <span>${escapeHTML(room.type || 'Room')}</span>
          <strong>${money(room.price || room.rent || 0)} / month</strong>
        </div>
        <h3>${escapeHTML(room.title || 'Available room')}</h3>
        <p class="muted">${escapeHTML(room.location || room.city || 'Location not added')}</p>
        <p class="bio">${escapeHTML(room.description || 'No description added yet.')}</p>
        <div class="room-meta">
          <span>Posted by ${escapeHTML(room.ownerName || room.username || 'RoomieSync user')}</span>
          <span>${escapeHTML(room.roommatePreference || 'Any roommate')}</span>
          <span>Move-in: ${escapeHTML(room.moveInDate || 'Flexible')}</span>
        </div>
        <div class="amenities">${(room.amenities || []).map(item => `<span>${escapeHTML(item)}</span>`).join('')}</div>
      </div>
    </article>
  `;
}

function renderRooms() {
  const grid = qs('.rooms-grid');
  if (!grid) return;
  const rooms = appData.rooms || [];

  if (!rooms.length) {
    grid.innerHTML = '<div class="placeholder-loading">No rooms have been posted yet.</div>';
    return;
  }

  grid.innerHTML = rooms.map(roomCard).join('');
}

function renderFeaturedRooms() {
  const grid = qs('.featured-rooms-grid');
  if (!grid) return;
  const rooms = (appData.rooms || []).slice(0, 3);
  grid.innerHTML = rooms.length
    ? rooms.map(roomCard).join('')
    : '<div class="placeholder-loading">Featured rooms will appear here after users post listings.</div>';
}

function renderProfileIfNeeded() {
  const container = qs('.profile-page .profile-card');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');

  if (!idParam && !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const profile = idParam ? getProfileById(idParam) : currentProfile;
  if (!profile) {
    container.innerHTML = '<div class="placeholder-loading">Profile not found yet. If this is your profile, complete it after logging in.</div>';
    return;
  }

  if (currentUser && profile.id === currentUser.uid && !idParam) {
    renderOwnProfile(container, profile);
  } else {
    renderPublicProfile(container, profile);
  }
}

function renderPublicProfile(container, profile) {
  container.innerHTML = `
    <img src="${escapeHTML(profile.avatar || DEMO_AVATAR)}" alt="${escapeHTML(profile.name)}" class="profile-photo">
    <div class="profile-body">
      <h2>${escapeHTML(profile.name || 'RoomieSync user')}</h2>
      <p class="muted">${escapeHTML(profile.age ? `${profile.age} years` : 'Age not added')} • ${escapeHTML(profile.city || 'City not added')}</p>
      <p class="muted">${escapeHTML(profile.occupation || 'Student / young professional')}</p>
      <p class="bio">${escapeHTML(profile.bio || 'No bio added yet.')}</p>
      <div class="tags">${(profile.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
      <h4>Preferences</h4>
      <div class="profile-details">
        <span>Budget: ${money(profile.preferences?.budget || 0)}</span>
        <span>Food: ${escapeHTML(profile.preferences?.food || 'Any')}</span>
        <span>Sleep: ${escapeHTML(profile.preferences?.sleep || 'Flexible')}</span>
        <span>Smoking: ${escapeHTML(profile.preferences?.smoking || 'Not added')}</span>
        <span>Pets: ${escapeHTML(profile.preferences?.pets || 'Not added')}</span>
      </div>
      <h4>Looking For</h4>
      <p class="muted">${escapeHTML(profile.lookingFor || 'A responsible and compatible roommate.')}</p>
    </div>
  `;
}

function renderOwnProfile(container, profile) {
  const ownRooms = appData.rooms.filter(room => room.ownerId === currentUser.uid);

  container.innerHTML = `
    <div class="profile-edit">
      <div class="profile-preview">
        <img src="${escapeHTML(profile.avatar || DEMO_AVATAR)}" alt="Profile photo" class="profile-photo" id="profilePhotoPreview">
        <label class="upload-label">Profile photo</label>
        <input type="file" id="avatarInput" accept="image/*">
      </div>
      <form class="profile-form" id="profileForm">
        <div class="form-group">
          <label>Name</label>
          <input id="profileName" value="${escapeHTML(profile.name || '')}" required>
        </div>
        <div class="form-group">
          <label>City</label>
          <input id="profileCity" value="${escapeHTML(profile.city || '')}" required>
        </div>
        <div class="form-group">
          <label>Bio</label>
          <textarea id="profileBio" rows="4" required>${escapeHTML(profile.bio || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Lifestyle tags (comma separated)</label>
          <input id="profileTags" value="${escapeHTML((profile.tags || []).join(', '))}">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Budget</label>
            <input type="number" id="profileBudget" value="${escapeHTML(profile.preferences?.budget || 15000)}">
          </div>
          <div class="form-group">
            <label>Food</label>
            <select id="profileFood">
              <option value="any">Any</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="non-vegetarian">Non-vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sleep</label>
            <select id="profileSleep">
              <option value="flexible">Flexible</option>
              <option value="early">Early sleeper</option>
              <option value="night">Night owl</option>
            </select>
          </div>
          <div class="form-group">
            <label>Smoking</label>
            <select id="profileSmoking">
              <option value="no">Non-smoker</option>
              <option value="yes">Smoker</option>
              <option value="occasionally">Occasionally</option>
            </select>
          </div>
          <div class="form-group">
            <label>Pets</label>
            <select id="profilePets">
              <option value="no">No pets</option>
              <option value="yes">Pet friendly</option>
              <option value="maybe">Open to pets</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Roommate preferences</label>
          <textarea id="profileLookingFor" rows="3">${escapeHTML(profile.lookingFor || '')}</textarea>
        </div>
        <div id="profileSaveMessage" class="form-error"></div>
        <button class="btn btn-primary" type="submit" id="saveProfileBtn">Save Profile</button>
      </form>
      <div class="profile-room-list">
        <h3>Your listings</h3>
        <div class="rooms-grid">${ownRooms.length ? ownRooms.map(roomCard).join('') : '<p class="muted">You have not posted any rooms yet.</p>'}</div>
      </div>
    </div>
  `;

  const prefs = profile.preferences || {};
  ['profileFood', 'profileSleep', 'profileSmoking', 'profilePets'].forEach(id => {
    const field = document.getElementById(id);
    const key = id.replace('profile', '').toLowerCase();
    if (field && prefs[key]) field.value = prefs[key];
  });

  initProfileForm(profile);
}

function initProfileForm(profile) {
  const form = qs('#profileForm');
  const avatarInput = qs('#avatarInput');
  const preview = qs('#profilePhotoPreview');
  const message = qs('#profileSaveMessage');
  if (!form) return;

  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (file) preview.src = URL.createObjectURL(file);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!requireLogin()) return;

    const saveBtn = qs('#saveProfileBtn');
    hideError(message);
    setButtonLoading(saveBtn, 'Saving...');

    try {
      const avatarFile = avatarInput?.files[0];
      const avatarUrl = avatarFile ? await uploadImage(avatarFile, `profiles/${currentUser.uid}`) : profile.avatar;
      const updatedProfile = {
        name: qs('#profileName').value.trim(),
        city: qs('#profileCity').value.trim(),
        bio: qs('#profileBio').value.trim(),
        tags: tagsFromText(qs('#profileTags').value),
        avatar: avatarUrl || DEMO_AVATAR,
        preferences: {
          budget: Number(qs('#profileBudget').value || 0),
          food: qs('#profileFood').value,
          sleep: qs('#profileSleep').value,
          smoking: qs('#profileSmoking').value,
          pets: qs('#profilePets').value
        },
        lookingFor: qs('#profileLookingFor').value.trim(),
        email: currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('profiles').doc(currentUser.uid).set(updatedProfile, { merge: true });
      currentProfile = { id: currentUser.uid, ...updatedProfile };
      await loadSharedData();
      showSuccess(message, 'Profile saved successfully.');
    } catch (error) {
      showError(message, error.message || 'Could not save profile.');
    } finally {
      resetButton(saveBtn);
    }
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const email = qs('#loginEmail').value.trim();
  const password = qs('#loginPassword').value;
  const error = qs('#errorMessage');
  const button = qs('#loginBtn');

  if (!hasFirebase()) {
    showError(error, 'Add your Firebase config before login will work.');
    return;
  }

  hideError(error);
  setButtonLoading(button, 'Logging in...');

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'index.html';
  } catch (err) {
    showError(error, 'Login failed. Check your email and password.');
    resetButton(button);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const error = qs('#registerError');
  const button = qs('#registerBtn');

  if (!hasFirebase()) {
    showError(error, 'Add your Firebase config before registration will work.');
    return;
  }

  const name = qs('#registerName').value.trim();
  const email = qs('#registerEmail').value.trim();
  const password = qs('#registerPassword').value;
  const city = qs('#registerCity').value.trim();

  if (!name || !email || !password || !city) {
    showError(error, 'Please fill all required fields.');
    return;
  }

  if (password.length < 6) {
    showError(error, 'Password must be at least 6 characters.');
    return;
  }

  hideError(error);
  setButtonLoading(button, 'Creating account...');

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    const avatarFile = qs('#registerAvatar')?.files[0];
    const avatarUrl = avatarFile ? await uploadImage(avatarFile, `profiles/${user.uid}`) : DEMO_AVATAR;
    const checkedTags = qsa('input[name="registerTag"]:checked').map(item => item.value);

    const profile = {
      name,
      email,
      city,
      bio: qs('#registerBio').value.trim() || 'A friendly roommate looking for a good shared home.',
      avatar: avatarUrl,
      tags: checkedTags.length ? checkedTags : ['Student', 'Roommate'],
      preferences: {
        budget: Number(qs('#registerBudget')?.value || 15000),
        food: qs('#registerFoodPref')?.value || 'any',
        smoking: qs('#registerSmoking')?.value || 'no',
        drinking: qs('#registerDrinking')?.value || 'no',
        pets: qs('#registerPets')?.value || 'no',
        sleep: qs('#registerSleep')?.value || 'flexible',
        cleanliness: Number(qs('#registerCleanliness')?.value || 3),
        occupation: qs('#registerOccupation')?.value.trim() || '',
        moveIn: qs('#registerMoveIn')?.value || '',
        environment: qs('#registerEnvironment')?.value || 'mixed',
        languages: tagsFromText(qs('#registerLanguages')?.value || '')
      },
      lookingFor: [
        `Gender: ${qs('#registerLookingGender')?.value || 'any'}`,
        `Status: ${qs('#registerLookingStatus')?.value || 'either'}`,
        `Smoking: ${qs('#registerLookingSmoking')?.value || 'any'}`,
        `Environment: ${qs('#registerLookingEnvironment')?.value || 'any'}`
      ].join(', '),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('profiles').doc(user.uid).set(profile);
    window.location.href = 'profile.html';
  } catch (err) {
    showError(error, err.message || 'Registration failed. Please try again.');
    resetButton(button);
  }
}

async function handleLogout(event) {
  event?.preventDefault();
  if (hasFirebase()) await auth.signOut();
  window.location.href = 'login.html';
}

function initAuthForms() {
  qs('#loginForm')?.addEventListener('submit', handleLogin);
  qs('#registerForm')?.addEventListener('submit', handleRegister);

  const budget = qs('#registerBudget');
  const display = qs('#budgetValue');
  if (budget && display) {
    const update = () => { display.textContent = money(budget.value); };
    budget.addEventListener('input', update);
    update();
  }
}

function initPostRoomPage() {
  const form = qs('#roomPostForm');
  if (!form) return;

  if (!currentUser) {
    qs('.room-form-card')?.insertAdjacentHTML('beforeend', '<p class="muted">Please log in to post a public room listing.</p>');
    return;
  }

  const imageInput = qs('#roomImage');
  const preview = qs('#roomImagePreview');

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) {
      preview.style.display = 'none';
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!requireLogin()) return;

    const error = qs('#roomError');
    const button = qs('#postRoomBtn');
    hideError(error);
    setButtonLoading(button, 'Uploading...');

    try {
      const imageFile = imageInput.files[0];
      const imageUrl = imageFile ? await uploadImage(imageFile, `rooms/${currentUser.uid}`) : DEMO_IMAGE;

      // Firestore room document. This public collection is what makes User A's
      // listing visible to User B after deployment.
      const room = {
        title: qs('#roomTitle').value.trim(),
        location: qs('#roomLocation').value.trim(),
        type: qs('#roomType').value,
        price: Number(qs('#roomPrice').value || 0),
        description: qs('#roomDescription').value.trim(),
        image: imageUrl,
        ownerId: currentUser.uid,
        ownerName: currentProfile?.name || currentUser.email,
        roommatePreference: qs('#roommatePreference').value.trim() || 'Any responsible roommate',
        moveInDate: qs('#moveInDate').value || 'Flexible',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!room.title || !room.location || !room.price || !room.description) {
        throw new Error('Please complete all room fields.');
      }

      await db.collection('rooms').add(room);
      showSuccess(error, 'Room posted successfully. Redirecting...');
      setTimeout(() => { window.location.href = 'rooms.html'; }, 700);
    } catch (err) {
      showError(error, err.message || 'Could not post room.');
      resetButton(button);
    }
  });
}

function initGetStarted() {
  qs('#getStartedBtn')?.addEventListener('click', event => {
    event.preventDefault();
    window.location.href = currentUser ? 'matches.html' : 'login.html';
  });
}

function initNavToggles() {
  const navToggle = qs('#navToggle');
  const nav = qs('.nav');
  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

function initChatPage() {
  const notice = qs('#chatNotice');
  const input = qs('#chatInput');
  const button = qs('#chatForm button');
  if (!notice || !input || !button) return;

  if (!currentUser) {
    notice.textContent = 'Log in to join chat and message roommates.';
    input.disabled = true;
    button.disabled = true;
  } else {
    notice.textContent = 'Chat is a demo page. Public profiles and listings now use Firebase.';
  }
}

function bootWithAuth() {
  if (!hasFirebase()) {
    updateNavbarLoginState();
    loadSharedData();
    initPostRoomPage();
    initChatPage();
    return;
  }

  auth.onAuthStateChanged(async user => {
    currentUser = user;
    currentProfile = await loadCurrentProfile(user);
    updateNavbarLoginState();
    await loadSharedData();
    initPostRoomPage();
    initChatPage();

    if (window.location.pathname.endsWith('login.html') && currentUser) {
      window.location.href = 'index.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  initThemeToggle();
  initAuthForms();
  initGetStarted();
  initNavToggles();
  bootWithAuth();
});
