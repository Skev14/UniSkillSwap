# UniSkillSwap Project Overview & Features

## 1. Project Summary
UniSkillSwap is a React Native app for university students to swap skills, find study partners, and join study groups. It uses Firebase for authentication and data storage, and Expo Router for navigation.

---

## 2. Codebase Structure
- **app/(auth)/**: Authentication and onboarding screens (login, signup, profile setup)
- **app/(tabs)/**: Main app tabs (home, match, connections, messages)
- **app/chat.tsx**: 1-on-1 chat screen
- **app/utils/**: Utility functions (e.g., dummy data initialization)
- **contexts/AuthContext.tsx**: Authentication context provider
- **services/**: Firebase config, user and auth services
- **types/**: TypeScript types (e.g., user profile)
- **components/**: Reusable UI components
- **firestore.indexes.json**: Firestore composite index definitions
- **firestore.rules**: Firestore security rules
- **PROJECT_CONTEXT.md**: Feature checklist and progress
- **README.md**: Setup and getting started

---

## 3. Implemented Features & Pages

### 3.1 Authentication & Onboarding
- **Login/Signup**: Email authentication (Google/University planned)
- **Profile Setup**: Users set skills offered, skills needed, availability, and bio
- **Onboarding**: New users are guided to complete their profile

### 3.2 Home Page
- **Welcome message** and profile summary
- **Profile photo upload** (with Firebase Storage)
- **Quick access** to edit profile and find study partners

### 3.3 Matching (Swipe) Page
- **Tinder-style swipe UI** to find study partners
- **Profile cards** show skills, interests, and availability
- **Matching algorithm** recommends users based on skills/interests

### 3.4 Connections Page
- **List of users you swiped right** (connections)
- **Option to message connections**

### 3.5 Messaging
- **Messages Tab**: Lists all conversations for the user, showing last message per user
- **Chat Screen**: 1-on-1 chat, real-time message fetch, send messages
- **Firestore composite indexes** for efficient queries
- **Navigation integration**: Messages tab in bottom nav

### 3.6 Study Groups (Planned)
- **Browse, join, or create study groups** (UI and backend planned)
- **Group chat** (planned)

### 3.7 Moderator Tools (Planned)
- **Dashboard for moderators/admins** to manage reports, users, and groups

---

## 4. Firebase Setup & Data Model

### 4.1 Authentication
- **Email/password** auth implemented
- **Auth context** manages user state across app

### 4.2 Firestore Data Model
- **users**: User profiles (skills, bio, photo, etc.)
- **messages**: DM messages with senderId, receiverId, text, timestamp, participants (array)
- **Composite indexes** for all queries using array-contains and orderBy

### 4.3 Firestore Indexes
- `participants` (array-contains) + `timestamp` (asc): for chat
- `participants` (array-contains) + `timestamp` (desc): for messages tab
- Defined in `firestore.indexes.json` and deployed with `firebase deploy --only firestore:indexes`

### 4.4 Firestore Rules
- **Development**: Open rules for rapid iteration
- **Production**: Should restrict access to only allow participants to read/write their messages

### 4.5 Dummy Data
- **app/utils/initializeApp.ts**: Script to initialize dummy users for testing

---

## 5. Navigation & UI/UX
- **Expo Router** for file-based navigation
- **Tab navigation** for main app sections
- **Conditional navigation** based on auth state
- **Modern, mobile-friendly UI** with React Native components
- **Keyboard handling** for chat and input screens

---

## 6. Troubleshooting & Best Practices
- **Missing index errors**: Add required composite indexes and deploy
- **Auth persistence**: For persistent login, use AsyncStorage with Firebase Auth
- **Data consistency**: Always store participants as a sorted array
- **Error handling**: All screens handle loading and error states
- **Update dependencies**: Use `expo doctor --fix-dependencies` for best compatibility

---

## 7. Next Steps & Future Enhancements
- **Finish study groups and group chat**
- **Implement moderator dashboard**
- **Add Google/University login**
- **Improve Firestore security rules**
- **Add real-time listeners for chat**
- **Enhance UI with avatars, names, and group features**
- **Onboarding tutorial and usability testing**

---

**This document provides a complete, up-to-date technical and feature overview of the UniSkillSwap project.** 