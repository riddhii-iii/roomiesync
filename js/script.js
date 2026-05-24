const STORAGE_KEYS = {
  users: 'roomieSyncUsers',
  profiles: 'roomieSyncProfiles',
  rooms: 'roomieSyncRooms',
  currentUser: 'roomieSyncCurrentUser',
  chat: 'roomieSyncChat'
};

let appData = null;

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }
function readPersisted(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (err) { return []; }
}
function writePersisted(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCurrentUserId() {
  const id = localStorage.getItem(STORAGE_KEYS.currentUser);
  return id ? parseInt(id, 10) : null;
}

function getCurrentUser() {
  const userId = getCurrentUserId();
  if (!userId || !appData) return null;
  const user = (appData.users || []).find(u => u.id === userId);
  if (!user) return null;
  const profile = (appData.profiles || []).find(p => p.id === user.profileId) || {
    id: user.profileId,
    name: user.email.split('@')[0],
    city: 'Campus community',
    bio: 'A roommate who is excited to share a student-friendly space.',
    tags: ['Student'],
    avatar: 'images/avatar-1.svg'
  };
  return { ...user, profile };
}

function getProfileById(id) {
  return (appData.profiles || []).find(p => String(p.id) === String(id));
}

function getUserByEmail(email) {
  return (appData.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
}

function getNextId(items) {
  if (!items || items.length === 0) return 1;
  return items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Failed to load data.json');
    const fileData = await res.json();

    const persistedProfiles = readPersisted(STORAGE_KEYS.profiles);
    const persistedRooms = readPersisted(STORAGE_KEYS.rooms);
    const persistedUsers = readPersisted(STORAGE_KEYS.users);

    appData = {
      profiles: [...(fileData.profiles || []), ...persistedProfiles],
      rooms: [...(fileData.rooms || []), ...persistedRooms],
      users: [...(fileData.users || []), ...persistedUsers]
    };

    renderHeroPreview(appData);
    renderMatches(appData);
    renderRooms(appData);
    renderProfileIfNeeded(appData);
    initPostRoomPage(appData);
    updateNavbarLoginState();
    initChatPage();
  } catch (err) {
    console.error('Data loading error:', err);
    appData = { profiles: [], rooms: [], users: [] };
    updateNavbarLoginState();
    initChatPage();
  }
}

function loadAppData() {
  return appData || loadData();
}

function getLoggedInState() {
  return localStorage.getItem(STORAGE_KEYS.currentUser) !== null;
}

function requireLogin() {
  if (!getLoggedInState()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function loginUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, String(user.id));
  localStorage.setItem('roomieSyncEmail', user.email);
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem('roomieSyncEmail');
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('userEmail');
}

function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  element.style.display = 'block';
}

function hideError(element) {
  if (!element) return;
  element.textContent = '';
  element.classList.remove('show');
  element.style.display = 'none';
}

function setButtonLoading(button, message) {
  if (!button) return;
  button.disabled = true;
  button.innerText = message;
}

