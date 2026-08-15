import React, { Component } from 'react';
import { StyleSheet } from 'react-native'; 
import { SafeAreaProvider } from 'react-native-safe-area-context'; 
import LogIn from './screens/LogIn';
import SignUp from './screens/SignUp';

import TabNavigator from './Navigation/TabNavigator'; 
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { LanguageProvider } from './LanguageContext';

const Stack = createStackNavigator();

const StackNav = () => {
  return (
    <Stack.Navigator
      initialRouteName="LogIn"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LogIn" component={LogIn} />
      <Stack.Screen name="SignUp" component={SignUp} /> 
      <Stack.Screen name="TabNavigator" component={TabNavigator}/> 
    </Stack.Navigator>
  );
};

export default class App extends Component {
  render() {
    return (
      <SafeAreaProvider> 
        <LanguageProvider>
          <NavigationContainer>
            <StackNav />
          </NavigationContainer>
        </LanguageProvider>
      </SafeAreaProvider>
    );
  }
}
