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
} from "react-native";
import * as Font from "expo-font";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { LanguageContext } from "../LanguageContext";
import { Camera, CameraView } from "expo-camera";

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
      hasCameraPermission: null,
      scanned: false,
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  async componentDidMount() {
    this.loadFontAsync();
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No user signed in.");
        return;
      }
      const uid = currentUser.uid;
      const docRef = doc(db, "User", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({
          username: data.username || "",
          name: data.name || "",
          email: data.email || "",
          school: data.school || "",
          number: data.number || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile", error);
    }
  }

  openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    this.setState({
      hasCameraPermission: status === "granted",
      scannerVisible: status === "granted",
      scanned: false,
    });
    if (status !== "granted") {
      alert("permission denied", "camera permission required to scan QR codes");
    }
  };
  handleBarCodeScanned = ({ type, data }) => {
    this.setState({
      scanned: true,
      scannerVisible: false,
    });
    alert.Alert("QR Scanned", `data:${data}`);
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

          <View style={styles.topButtonsContainer}>
            <TouchableOpacity
              onPress={() => this.setState({ myQrVisible: true })}
              style={styles.topButtonWrapper}
            >
              <LinearGradient
                colors={["#FF6B35", "#CC5520", "#8B3010"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topButton}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.topButtonText}>MyQR</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Modal
              visible={this.state.myQrVisible}
              onRequestClose={() => this.setState({ myQrVisible: false })}
              transparent
              animationType="fade"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.qrCard}>
                  <Text style={styles.qrCardTitle}>My QR Code</Text>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={currentuid}
                      size={200}
                      backgroundColor={"#ffffff"}
                      color={"#000000"}
                    />
                  </View>
                  <Text style={styles.qrSubtitle}>
                    @{this.state.username || "User"}
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 20 }}
                    onPress={() => this.setState({ myQrVisible: false })}
                  >
                    <LinearGradient
                      colors={["#FF6B35", "#CC5520", "#8B3010"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.topButton}
                    >
                      <Text style={styles.topButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <TouchableOpacity
              onPress={this.openScanner}
              style={styles.topButtonWrapper}
            >
              <LinearGradient
                colors={["#FF6B35", "#CC5520", "#8B3010"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topButton}
              >
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.topButtonText}>Scan QR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Modal
            visible={scannerVisible}
            onRequestClose={() => this.setState({ scannerVisible: false })}

            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>Scan QR Code</Text>
                <View style={styles.qrWrapper}>
                  <CameraView
                    style={StyleSheet.absoluteFillObject}
                      onBarcodeScanned={
                      scanned ? undefined : this.handleBarCodeScanned
                    }
                    barcodeSettings={{
                      
                      barcodeTypes: ["qr"],
                    }}
                  
                  />

                  <TouchableOpacity>
                    onPress={() => this.setState({ scannerVisible: false })}
                    <LinearGradient
                      colors={["#FF6B35", "#CC5520", "#8B3010"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.topButton}
                    >
                      <Text style={styles.topButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.card}>
            {/* Sprach-Toggle */}
            <View style={styles.langSection}>
              <Text style={styles.langLabel}>{t.language}</Text>
              <View style={styles.langRow}>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    language === "en" && styles.langBtnActive,
                  ]}
                  onPress={() => setLanguage("en")}
                >
                  <Text
                    style={[
                      styles.langText,
                      language === "en" && styles.langTextActive,
                    ]}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    language === "de" && styles.langBtnActive,
                  ]}
                  onPress={() => setLanguage("de")}
                >
                  <Text
                    style={[
                      styles.langText,
                      language === "de" && styles.langTextActive,
                    ]}
                  >
                    DE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
              <LinearGradient
                colors={["#FF6B35", "#CC5520", "#8B3010"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButton}
              >
                <Text style={styles.saveText}>{t.saveChanges}</Text>
              </LinearGradient>
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
    gap: 12,
    marginBottom: 24,
  },
  topButtonWrapper: {
    flex: 1,
    maxWidth: 140,
  },
  topButton: {
    flexDirection: "row",
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 6,
  },
  qrWrapper: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  topButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#2B2930",
    borderRadius: 28,
    padding: 24,
  },
  langSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,107,53,0.15)",
  },
  langLabel: { color: "#CAC4D0", fontSize: 15, fontWeight: "600" },
  langRow: { flexDirection: "row", gap: 8 },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#938F99",
  },
  langBtnActive: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  langText: { color: "#938F99", fontWeight: "700", fontSize: 13 },
  langTextActive: { color: "#fff" },
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
  qrCard: {
    backgroundColor: "#2B2930",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
    borderWidth: 1,
    borderColor: "#4A434C",
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
  modaltitle: {
    color: "#E6E0E9",
  },
  saveButton: {
    borderRadius: 100,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "white", fontSize: 20, fontWeight: "600" },
});
