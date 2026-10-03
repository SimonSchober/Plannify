import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Font from "expo-font";
// FIX: sendPasswordResetEmail muss aus firebase/auth importiert werden
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";

let customFonts = {
  font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
};

export default class LogIn extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      password: "",
      email: "",
      fontsLoaded: false,
    };
  }

  signIn = async (email, password) => {
    const { t } = this.context;
    const cleanEmail = (email || "").trim();

    if (cleanEmail && password) {
      try {
        const response = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        if (response) {
          this.props.navigation.navigate("TabNavigator");
        }
      } catch (error) {
        switch (error.code) {
          case "auth/user-not-found":
            Alert.alert(t.userNotFound);
            break;
          case "auth/invalid-email":
          case "auth/wrong-password":
          // FIX: neuere Firebase-Versionen geben diesen Code zurück
          case "auth/invalid-credential":
            Alert.alert(t.incorrectLogin);
            break;
          default:
            Alert.alert(error.message);
        }
      }
    } else {
      Alert.alert(t.enterBoth);
    }
  };

  handleForgotPassword = async () => {
    const { t } = this.context;
    const email = (this.state.email || "").trim();

    if (email) {
      try {
        // FIX: neue Schreibweise (v9+): Funktion mit auth als erstem Parameter
        await sendPasswordResetEmail(auth, email);
        Alert.alert(t.emailSent, t.emailSentMsg);
      } catch (error) {
        switch (error.code) {
          case "auth/user-not-found":
            Alert.alert("Error", t.userNotFound);
            break;
          case "auth/invalid-email":
            Alert.alert("Error", t.incorrectLogin);
            break;
          default:
            Alert.alert("Error", error.message);
        }
      }
    } else {
      Alert.alert(t.enterEmail, t.enterEmailMsg);
    }
  };

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this.loadFontAsync();
  }

  render() {
    if (!this.state.fontsLoaded) return null;

    const { t, language, setLanguage } = this.context;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.backgroundCircle1} />
          <View style={styles.backgroundCircle2} />
          <View style={styles.backgroundCircle3} />

          {/* Language Toggle*/}
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

          <Image style={styles.logo} source={require("../logo_light.png")} />
          <Text style={styles.title}>{t.welcomeBack}</Text>
          <Text style={styles.subtitle}>{t.loginSubtitle}</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={this.state.email}
              onChangeText={(email) => this.setState({ email })}
              placeholder={t.email}
              placeholderTextColor="#938F99"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              value={this.state.password}
              onChangeText={(password) => this.setState({ password })}
              placeholder={t.password}
              placeholderTextColor="#938F99"
              secureTextEntry
            />
            <TouchableOpacity
              onPress={() => this.signIn(this.state.email, this.state.password)}
              style={styles.loginButton}
            >
              <Text style={styles.loginText}>{t.login}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => this.props.navigation.navigate("SignUp")}
            >
              <Text style={styles.signupText}>{t.noAccount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={this.handleForgotPassword}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>{t.forgotPassword}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1B1F",
    justifyContent: "center",
    padding: 24,
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
  langRow: {
    position: "absolute",
    top: 56,
    right: 24,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#938F99",
  },
  langBtnActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  langText: {
    color: "#938F99",
    fontWeight: "700",
    fontSize: 13,
  },
  langTextActive: {
    color: "#fff",
  },
  logo: {
    width: 320,
    height: 120,
    alignSelf: "center",
    marginBottom: 24,
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
  loginButton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginText: {
    color: "#FF8C42",
    fontSize: 17,
    fontWeight: "600",
  },
  signupButton: {
    backgroundColor: "rgba(43, 41, 48, 0.3)",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  signupText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
  },
  forgotButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 5,
  },
  forgotText: {
    color: "#FF8C42",
    fontSize: 14,
    fontWeight: "600",
  },
});