function resetButton(button, text) {
  if (!button) return;
  button.disabled = false;
  button.innerText = text;
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorMsg = document.getElementById('errorMessage');
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    showError(errorMsg, 'Please enter both email and password');
    return;
  }

  if (!email.includes('@')) {
    showError(errorMsg, 'Please enter a valid email');
    return;
  }

  hideError(errorMsg);
  setButtonLoading(loginBtn, 'Signing in...');

  try {
    const data = await loadAppData();
    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      showError(errorMsg, 'Email or password is incorrect');
      resetButton(loginBtn, 'Login');
      return;
    }

    loginUser(user);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 300);
  } catch (err) {
    showError(errorMsg, 'An error occurred. Please try again.');
    resetButton(loginBtn, 'Login');
    console.error('Login error:', err);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const city = document.getElementById('registerCity').value.trim();
  const bio = document.getElementById('registerBio').value.trim();
  const errorMsg = document.getElementById('registerError');
  const registerBtn = document.getElementById('registerBtn');

  if (!name || !email || !password || !city) {
    showError(errorMsg, 'Please fill all required fields');
    return;
  }

  if (!email.includes('@')) {
    showError(errorMsg, 'Please enter a valid email');
    return;
  }

  if (name.length < 2) {
    showError(errorMsg, 'Name must be at least 2 characters');
    return;
  }

  if (password.length < 6) {
    showError(errorMsg, 'Password must be at least 6 characters');
    return;
  }

  hideError(errorMsg);
  setButtonLoading(registerBtn, 'Creating account...');

  try {
    const data = await loadAppData();
    if (getUserByEmail(email)) {
      showError(errorMsg, 'An account already exists with that email');
      resetButton(registerBtn, 'Register');
      return;
    }

    const storedUsers = readPersisted(STORAGE_KEYS.users);
    const storedProfiles = readPersisted(STORAGE_KEYS.profiles);
    const newProfileId = getNextId([...appData.profiles, ...storedProfiles]);
    const newUserId = getNextId([...appData.users, ...storedUsers]);
    const profile = {
      id: newProfileId,
      name,
      city,
      bio: bio || 'A friendly roommate looking for a great living match.',
      tags: ['Student', 'Roommate'],
      avatar: 'images/avatar-1.svg'
    };
    const user = {
      id: newUserId,
      profileId: newProfileId,
      email,
      password
    };

    writePersisted(STORAGE_KEYS.profiles, [...storedProfiles, profile]);
    writePersisted(STORAGE_KEYS.users, [...storedUsers, user]);
    loginUser(user);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  } catch (err) {
    showError(errorMsg, 'An error occurred. Please try again.');
    resetButton(registerBtn, 'Register');
    console.error('Registration error:', err);
  }
}

function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

function initGetStarted() {
  const getStartedBtn = document.getElementById('getStartedBtn');
  if (!getStartedBtn) return;
  getStartedBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (getLoggedInState()) {
      window.location.href = 'matches.html';
    } else {
      window.location.href = 'login.html';
    }
  });
}

function initNavToggles() {
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });
    // Close menu when a link is clicked
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
      });
    });
  }
}

function renderHeroPreview(data) {
  const preview = qs('.hero-right .roommate-card.preview');
  if (!preview) return;
  const currentUser = getCurrentUser();
  const p = currentUser ? currentUser.profile : (data.profiles || [])[0];
  if (!p) return;
  preview.innerHTML = `
    <img src="${p.avatar}" alt="Profile" class="avatar">
    <div class="card-body">
      <div class="card-header">
        <h3>${p.name}</h3>
        <div class="compat">${p.compatibility || 90}%</div>
      </div>
      <p class="muted">${p.city}</p>
      <p class="bio">${p.bio}</p>
      <div class="tags">${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="card-actions"><button class="btn btn-outline" onclick="demoAction()">Message</button></div>
    </div>
  `;
}

