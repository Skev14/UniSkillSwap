import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 12 }]}> 
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tabBar}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          let label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
          // If label is a function, fallback to route.name
          if (typeof label !== 'string') label = route.name;

          const isFocused = state.index === index;
          const iconColor = isFocused ? '#fff' : '#e3eaff';
          const iconSize = isFocused ? 26 : 22;

          let iconName: string = 'home';
          if (route.name === 'home') iconName = 'home';
          if (route.name === 'profile') iconName = 'search';
          if (route.name === 'match') iconName = 'people';
          if (route.name === 'connections') iconName = 'people-outline';
          if (route.name === 'messages') iconName = 'chat';
          if (route.name === 'groups') iconName = 'groups';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tabItem}
              activeOpacity={0.8}
            >
              <MaterialIcons name={iconName as any} size={iconSize} color={iconColor} />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <CustomTabBar {...props} />}
      initialRouteName="home"
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: "Match",
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: "Connections",
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Search",
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    paddingHorizontal: 0,
  },
  tabLabel: {
    fontSize: 11,
    color: '#e3eaff',
    marginTop: 0,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 13,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
