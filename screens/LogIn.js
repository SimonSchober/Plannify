import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
  AppState,
} from "react-native";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import {
  isBiometricAvailable,
  hasSavedCredentials,
  saveCredentials,
  clearCredentials,
  getCredentialsWithBiometric,
} from "./BiometricLogin";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const SESSION_KEY = "login_timestamp";
const SESSION_DURATION = 10 * 60 * 1000;
const playedAnimations = new Set();

function PressableScale({
  children,
  onPress,
  style,
  containerStyle,
  scaleTo = 0.95,
  hitSlop,
  disabled,
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
      disabled={disabled}
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
      duration: 420,
      delay: index * 90,
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
                outputRange: [20, 0],
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

export default class LogIn extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      password: "",
      email: "",
      fontsLoaded: false,
      loading: false,
      biometricAvailable: false,
      hasSavedLogin: false,
    };
    this.biometricPrompting = false;

    this.shakeAnim = new Animated.Value(0);
    this._mounted = false;
    this.sessionTimer = null;
    this.appStateSub = null;
  }

  shake = () => {
    this.shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(this.shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(this.shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(this.shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(this.shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  getSessionStart = async () => {
    try {
      const value = await AsyncStorage.getItem(SESSION_KEY);
      return value ? Number(value) : null;
    } catch (error) {
      console.log("Could not read session", error);
      return null;
    }
  };

  startSession = async () => {
    try {
      await AsyncStorage.setItem(SESSION_KEY, String(Date.now()));
    } catch (error) {
      console.log("Could not save session", error);
    }
    this.scheduleExpiry(SESSION_DURATION);
  };

  scheduleExpiry = (remaining) => {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(
      () => this.expireSession(false),
      Math.max(remaining, 0),
    );
  };

  expireSession = async (silent) => {
    const { t } = this.context;
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = null;
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.log("Could not end session", error);
    }
    if (!silent && this._mounted) {
      Alert.alert(
        t.sessionExpired || "Session expired",
        t.sessionExpiredMsg || "Please log in again.",
      );
      this.props.navigation.reset({ index: 0, routes: [{ name: "LogIn" }] });
    }
  };

  restoreSession = async () => {
    const start = await this.getSessionStart();
    const user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
    });

    if (!user) {
      if (start) await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }

    const age = start ? Date.now() - start : Infinity;
    if (age < SESSION_DURATION) {
      this.scheduleExpiry(SESSION_DURATION - age);
      if (this._mounted) this.props.navigation.navigate("TabNavigator");
    } else {
      await this.expireSession(true);
    }
  };

  checkExpiry = async () => {
    if (!auth.currentUser) return;
    const start = await this.getSessionStart();
    if (start && Date.now() - start >= SESSION_DURATION) {
      await this.expireSession(false);
    }
  };

  handleAppStateChange = (nextState) => {
    if (nextState === "active") this.checkExpiry();
  };

  signIn = async (email, password, fromBiometrics = false) => {
    if (this.state.loading && !fromBiometrics) return;
    const { t } = this.context;
    const cleanEmail = (email || "").trim();

    if (cleanEmail && password) {
      this.setState({ loading: true });
      try {
        const response = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        if (response) {
          await this.startSession();
          if (!fromBiometrics) {
            await this.syncBiometricLogin(cleanEmail, password);
          }
          this.props.navigation.navigate("TabNavigator");
        }
      } catch (error) {
        this.shake();
        const badCredentials = [
          "auth/user-not-found",
          "auth/wrong-password",
          "auth/invalid-credential",
        ].includes(error.code);

        if (fromBiometrics && badCredentials) {
          await clearCredentials().catch(() => {});
          if (this._mounted) this.setState({ hasSavedLogin: false });
          Alert.alert(
            t.biometricLoginFailed || "Fingerprint sign-in failed.",
            t.incorrectLogin,
          );
        } else {
          switch (error.code) {
            case "auth/user-not-found":
              Alert.alert(t.userNotFound);
              break;
            case "auth/invalid-email":
            case "auth/wrong-password":
            case "auth/invalid-credential":
              Alert.alert(t.incorrectLogin);
              break;
            default:
              Alert.alert(error.message);
          }
        }
      } finally {
        if (this._mounted) this.setState({ loading: false });
      }
    } else {
      this.shake();
      Alert.alert(t.enterBoth);
    }
  };
  initBiometric = async () => {
    try {
      const [available, saved] = await Promise.all([
        isBiometricAvailable(),
        hasSavedCredentials(),
      ]);
      if (!this._mounted) return;
      this.setState({ biometricAvailable: available, hasSavedLogin: saved });
    } catch (error) {
      console.log("biometric init failed", error);
    }
  };

  askToEnableBiometrics = (email, password) => {
    const { t } = this.context;

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      Alert.alert(
        t.biometricSetupTitle || "Enable fingerprint login?",
        t.biometricSetupMessage || "Save your login securely on this device for fingerprint sign-in next time?",
        [
          {
            text: t.biometricNotNow || "Not now",
            style: "cancel",
            onPress: () => finish(false),
          },
          {
            text: t.biometricEnable || "Enable",
            onPress: async () => {
              try {
                await saveCredentials(
                  email,
                  password,
                  t.biometricSavePrompt || "Authenticate to enable fingerprint login",
                );
                if (this._mounted) this.setState({ hasSavedLogin: true });
                finish(true);
              } catch (error) {
                Alert.alert(
                  t.biometricSetupFailed || "Fingerprint login could not be enabled.",
                );
                finish(false);
              }
            },
          },
        ],
        { cancelable: true, onDismiss: () => finish(false) },
      );
    });
  };

  syncBiometricLogin = async (email, password) => {
    try {
      if (this.state.hasSavedLogin) {
        await saveCredentials(
          email,
          password,
          this.context.t.biometricSavePrompt || "Authenticate to update your saved login",
        );
      } else if (this.state.biometricAvailable) {
        await this.askToEnableBiometrics(email, password);
      }
    } catch (error) {
      console.log("biometric sync failed", error);
    }
  };

  handleBiometricLogin = async () => {
    const { t, language } = this.context;
    const enteredEmail = (this.state.email || "").trim().toLowerCase();

    if (!enteredEmail) {
      Alert.alert(
        t.enterEmail || "Email required",
        language === "de"
          ? "Gib zuerst die E-Mail-Adresse des gespeicherten Kontos ein."
          : "Enter the email address for the saved account first.",
      );
      return;
    }

    if (!this.state.hasSavedLogin) {
      Alert.alert(
        t.biometricFirstLogin || "Sign in with your email and password first, then enable fingerprint login.",
      );
      return;
    }
    if (this.state.loading || this.biometricPrompting) return;

    this.biometricPrompting = true;
    try {
      const credentials = await getCredentialsWithBiometric(
        t.biometricLoginPrompt || "Authenticate to sign in to Plannify",
      );
      if (credentials) {
        if (credentials.email.trim().toLowerCase() !== enteredEmail) {
          Alert.alert(
            t.incorrectLogin || "Incorrect email or password",
            language === "de"
              ? "Die eingegebene E-Mail stimmt nicht mit dem gespeicherten Konto überein."
              : "That email does not match the account saved for fingerprint login.",
          );
          return;
        }
        await this.signIn(credentials.email, credentials.password, true);
      }
    } catch (error) {
      if (error?.code !== "ERR_CANCELED" && error?.code !== "ERR_AUTHENTICATION_CANCELED") {
        Alert.alert(
          t.biometricLoginFailed || "Fingerprint sign-in failed. Try your password.",
        );
      }
    } finally {
      this.biometricPrompting = false;
    }
  };
  handleForgotPassword = async () => {
    const { t } = this.context;
    const email = (this.state.email || "").trim();

    if (email) {
      try {
        await sendPasswordResetEmail(auth, email);
        Alert.alert(t.emailSent, t.emailSentMsg);
      } catch (error) {
        this.shake();
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
      this.shake();
      Alert.alert(t.enterEmail, t.enterEmailMsg);
    }
  };

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this._mounted = true;
    this.loadFontAsync();
    this.restoreSession();
    this.initBiometric();
    this.appStateSub = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  componentWillUnmount() {
    this._mounted = false;
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    if (this.appStateSub) this.appStateSub.remove();
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

          {/* Language Toggle */}
          <AnimatedItem id="login-lang" index={0} style={styles.langRow}>
            <PressableScale
              style={[
                styles.langBtn,
                language === "en" && styles.langBtnActive,
              ]}
              scaleTo={0.9}
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
            </PressableScale>
            <PressableScale
              style={[
                styles.langBtn,
                language === "de" && styles.langBtnActive,
              ]}
              scaleTo={0.9}
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
            </PressableScale>
          </AnimatedItem>

          <AnimatedItem id="login-logo" index={1}>
            <Image style={styles.logo} source={require("../logo_light.png")} />
          </AnimatedItem>
          <AnimatedItem id="login-title" index={2}>
            <Text style={styles.title}>{t.welcomeBack}</Text>
          </AnimatedItem>
          <AnimatedItem id="login-subtitle" index={3}>
            <Text style={styles.subtitle}>{t.loginSubtitle}</Text>
          </AnimatedItem>

          <AnimatedItem id="login-card" index={4}>
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateX: this.shakeAnim }] },
              ]}
            >
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
              <PressableScale
                onPress={() =>
                  this.signIn(this.state.email, this.state.password)
                }
                style={styles.loginButton}
                scaleTo={0.97}
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <ActivityIndicator color="#FF8C42" />
                ) : (
                  <Text style={styles.loginText}>{t.login}</Text>
                )}
              </PressableScale>
              {this.state.biometricAvailable && (
                <PressableScale
                  onPress={this.handleBiometricLogin}
                  style={styles.biometricButton}
                  scaleTo={0.97}
                  disabled={this.state.loading}
                >
                  <Ionicons name="finger-print" size={21} color="#FF8C42" />
                  <Text style={styles.biometricText}>
                    {t.biometricLogin || "Use fingerprint"}
                  </Text>
                </PressableScale>
              )}
              <PressableScale
                style={styles.signupButton}
                scaleTo={0.97}
                onPress={() => this.props.navigation.navigate("SignUp")}
              >
                <Text style={styles.signupText}>{t.noAccount}</Text>
              </PressableScale>
              <PressableScale
                onPress={this.handleForgotPassword}
                containerStyle={styles.forgotButton}
                scaleTo={0.92}
              >
                <Text style={styles.forgotText}>{t.forgotPassword}</Text>
              </PressableScale>
            </Animated.View>
          </AnimatedItem>
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#938F99",
  },
  langBtnActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  langText: {
    fontFamily: "font",
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
    fontFamily: "font",
    fontSize: 32,
    fontWeight: "700",
    color: "#E6E0E9",
    alignSelf: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "font",
    fontSize: 16,
    color: "#CAC4D0",
    alignSelf: "center",
    marginBottom: 24,
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
    fontFamily: "font",
    backgroundColor: "#3E3842",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#E6E0E9",
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginText: {
    fontFamily: "font",
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
  },
  biometricButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    marginTop: 8,
  },
  biometricText: {
    fontFamily: "font",
    color: "#FF8C42",
    fontSize: 14,
    fontWeight: "600",
  },  signupButton: {
    backgroundColor: "rgba(43, 41, 48, 0.3)",
    borderRadius: 22,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  signupText: {
    fontFamily: "font",
    color: "#FF8C42",
    fontSize: 14,
    fontWeight: "600",
  },
  forgotButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: "font",
    color: "#FF8C42",
    fontSize: 13,
    fontWeight: "600",
  },
});
