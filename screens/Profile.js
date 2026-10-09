import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  Animated,
  Easing,
} from "react-native";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation } from "@react-navigation/native";

import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { LanguageContext } from "../LanguageContext";
import { CameraView, Camera } from "expo-camera";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const SESSION_KEY = "login_timestamp";
const playedAnimations = new Set();

function PressableScale({
  children,
  onPress,
  style,
  containerStyle,
  scaleTo = 0.95,
  hitSlop,
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const animateTo = (value) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      style={containerStyle}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function AnimatedItem({ children, index = 0, style, id }) {
  const alreadyPlayed = id ? playedAnimations.has(id) : false;
  const anim = React.useRef(new Animated.Value(alreadyPlayed ? 1 : 0)).current;

  React.useEffect(() => {
    if (alreadyPlayed) return;
    if (id) playedAnimations.add(id);
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function PopCard({ children, style, id }) {
  const alreadyPlayed = id ? playedAnimations.has(id) : false;
  const anim = React.useRef(new Animated.Value(alreadyPlayed ? 1 : 0)).current;

  React.useEffect(() => {
    if (alreadyPlayed) return;
    if (id) playedAnimations.add(id);
    Animated.spring(anim, {
      toValue: 1,
      speed: 14,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function PulseFrame() {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scanFramePulse,
        {
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 1],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.04],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function ProfileWrapper(props) {
  const hookNavigation = useNavigation();
  return <Profile {...props} navigation={props.navigation || hookNavigation} />;
}

export default ProfileWrapper;

class Profile extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);

    this.state = {
      school: "",
      number: "",
      username: "",
      name: "",
      email: "",
      fontsLoaded: false,
      scannerVisible: false,
      myQrVisible: false,
      langModalVisible: false,
      hasCameraPermission: null,
      cameraActive: false,
      scanned: false,
      profileLoaded: false,
      isOwnProfile: true,
      isCameraReady: false,
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  async componentDidMount() {
    this.loadFontAsync();
    try {
      const routeParams = this.props.route?.params;
      const scannedUserId = routeParams?.uid || routeParams?.userId;

      let targetuid = scannedUserId;
      if (!targetuid) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log("No authenticated active session");
          this.setState({ profileLoaded: true });
          return;
        }
        targetuid = currentUser.uid;
      }

      const docRef = doc(db, "Users", targetuid);

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({
          username: data.username || "",
          name: data.name || "",
          email: data.email || "",
          school: data.school || "",
          number: data.number || "",
          profileLoaded: true,
          isOwnProfile: !scannedUserId,
        });
      } else {
        console.log("No records found for the target");
        this.setState({ profileLoaded: true });
      }
    } catch (error) {
      console.error("Error fetching user profile", error);
      this.setState({ profileLoaded: true });
    }
  }

  openScanner = async () => {
    try {
      let existingStatus = (await Camera.getCameraPermissionsAsync());

     

      if (!existingStatus) {
        this.setState({ hasCameraPermission: false });
        Alert.alert(
          "Permission denied",
          "Camera permission is required to scan QR codes. You can enable it in your phone's settings.",
        );
        return;
      }
if (existingStatus.granted) {
      this.setState({
        hasCameraPermission: true,
        scannerVisible: true,
        scanned: false,
        cameraActive: false,
        ifCameraReady: false
      });
      setTimeout(()=>{
        this.setState({cameraActive: true})
      }, Platform.OS==="android"?450:0)
      return

    }
     const {status}=await Camera.requestCameraPermissionsAsync()
     const isgranted =status==="granted"
     this.setState({
      hasCameraPermission: isgranted,
      scannerVisible: isgranted,
      scanned: false,
      cameraActive: false,
      isCameraReady: false
     })

     if (isgranted){
      setTimeout(()=>{
        this.setState({cameraActive:true})
      }, Platform.OS==="android"?450:0)
      

     }
     else{
      alert.Alert("Permission denied, Camera Permission is required to scan the QR ")
     }
    } 
    catch (error) {
      console.error("permission request failure", error);
      Alert.alert("Could not access the camera");
    }
  };

  closeScanner = () => {
    this.setState({ scannerVisible: false, cameraActive: false });
  };

  handleBarCodeScanned = ({ type, data }) => {
    this.setState({
      scanned: true,
      scannerVisible: false,
      cameraActive: false,
    });
    if (data) {
      this.props.navigation.navigate("Profile", { userId: data });
    } else {
      Alert.alert("QR Scanned", `data:${data}`);
    }
  };

  saveProfile = async () => {
    const { t } = this.context;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No user logged in");
        return;
      }
      const uid = currentUser.uid;
      const docRef = doc(db, "Users", uid);
      await updateDoc(docRef, {
        username: this.state.username,
        name: this.state.name,
        school: this.state.school,
        email: this.state.email,
        number: this.state.number,
      });
      Alert.alert(t.profileUpdated);
      this.props.changeTab("Dashboard");
    } catch (error) {
      console.error("Error saving profile", error);
    }
  };

  confirmLogout = () => {
    const { t } = this.context;
    Alert.alert(
      t.logout || "Log out",
      t.logoutConfirm || "Do you really want to log out?",
      [
        { text: t.cancel || "Cancel", style: "cancel" },
        {
          text: t.logout || "Log out",
          style: "destructive",
          onPress: this.logout,
        },
      ],
    );
  };

  logout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await signOut(auth);
      const { navigation } = this.props;
      if (navigation) {
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "LogIn" }] }),
        );
      }
    } catch (error) {
      console.error("Error logging out", error);
      Alert.alert(error.message);
    }
  };

  render() {
   // if (!this.state.fontsLoaded) return null;
    const currentuid = auth.currentUser ? auth.currentUser.uid : "No User";
    const {
      school,
      number,
      username,
      name,
      email,
      scannerVisible,
      myQrVisible,
      langModalVisible,
      scanned,
      cameraActive
    } = this.state;
    const { t, language, setLanguage } = this.context;
    const titleMarginTop = Platform.OS === "ios" ? 50 : 10;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#1C1B1F" }}
      >
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedItem id="profile-title" index={0}>
            <Text style={[styles.title, { marginTop: titleMarginTop }]}>
              {t.profile}
            </Text>
          </AnimatedItem>
          <AnimatedItem id="profile-subtitle" index={1}>
            <Text style={styles.subtitle}>{t.profileSubtitle}</Text>
          </AnimatedItem>

          {/* Top-Buttons Row */}
          {this.state.isOwnProfile && (
            <AnimatedItem
              id="profile-buttons"
              index={2}
              style={styles.topButtonsContainer}
            >
              <PressableScale
                onPress={() => this.setState({ myQrVisible: true })}
                containerStyle={styles.topButtonWrapper}
                style={styles.topButton}
                scaleTo={0.93}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color="#FF8C42"
                  style={styles.buttonIcon}
                />
                <Text style={styles.topButtonText}>MyQR</Text>
              </PressableScale>

              <PressableScale
                onPress={this.openScanner}
                containerStyle={styles.topButtonWrapper}
                style={styles.topButton}
                scaleTo={0.93}
              >
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color="#FF8C42"
                  style={styles.buttonIcon}
                />
                <Text style={styles.topButtonText}>Scan QR</Text>
              </PressableScale>

              <PressableScale
                onPress={() => this.setState({ langModalVisible: true })}
                containerStyle={styles.topButtonWrapper}
                style={styles.topButton}
                scaleTo={0.93}
              >
                <Ionicons
                  name="language-outline"
                  size={18}
                  color="#FF8C42"
                  style={styles.buttonIcon}
                />
                <Text style={styles.topButtonText}>
                  {t.language || "Language"}
                </Text>
              </PressableScale>
            </AnimatedItem>
          )}

          {/* Modal: My QR */}
          <Modal
            visible={myQrVisible}
            onRequestClose={() => this.setState({ myQrVisible: false })}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <PopCard id="profile-qr-popup" style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>My QR Code</Text>
                <AnimatedItem id="profile-qr-code" index={2}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={currentuid}
                      size={200}
                      backgroundColor={"#ffffff"}
                      color={"#000000"}
                      quietZone={10}
                    />
                  </View>
                </AnimatedItem>
                <Text style={styles.qrSubtitle}>
                  {username ? `@${username}` : "@loading..."}
                </Text>
                <PressableScale
                  containerStyle={{ marginTop: 20, width: "100%" }}
                  style={styles.actionButton}
                  scaleTo={0.97}
                  onPress={() => this.setState({ myQrVisible: false })}
                >
                  <Text style={styles.actionButtonText}>Close</Text>
                </PressableScale>
              </PopCard>
            </View>
          </Modal>

          {/* Modal: Language Settings */}
          <Modal
            visible={langModalVisible}
            onRequestClose={() => this.setState({ langModalVisible: false })}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <PopCard id="profile-lang-popup" style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>
                  {t.language || "Select Language"}
                </Text>

                <View style={styles.modalLangRow}>
                  <PressableScale
                    style={[
                      styles.modalLangBtn,
                      language === "de" && styles.modalLangBtnActive,
                    ]}
                    scaleTo={0.97}
                    onPress={() => setLanguage("de")}
                  >
                    <Text
                      style={[
                        styles.modalLangText,
                        language === "de" && styles.modalLangTextActive,
                      ]}
                    >
                      Deutsch 🇩🇪
                    </Text>
                  </PressableScale>

                  <PressableScale
                    style={[
                      styles.modalLangBtn,
                      language === "en" && styles.modalLangBtnActive,
                    ]}
                    scaleTo={0.97}
                    onPress={() => setLanguage("en")}
                  >
                    <Text
                      style={[
                        styles.modalLangText,
                        language === "en" && styles.modalLangTextActive,
                      ]}
                    >
                      English 🇬🇧
                    </Text>
                  </PressableScale>
                </View>

                <PressableScale
                  containerStyle={{ marginTop: 20, width: "100%" }}
                  style={styles.actionButton}
                  scaleTo={0.97}
                  onPress={() => this.setState({ langModalVisible: false })}
                >
                  <Text style={styles.actionButtonText}>Close</Text>
                </PressableScale>
              </PopCard>
            </View>
          </Modal>

          {/* Modal: Camera Scanner */}
          <Modal
            visible={scannerVisible}
            onRequestClose={this.closeScanner}
            animationType="fade"
          >
            <View style={{ flex: 1 }}>
              {cameraActive && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onCameraReady={()=>this.setState({isCameraReady: true})}
                  onBarcodeScanned={
                    scanned ? undefined : this.handleBarCodeScanned
                  }
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                />
              )}
              <View style={styles.scannerOverlay}>
                <View style={styles.scannedTargetWindow}>
                  <PulseFrame />
                  <PressableScale
                    onPress={this.closeScanner}
                    style={styles.actionButton}
                    scaleTo={0.97}
                  >
                    <Text style={styles.actionButtonText}>Close</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          </Modal>

          {/* Profile Card */}
          <AnimatedItem id="profile-card" index={3}>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(username) => this.setState({ username })}
                placeholder={t.username}
                placeholderTextColor="#938F99"
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(name) => this.setState({ name })}
                placeholder={t.name}
                placeholderTextColor="#938F99"
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(email) => this.setState({ email })}
                placeholder={t.email}
                placeholderTextColor="#938F99"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                value={school}
                onChangeText={(school) => this.setState({ school })}
                placeholder={t.school}
                placeholderTextColor="#938F99"
              />
              <TextInput
                style={styles.input}
                value={number}
                onChangeText={(number) => this.setState({ number })}
                placeholder={t.mobile}
                placeholderTextColor="#938F99"
                keyboardType="phone-pad"
              />
              <PressableScale
                onPress={this.saveProfile}
                style={styles.actionButton}
                scaleTo={0.97}
              >
                <Text style={styles.actionButtonText}>{t.saveChanges}</Text>
              </PressableScale>
            </View>
          </AnimatedItem>

          {/* Logout */}
          {this.state.isOwnProfile && (
            <AnimatedItem id="profile-logout" index={4}>
              <PressableScale
                onPress={this.confirmLogout}
                style={styles.logoutButton}
                scaleTo={0.97}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color="#FF5A4F"
                  style={styles.buttonIcon}
                />
                <Text style={styles.logoutButtonText}>
                  {t.logout || "Log out"}
                </Text>
              </PressableScale>
            </AnimatedItem>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  backgroundCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#FF6B35",
    opacity: 0.3,
    top: -100,
    right: -100,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#FF8C42",
    opacity: 0.2,
    bottom: 300,
    left: 50,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFB347",
    opacity: 0.25,
    bottom: -60,
    right: -50,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#E6E0E9",
    alignSelf: "center",
    marginBottom: 8,
    fontFamily: "font",
  },
  subtitle: {
    fontSize: 16,
    color: "#CAC4D0",
    alignSelf: "center",
    marginBottom: 20,
    fontFamily: "font",
  },
  topButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  topButtonWrapper: {
    flex: 1,
  },
  topButton: {
    flexDirection: "row",
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 4,
  },
  topButtonText: {
    color: "#FF8C42",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "font",
  },
  actionButton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 90, 79, 0.08)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 90, 79, 0.5)",
  },
  logoutButtonText: {
    color: "#FF5A4F",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  qrWrapper: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "rgba(43, 41, 48, 0.7)",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
    shadowColor: "rgba(255, 107, 53, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    backgroundColor: "#3E3842",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#E6E0E9",
    marginBottom: 10,
    fontFamily: "font",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
  },
  scannedTargetWindow: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scanFramePulse: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: "#FF6B35",
    borderRadius: 16,
  },
  qrCard: {
    backgroundColor: "rgba(43, 41, 48, 0.96)",
    padding: 20,
    borderRadius: 28,
    alignItems: "center",
    width: "85%",
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
    shadowColor: "rgba(255, 107, 53, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodeWrapper: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  qrCardTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    fontFamily: "font",
  },
  qrSubtitle: {
    color: "#CAC4D0",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
    fontFamily: "font",
  },
  modalLangRow: {
    width: "100%",
    gap: 12,
    marginBottom: 10,
  },
  modalLangBtn: {
    width: "100%",
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#938F99",
    alignItems: "center",
    backgroundColor: "rgba(62, 56, 66, 0.3)",
  },
  modalLangBtnActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  modalLangText: {
    color: "#CAC4D0",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "font",
  },
  modalLangTextActive: {
    color: "#FFF",
  },
});
