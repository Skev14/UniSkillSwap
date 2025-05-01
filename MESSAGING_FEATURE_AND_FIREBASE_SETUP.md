wa# UniSkillSwap Messaging Feature & Firebase Setup: Technical Documentation

## Overview
This document describes the implementation of the messaging system in UniSkillSwap, including the chat feature, messages tab, navigation integration, and all relevant Firebase setup (indexes, rules, and data model). It is intended as a comprehensive technical reference for future developers.

---

## 1. Codebase Structure
- **app/chat.tsx**: 1-on-1 chat screen between users.
- **app/(tabs)/messages.tsx**: Lists all conversations for the current user.
- **app/(tabs)/_layout.tsx**: Tab navigation, including the Messages tab.
- **contexts/AuthContext.tsx**: Provides authentication context.
- **services/firebaseConfig.ts**: Firebase initialization and exports.
- **firestore.indexes.json**: Composite index definitions for Firestore.
- **firestore.rules**: Firestore security rules.

---

## 2. Messaging Features

### 2.1 Chat Screen (`app/chat.tsx`)
- **Purpose**: Enables real-time 1-on-1 messaging between users.
- **Key Features**:
  - Fetches messages between the current user and another user using Firestore queries.
  - Displays messages in chronological order using a `FlatList`.
  - Allows sending new messages, which are added to Firestore with sender/receiver IDs, text, timestamp, and a sorted `participants` array.
  - Uses `KeyboardAvoidingView` for mobile-friendly input.
  - Handles loading and error states.

### 2.2 Messages Tab (`app/(tabs)/messages.tsx`)
- **Purpose**: Shows a list of all conversations for the current user.
- **Key Features**:
  - Queries Firestore for all messages where the current user is a participant, ordered by most recent.
  - Aggregates messages by conversation (other user ID), showing the last message and timestamp.
  - Tapping a conversation navigates to the chat screen with that user.
  - Handles loading, empty state, and errors.

### 2.3 Navigation Integration (`app/(tabs)/_layout.tsx`)
- **Purpose**: Integrates the Messages tab into the main navigation bar.
- **Key Features**:
  - Adds a "Messages" tab with a chat icon.
  - Ensures only authenticated users can access tabs.
  - Handles loading and redirect logic for authentication.

---

## 3. Firebase Setup

### 3.1 Firestore Data Model
- **Collection**: `messages`
- **Fields**:
  - `senderId`: UID of the sender
  - `receiverId`: UID of the receiver
  - `text`: Message content
  - `timestamp`: Firestore server timestamp
  - `participants`: Array of both user UIDs (sorted)

### 3.2 Firestore Indexes (`firestore.indexes.json`)
- **Required for efficient queries:**
  - `participants` (array-contains) + `timestamp` (ascending): for chat screen
  - `participants` (array-contains) + `timestamp` (descending): for messages tab
- **Deployment**:
  - Indexes are defined in `firestore.indexes.json` and deployed using:
    ```sh
    firebase deploy --only firestore:indexes
    ```
  - Wait for indexes to be enabled in the Firestore Console before using the features.

### 3.3 Firestore Security Rules (`firestore.rules`)
- **Current rules** (for development):
  - Allow read/write access to messages for all authenticated users.
  - For production, restrict access so only participants can read/write their messages.

---

## 4. Implementation Steps & Fixes
- Refactored the `participants` field to be an array (not a string) for compatibility with Firestore queries.
- Updated all queries to use `array-contains` for the current user's UID.
- Added composite indexes for all queries combining `array-contains` and `orderBy`.
- Created a new Messages tab and screen to list all conversations.
- Fixed linter errors and ensured robust error handling.
- Deployed indexes and verified their status in the Firestore Console.

---

## 5. Troubleshooting & Best Practices
- **Missing Index Error**: If you see a Firestore error about a missing index, check the query and add the required composite index to `firestore.indexes.json`, then deploy.
- **Authentication**: Ensure users are authenticated before accessing chat features.
- **Data Consistency**: Always store `participants` as a sorted array to avoid duplicate conversations.
- **Performance**: Use indexes for all queries with filters and ordering.
- **UI/UX**: Handle loading, empty, and error states gracefully.

---

## 6. Future Enhancements
- Display user names and avatars in the Messages tab (requires joining with the users collection).
- Add real-time updates with Firestore listeners.
- Implement group chats (requires a different data model).
- Harden Firestore security rules for production.

---

**This document provides a complete technical overview of the UniSkillSwap messaging system and its Firebase integration.** 