import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import * as Font from "expo-font";

import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { LanguageContext } from "../LanguageContext";
import { CameraView, requestCameraPermissionsAsync, Camera } from "expo-camera";

let customFonts = {
  font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
};

export default class Profile extends Component {
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
      scanned: false,
      profileLoaded: false,
      isOwnProfile: true,
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
      const scannedUserId = routeParams?.uid;

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
      const existingStatus = await Camera.getCameraPermissionsAsync();
      if (existingStatus.granted) {
        this.setState({
          hasCameraPermission: true,
          scannerVisible: true,
          scanned: false,
          cameraActive: false,
        });
        setTimeout(
          () => {
            this.setState({ cameraActive: true });
          },
          Platform.OS === "android" ? 350 : 0,
        );
        return;
      }

      const { status } = await Camera.requestCameraPermissionsAsync();
      const isGranted = status === "granted";
      this.setState({
        hasCameraPermission: isGranted,
        scannerVisible: isGranted,
        scanned: false,
        cameraActive: false,
      });
      if (!isGranted) {
        setTimeout(
          () => {
            this.setState({ cameraActive: true });
          },
          Platform.OS === "android" ? 350 : 0,
        );
      } else {
        alert(
          "permission denied",
          "camera permission required to scan QR codes",
        );
      }
    } catch (error) {
      console.error("permission request failure", error);
      Alert.alert("could not request camera hardware");
    }
  };

  handleBarCodeScanned = ({ type, data }) => {
    this.setState({
      scanned: true,
      scannerVisible: false,
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

  render() {
    if (!this.state.fontsLoaded) return null;
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
          <Text style={[styles.title, { marginTop: titleMarginTop }]}>
            {t.profile}
          </Text>
          <Text style={styles.subtitle}>{t.profileSubtitle}</Text>

          {/* Top-Buttons Row */}
          {this.state.isOwnProfile && (
            <View style={styles.topButtonsContainer}>
              <TouchableOpacity
                onPress={() => this.setState({ myQrVisible: true })}
                style={styles.topButtonWrapper}
              >
                <View style={styles.topButton}>
                  <Ionicons
                    name="qr-code-outline"
                    size={18}
                    color="#FF8C42"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.topButtonText}>MyQR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={this.openScanner}
                style={styles.topButtonWrapper}
              >
                <View style={styles.topButton}>
                  <Ionicons
                    name="scan-outline"
                    size={18}
                    color="#FF8C42"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.topButtonText}>Scan QR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => this.setState({ langModalVisible: true })}
                style={styles.topButtonWrapper}
              >
                <View style={styles.topButton}>
                  <Ionicons
                    name="language-outline"
                    size={18}
                    color="#FF8C42"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.topButtonText}>
                    {t.language || "Language"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal: My QR */}
          <Modal
            visible={myQrVisible}
            onRequestClose={() => this.setState({ myQrVisible: false })}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>My QR Code</Text>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={currentuid}
                    size={200}
                    backgroundColor={"#ffffff"}
                    color={"#000000"}
                    quietZone={10}
                  />
                </View>
                <Text style={styles.qrSubtitle}>
                  {username ? `@${username}` : "@loading..."}
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 20, width: "100%" }}
                  onPress={() => this.setState({ myQrVisible: false })}
                >
                  <View style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Close</Text>
                  </View>
                </TouchableOpacity>
              </View>
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
              <View style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>
                  {t.language || "Select Language"}
                </Text>

                <View style={styles.modalLangRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalLangBtn,
                      language === "de" && styles.modalLangBtnActive,
                    ]}
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
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalLangBtn,
                      language === "en" && styles.modalLangBtnActive,
                    ]}
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
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{ marginTop: 20, width: "100%" }}
                  onPress={() => this.setState({ langModalVisible: false })}
                >
                  <View style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Close</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal: Camera Scanner */}
          <Modal
            visible={scannerVisible}
            onRequestClose={() => this.setState({ scannerVisible: false })}
            animationType="fade"
          >
            <View style={{ flex: 1 }}>
              {this.state.cameraActive && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  onBarcodeScanned={
                    scanned ? undefined : this.handleBarCodeScanned
                  }
                  barcodeSettings={{
                    barcodeTypes: ["qr"],
                  }}
                />
              )}
              <View style={styles.scannerOverlay}>
                <View style={styles.scannedTargetWindow}>
                  <TouchableOpacity
                    onPress={() => this.setState({ scannerVisible: false })}
                  >
                    <View style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Close</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Profile Card */}
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
            <TouchableOpacity onPress={this.saveProfile}>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>{t.saveChanges}</Text>
              </View>
            </TouchableOpacity>
          </View>
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
  },
  subtitle: {
    fontSize: 16,
    color: "#CAC4D0",
    alignSelf: "center",
    marginBottom: 20,
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
    borderRadius: 25,
    paddingVertical: 12,
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
  },
  actionButton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 12,
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
    fontSize: 17,
    fontWeight: "600",
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
    padding: 24,
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
    padding: 16,
    fontSize: 16,
    color: "#E6E0E9",
    marginBottom: 16,
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
    borderWidth: 3,
    borderColor: "#FF6B35",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  qrCard: {
    backgroundColor: "rgba(43, 41, 48, 0.96)",
    padding: 24,
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
  },
  qrSubtitle: {
    color: "#CAC4D0",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  modalLangRow: {
    width: "100%",
    gap: 12,
    marginBottom: 10,
  },
  modalLangBtn: {
    width: "100%",
    paddingVertical: 14,
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
    fontSize: 16,
  },
  modalLangTextActive: {
    color: "#FFF",
  },
});
