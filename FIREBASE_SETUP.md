# RoomieSync Firebase Setup

RoomieSync is still a static HTML/CSS/JavaScript project. Firebase is the shared backend that makes profiles, room listings, and uploaded images visible to every deployed user.

## 1. Create Firebase Services

1. Open Firebase Console and create a project.
2. Add a Web App.
3. Enable Authentication, then turn on Email/Password.
4. Create a Firestore Database.
5. Enable Firebase Storage.
6. Copy the Firebase web config into firebase-config.js.

## 2. Firestore Collections

profiles/{userId} stores public roommate profiles:

js
{
  name,
  email,
  city,
  bio,
  avatar,
  tags,
  preferences,
  lookingFor
}


rooms/{autoId} stores public room listings:

js
{
  title,
  location,
  type,
  price,
  description,
  image,
  ownerId,
  ownerName,
  roommatePreference,
  moveInDate
}


## 3. Simple Rules for a Student Demo

Use these only for a beginner project/demo. For a real product, rules should be stricter.

Firestore rules:

txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    match /rooms/{roomId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
  }
}


Storage rules:

txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /rooms/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}



