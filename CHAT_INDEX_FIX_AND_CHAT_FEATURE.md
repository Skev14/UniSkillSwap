# UniSkillSwap Chat Feature: Firestore Index Fix and Implementation Details

## Background
The chat feature in UniSkillSwap allows users to send and receive messages in real time. Messages are stored in a Firestore collection called `messages`. Each message document includes a `participants` field (an array of user IDs) and a `timestamp` field, among others.

npx ---

## 1. Authentication and User Context
- The app uses a custom `AuthContext` to provide the current authenticated user throughout the app.
- The chat screen retrieves the current user and the target chat user (by `userId`) using React context and navigation parameters.
- This ensures only authenticated users can send and receive messages.

---

## 2. Message Data Model
- Each message document in Firestore contains:
  - `senderId`: UID of the sender
  - `receiverId`: UID of the receiver
  - `text`: The message content
  - `timestamp`: When the message was sent (using Firestore's `serverTimestamp()`)
  - `participants`: An array of both user UIDs (e.g., `[user1, user2]`)

---

## 3. Fetching Messages
- The chat screen fetches messages with this query:
  ```ts
  const q = query(
    messagesRef,
    where('participants', 'array-contains', user.uid),
    orderBy('timestamp', 'asc')
  );
  ```
- After fetching, it filters messages in code to ensure both users are in the `participants` array (for 1-on-1 chats).
- Messages are sorted by timestamp for chronological display.
- The UI uses a `FlatList` to render messages, auto-scrolling to the latest message.

---

## 4. Sending Messages
- When a user sends a message:
  - A new document is added to the `messages` collection with the correct fields.
  - The `participants` array is always sorted to ensure consistency.
  - After sending, the input is cleared and messages are re-fetched.

---

## 5. Firestore Index Issue and Solution
- **Problem:** Firestore requires a composite index for queries combining `array-contains` and `orderBy`.
- **Solution:**
  - Defined the required index in `firestore.indexes.json`:
    ```json
    {
      "indexes": [
        {
          "collectionGroup": "messages",
          "queryScope": "COLLECTION",
          "fields": [
            { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
            { "fieldPath": "timestamp", "order": "ASCENDING" }
          ]
        }
      ],
      "fieldOverrides": []
    }
    ```
  - Deployed the index using:
    ```sh
    firebase deploy --only firestore:indexes
    ```
  - Waited for the index to be enabled in the Firestore Console.

---

## 6. User Interface Structure
- The chat screen uses React Native components:
  - `KeyboardAvoidingView` for proper keyboard handling.
  - `FlatList` for efficient message rendering and scrolling.
  - `TextInput` and `TouchableOpacity` for message input and sending.
  - Conditional rendering for loading state and invalid sessions.
- Styles are defined using `StyleSheet` for a clean, modern look.

---

## 7. Error Handling and Troubleshooting
- Errors in fetching or sending messages are logged to the console.
- If a Firestore index is missing, the error message provides a direct link to create it.
- The markdown and codebase now document the index requirements for future developers.

---

## 8. Results and Best Practices
- The chat feature is now robust, scalable, and efficient for 1-on-1 messaging.
- Firestore indexes are tracked in source control and can be deployed as part of CI/CD.
- The code is modular, with clear separation of concerns (auth, data, UI).

---

## References
- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

**This document describes the technical steps, reasoning, and implementation details behind the Firestore index fix and the chat feature for the UniSkillSwap app.** 