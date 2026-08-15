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
} from "react-native";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";

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
      grade: "",
      teacher: "",
      fontsLoaded: false,
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  async componentDidMount() {
    this.loadFontAsync();
    const uid = firebase.auth().currentUser.uid;
    const doc = await firebase.firestore().collection("Users").doc(uid).get();
    if (doc.exists) {
      this.setState(doc.data());
    }
  }

  saveProfile = async () => {
    const { t } = this.context;
    const uid = firebase.auth().currentUser.uid;
    await firebase.firestore().collection("Users").doc(uid).update({
      username: this.state.username,
      name: this.state.name,
      school: this.state.school,
      grade: this.state.grade,
      email: this.state.email,
      number: this.state.number,
      teacher: this.state.teacher,
    });
    Alert.alert(t.profileUpdated);
  };

  render() {
    if (!this.state.fontsLoaded) return null;

    const { school, number, username, name, email, grade, teacher } =
      this.state;
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
              value={grade}
              onChangeText={(grade) => this.setState({ grade })}
              placeholder={t.grade}
              placeholderTextColor="#938F99"
            />
            <TextInput
              style={styles.input}
              value={teacher}
              onChangeText={(teacher) => this.setState({ teacher })}
              placeholder={t.teacher}
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
    marginBottom: 32,
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
  saveButton: {
    borderRadius: 100,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "white", fontSize: 20, fontWeight: "600" },
});