function renderMatches(data) {
  const grid = qs('.matches-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const profiles = data.profiles || [];
  profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'card roommate-card';
    card.innerHTML = `
      <img src="${profile.avatar}" alt="Profile" class="avatar">
      <div class="card-body">
        <div class="card-header">
          <h3>${profile.name}</h3>
          <div class="compat">${profile.compatibility || 80}%</div>
        </div>
        <p class="muted">${profile.city}</p>
        <p class="bio">${profile.bio}</p>
        <div class="tags">${(profile.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="card-actions">
          <button class="btn" onclick="demoAction()">Message</button>
          <a class="btn btn-ghost" href="profile.html?id=${profile.id}">View profile</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderRooms(data) {
  const grid = qs('.rooms-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const currentUser = getCurrentUser();
  const rooms = data.rooms || [];
  rooms.forEach(room => {
    const isOwn = currentUser && room.ownerId === currentUser.id;
    const ownerText = room.ownerName ? (isOwn ? 'Your listing' : `Listed by ${room.ownerName}`) : 'Student listing';
    const description = room.description ? `<p class="muted">${room.description}</p>` : '';
    const card = document.createElement('div');
    card.className = 'card room-card';
    card.innerHTML = `
      <img src="${room.image}" alt="Room image" class="room-img">
      <div class="card-body">
        <h3>${room.title}</h3>
        <p class="muted">${room.location} • ${room.type}</p>
        ${description}
        <p class="price">$${room.price} / month</p>
        <p class="muted small">${ownerText}</p>
        <div class="card-actions">
          <button class="btn" onclick="demoAction()">Contact</button>
          <a class="btn btn-ghost" href="matches.html">See roommates</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderProfileIfNeeded(data) {
  const profileCard = qs('.profile-page .profile-card');
  if (!profileCard) return;

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  const currentUser = getCurrentUser();

  // If no ID param and no logged in user, redirect to login
  if (!idParam && !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // If ID param but no logged in user, show public profile
  const profile = idParam ? getProfileById(idParam) : (currentUser ? currentUser.profile : null);
  if (!profile) {
    profileCard.innerHTML = '<div class="placeholder-loading">Profile not found.</div>';
    return;
  }

  const isOwnProfile = currentUser && currentUser.profileId === profile.id;
  if (isOwnProfile) {
    renderOwnProfile(profileCard, profile, currentUser);
  } else {
    renderPublicProfile(profileCard, profile);
  }
}

function renderPublicProfile(profileCard, profile) {
  profileCard.innerHTML = `
    <img src="${profile.avatar}" alt="Profile" class="profile-photo">
    <div class="profile-body">
      <h2>${profile.name}</h2>
      <p class="muted">${profile.city}</p>
      <p class="bio">${profile.bio}</p>
      <h4>Preferences</h4>
      <div class="tags">${(profile.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <h4>Hobbies</h4>
      <p class="muted">Cooking, reading, board games</p>
    </div>
  `;
}

function renderOwnProfile(profileCard, profile, user) {
  const rooms = (appData.rooms || []).filter(room => room.ownerId === user.id);
  profileCard.innerHTML = `
    <div class="profile-edit">
      <div class="profile-preview">
        <img src="${profile.avatar}" alt="Profile" class="profile-photo" id="profilePhotoPreview">
        <div class="form-group">
          <label>Avatar</label>
          <input type="file" id="avatarInput" accept="image/*">
        </div>
      </div>
      <div class="profile-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="profileName" value="${profile.name}">
        </div>
        <div class="form-group">
          <label>City</label>
          <input type="text" id="profileCity" value="${profile.city}">
        </div>
        <div class="form-group">
          <label>Bio</label>
          <textarea id="profileBio" rows="4">${profile.bio}</textarea>
        </div>
        <div class="form-group">
          <label>Tags (comma separated)</label>
          <input type="text" id="profileTags" value="${(profile.tags || []).join(', ')}">
        </div>
        <button class="btn btn-primary" id="saveProfileBtn">Save profile</button>
        <div id="profileSaveMessage" class="form-error" style="display:none"></div>
      </div>
    </div>
    <div class="profile-room-list">
      <h3>Your listings</h3>
      <div class="rooms-grid">${rooms.length ? rooms.map(room => `
        <div class="card room-card">
          <img src="${room.image}" alt="Room image" class="room-img">
          <div class="card-body">
            <h4>${room.title}</h4>
            <p class="muted">${room.location}</p>
            <p class="price">$${room.price} / month</p>
          </div>
        </div>
      `).join('') : '<p class="muted">You have not posted any rooms yet.</p>'}</div>
    </div>
  `;

  const avatarInput = document.getElementById('avatarInput');
  const photoPreview = document.getElementById('profilePhotoPreview');
  const saveBtn = document.getElementById('saveProfileBtn');
  const saveMessage = document.getElementById('profileSaveMessage');

  if (avatarInput) {
    avatarInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const dataUrl = await fileToDataURL(file);
      photoPreview.src = dataUrl;
      photoPreview.dataset.newAvatar = dataUrl;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      try {
        const nameInput = document.getElementById('profileName').value.trim();
        const cityInput = document.getElementById('profileCity').value.trim();
        const bioInput = document.getElementById('profileBio').value.trim();
        const tagsInput = document.getElementById('profileTags').value.trim();
        const newAvatar = photoPreview.dataset.newAvatar || profile.avatar;

        if (!nameInput || !cityInput || !bioInput) {
          showError(saveMessage, 'Please fill all profile fields.');
          return;
        }

        if (nameInput.length < 2) {
          showError(saveMessage, 'Name must be at least 2 characters.');
          return;
        }

        const updatedProfile = {
          ...profile,
          name: nameInput,
          city: cityInput,
          bio: bioInput,
          tags: tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          avatar: newAvatar
        };

        const storedProfiles = readPersisted(STORAGE_KEYS.profiles);
        const existingIndex = storedProfiles.findIndex(item => item.id === profile.id);
        if (existingIndex >= 0) {
          storedProfiles[existingIndex] = updatedProfile;
        } else {
          storedProfiles.push(updatedProfile);
        }
        writePersisted(STORAGE_KEYS.profiles, storedProfiles);
        appData.profiles = appData.profiles.filter(item => item.id !== profile.id).concat(updatedProfile);
        
        saveMessage.textContent = 'Profile saved successfully!';
        saveMessage.style.color = '#059669';
        saveMessage.style.backgroundColor = '#ECFDF5';
        saveMessage.classList.add('show');
        saveMessage.style.display = 'block';
      } catch (err) {
        showError(saveMessage, 'An error occurred while saving. Please try again.');
        console.error('Profile save error:', err);
      }
    });
  }
}

function initPostRoomPage(data) {
  const roomForm = document.getElementById('roomPostForm');
  if (!roomForm) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    // Redirect to login if not logged in
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 100);
    return;
  }

  const imageInput = document.getElementById('roomImage');
  const preview = document.getElementById('roomImagePreview');
  if (imageInput) {
    imageInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) {
        preview.style.display = 'none';
        return;
      }
      const dataUrl = await fileToDataURL(file);
      preview.src = dataUrl;
      preview.style.display = 'block';
    });
  }

  roomForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('roomTitle').value.trim();
    const location = document.getElementById('roomLocation').value.trim();
    const type = document.getElementById('roomType').value;
    const price = Number(document.getElementById('roomPrice').value);
    const description = document.getElementById('roomDescription').value.trim();
    const imageFile = document.getElementById('roomImage').files[0];
    const errorMsg = document.getElementById('roomError');
    const submitBtn = document.getElementById('postRoomBtn');

    if (!title || !location || !type || !price) {
      showError(errorMsg, 'Please complete all required fields.');
      return;
    }

    if (title.length < 5) {
      showError(errorMsg, 'Title must be at least 5 characters.');
      return;
    }

    if (price < 100 || price > 5000) {
      showError(errorMsg, 'Price must be between $100 and $5000.');
      return;
    }

    if (description.length < 10) {
      showError(errorMsg, 'Description must be at least 10 characters.');
      return;
    }

    hideError(errorMsg);
    setButtonLoading(submitBtn, 'Posting room...');

    try {
      const imageData = imageFile ? await fileToDataURL(imageFile) : 'images/room-1.svg';

      const storedRooms = readPersisted(STORAGE_KEYS.rooms);
      const newRoom = {
        id: getNextId([...appData.rooms, ...storedRooms]),
        title,
        location,
        type,
        price,
        description,
        image: imageData,
        ownerId: currentUser.id,
        ownerName: currentUser.profile.name
      };

      writePersisted(STORAGE_KEYS.rooms, [...storedRooms, newRoom]);
      showError(errorMsg, 'Room posted successfully! Redirecting...');
      errorMsg.style.color = '#059669';
      errorMsg.style.backgroundColor = '#ECFDF5';
      setTimeout(() => {
        window.location.href = 'rooms.html';
      }, 800);
    } catch (err) {
      showError(errorMsg, 'An error occurred. Please try again.');
      resetButton(submitBtn, 'Post room');
      console.error('Room posting error:', err);
    }
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateNavbarLoginState() {
  const isLoggedIn = getLoggedInState();
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const existingLoginLink = nav.querySelector('a[href="login.html"]');
  const existingLogoutBtn = nav.querySelector('.logout-btn');

  function createNavLink(href, text, classes = '') {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (classes) link.className = classes;
    return link;
  }

  if (isLoggedIn) {
    if (existingLoginLink) {
      const logout = createNavLink('#', 'Logout', 'btn btn-outline logout-btn');
      logout.addEventListener('click', (event) => {
        event.preventDefault();
        logoutUser();
        window.location.href = 'login.html';
      });
      existingLoginLink.replaceWith(logout);
    }

    if (!nav.querySelector('a[href="profile.html"]')) {
      const profileLink = createNavLink('profile.html', 'Profile');
      const roomLink = createNavLink('post-room.html', 'Post Room');
      const loginOrLogout = nav.querySelector('.logout-btn');
      if (loginOrLogout) {
        nav.insertBefore(roomLink, loginOrLogout);
        nav.insertBefore(profileLink, roomLink);
      } else {
        nav.appendChild(profileLink);
        nav.appendChild(roomLink);
      }
    }
  } else {
    if (existingLogoutBtn) {
      const loginLink = createNavLink('login.html', 'Login', 'btn btn-outline');
      existingLogoutBtn.replaceWith(loginLink);
    }
    const profileLink = nav.querySelector('a[href="profile.html"]');
    const roomLink = nav.querySelector('a[href="post-room.html"]');
    if (profileLink) profileLink.remove();
    if (roomLink) roomLink.remove();
  }
}

