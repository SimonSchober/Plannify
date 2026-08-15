// Import the functions you need from the SDKs you need

import { initializeApp, getApps } from 'firebase/app'; 
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native'


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCdS63pmxvCWzhzkijiEUgwIntO5LpwNUY',
  authDomain: 'plannify-a3c15.firebaseapp.com',
  databaseURL: 'https://plannify-a3c15-default-rtdb.firebaseio.com',
  projectId: 'plannify-a3c15',
  storageBucket: 'plannify-a3c15.firebasestorage.app',
  messagingSenderId: '251193221554',
  appId: '1:251193221554:web:486260ab5b73a24df8c4ab',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps();
const persistenceEngine = Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage);
const auth = initializeAuth(app, { persistence: persistenceEngine });
 const db = getFirestore(app);
export default app;
export {auth, db}

