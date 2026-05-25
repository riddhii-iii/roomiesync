/* Firebase setup for RoomieSync
   ----------------------------
   1. Create a Firebase project.
   2. Enable Authentication > Email/Password.
   3. Enable Firestore Database.
   4. Enable Storage.
   5. Replace the values below with your web app config from:
      Firebase Console > Project Settings > Your apps > Web app.

   Beginner-friendly Firestore structure:
   profiles/{uid}
     name, email, city, bio, avatar, tags, preferences, lookingFor

   rooms/{autoId}
     title, location, type, price, description, image,
     ownerId, ownerName, roommatePreference, moveInDate

   Uploaded images go to Firebase Storage:
   profiles/{uid}/image-name
   rooms/{uid}/image-name
*/

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const firebaseIsConfigured = !firebaseConfig.apiKey.includes('PASTE_');

if (firebaseIsConfigured && window.firebase) {
  firebase.initializeApp(firebaseConfig);

  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = firebase.storage();

  window.db.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Offline persistence works in only one open tab at a time.');
    }
    if (err.code === 'unimplemented') {
      console.log('This browser does not support offline persistence.');
    }
  });
} else {
  console.warn('Firebase is not configured yet. Add your project config in firebase-config.js.');
}
