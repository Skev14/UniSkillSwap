# UniSkillSwap

A React Native application for skill swapping and learning between university students.

## Project Status

### Firebase Integration
- ✅ Firebase Authentication: Working and properly configured
- ✅ Firebase Config: Set up in `services/firebaseConfig.ts`
- ✅ User Authentication Flow: Implemented in `_layout.tsx` with proper navigation guards

### Core Features
- ✅ Authentication screens
- ✅ Navigation setup with Expo Router
- ✅ Theme support (Dark/Light mode)
- 🚧 Profile setup page
- 🚧 Firestore user profile schema

### Technical Stack
- React Native with Expo
- Firebase (Authentication, Firestore)
- Expo Router for navigation
- React Navigation theming

### Important Context
- The app is using Firebase SDK directly (not Expo Firebase)
- Authentication is working properly
- Navigation flow:
  - Unauthenticated users -> `(auth)` group
  - Authenticated users -> `(tabs)` group
  - Profile setup -> Special handling in navigation guards

### Development Environment
- Using Expo development environment
- Firebase emulators status: Not configured yet
- Current working directory: `C:\Users\User\UniSkillSwap`

### Recent Changes
- Implemented authentication flow
- Set up basic navigation structure
- Added theme support
- Created `.firebaserc` for CLI operations (optional since core Firebase is working)

### Next Steps
- Complete profile setup page
- Implement Firestore user profile schema
- Set up remaining Firebase services as needed

## Notes
- Firebase project ID: "uniskillswap"
- Core Firebase services (Auth) are working without requiring `.firebaserc`
- `.firebaserc` is only needed for CLI operations (hosting, emulators)

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