function initChatPage() {
  const chatForm = document.getElementById('chatForm');
  const chatList = document.getElementById('chatList');
  const chatInput = document.getElementById('chatInput');
  const chatNotice = document.getElementById('chatNotice');
  if (!chatForm || !chatList || !chatInput || !chatNotice) return;

  const isLoggedIn = getLoggedInState();
  if (!isLoggedIn) {
    chatNotice.textContent = 'Log in to join chat and message roommates.';
    chatInput.disabled = true;
    chatForm.querySelector('button').disabled = true;
    return;
  }

  chatNotice.textContent = 'Chat with roommates in a shared community feel.';
  const chatHistory = loadChatHistory();
  renderChatMessages(chatHistory, chatList);

  chatForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    const userEmail = localStorage.getItem('roomieSyncEmail') || 'You';
    const newMessage = {
      sender: userEmail,
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    chatHistory.push(newMessage);
    writePersisted(STORAGE_KEYS.chat, chatHistory);
    renderChatMessages(chatHistory, chatList);
    chatInput.value = '';
    chatInput.focus();
  });
}

function loadChatHistory() {
  const stored = localStorage.getItem(STORAGE_KEYS.chat);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { return []; }
  }
  const defaultMessages = [
    { sender: 'Aisha', text: 'Anyone looking for a quiet roommate near campus?', time: '09:10 AM' },
    { sender: 'Marcus', text: 'I prefer studying late, so I need someone okay with quieter mornings.', time: '09:14 AM' }
  ];
  writePersisted(STORAGE_KEYS.chat, defaultMessages);
  return defaultMessages;
}

function renderChatMessages(messages, container) {
  container.innerHTML = messages.map(msg => `
      <div class="chat-message">
        <div class="chat-message-head">
          <span class="chat-sender">${msg.sender}</span>
          <span class="chat-time">${msg.time}</span>
        </div>
        <p class="chat-text">${msg.text}</p>
      </div>
    `).join('');
}

function initPage() {
  initAuthForms();
  initGetStarted();
  initNavToggles();
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  if (window.location.pathname.endsWith('login.html') && getLoggedInState()) {
    window.location.href = 'index.html';
    return;
  }
  loadData();
});


