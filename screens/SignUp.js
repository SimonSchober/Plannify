import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";
import { createUserWithEmailAndPassword } from "firebase/auth";

const SESSION_KEY = "login_timestamp";
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

export default class SignUp extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);

    this.state = {
      username: "",
      name: "",
      email: "",
      school: "",
      password: "",
      number: "",
      fontsLoaded: false,
      loading: false,
    };

    this.shakeAnim = new Animated.Value(0);
    this._mounted = false;
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

  signUp = async () => {
    if (this.state.loading) return;
    const { password, number, school, name, username } = this.state;
    const email = (this.state.email || "").trim();

    if (email && name && password && school && number && username) {
      this.setState({ loading: true });
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const uid = userCredential.user.uid;
        // The password is not stored in Firestore, Firebase Auth manages it.
        await setDoc(doc(db, "Users", uid), {
          name: name,
          number: number,
          username: username,
          school: school,
          email: email,
          createdAt: new Date().toISOString(),
        });
        try {
          await AsyncStorage.setItem(SESSION_KEY, String(Date.now()));
        } catch (storageError) {
          console.log("Could not save session", storageError);
        }
        Alert.alert("Success", "Account created successfully!");
        this.props.navigation.navigate("TabNavigator");
      } catch (error) {
        this.shake();
        switch (error.code) {
          case "auth/email-already-in-use":
            Alert.alert("Error", "That email address is already in use!");
            break;
          case "auth/weak-password":
            Alert.alert(
              "Error",
              "Password should be at least 6 characters long.",
            );
            break;
          default:
            Alert.alert("Error", error.message);
        }
      } finally {
        if (this._mounted) this.setState({ loading: false });
      }
    } else {
      this.shake();
      Alert.alert("Missing Information");
    }
  };

  async componentDidMount() {
    this._mounted = true;
    await Font.loadAsync({
      font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
    });

    this.setState({
      fontsLoaded: true,
    });
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  render() {
    if (!this.state.fontsLoaded) return null;

    const { t, language, setLanguage } = this.context;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.backgroundCircle1} />
          <View style={styles.backgroundCircle2} />
          <View style={styles.backgroundCircle3} />

          <AnimatedItem id="signup-lang" index={0} style={styles.langRow}>
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

          <AnimatedItem id="signup-logo" index={1}>
            <Image style={styles.logo} source={require("../logo_light.png")} />
          </AnimatedItem>

          <AnimatedItem id="signup-title" index={2}>
            <Text style={styles.title}>{t.welcomeToPlannify}</Text>
          </AnimatedItem>

          <AnimatedItem id="signup-subtitle" index={3}>
            <Text style={styles.subtitle}>{t.createAccount}</Text>
          </AnimatedItem>

          <AnimatedItem id="signup-card" index={4}>
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateX: this.shakeAnim }] },
              ]}
            >
              <TextInput
                style={styles.input}
                onChangeText={(username) => this.setState({ username })}
                placeholder={t.username}
                placeholderTextColor="#938F99"
              />

              <TextInput
                style={styles.input}
                onChangeText={(name) => this.setState({ name })}
                placeholder={t.name}
                placeholderTextColor="#938F99"
              />

              <TextInput
                style={styles.input}
                onChangeText={(email) => this.setState({ email })}
                placeholder={t.email}
                placeholderTextColor="#938F99"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                onChangeText={(school) => this.setState({ school })}
                placeholder={t.school}
                placeholderTextColor="#938F99"
              />

              <TextInput
                style={styles.input}
                onChangeText={(password) => this.setState({ password })}
                placeholder={t.password}
                placeholderTextColor="#938F99"
                secureTextEntry
              />

              <TextInput
                style={styles.input}
                onChangeText={(number) => this.setState({ number })}
                placeholder={t.mobileNumber}
                placeholderTextColor="#938F99"
                keyboardType="phone-pad"
              />

              <PressableScale
                onPress={() => this.signUp()}
                style={styles.btn}
                scaleTo={0.97}
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <ActivityIndicator color="#FF8C42" />
                ) : (
                  <Text style={styles.btnText}>{t.createAccount}</Text>
                )}
              </PressableScale>

              <PressableScale
                style={styles.btnOutline}
                scaleTo={0.97}
                onPress={() => this.props.navigation.navigate("LogIn")}
              >
                <Text style={styles.btnOutlineText}>
                  {t.alreadyHaveAccount}
                </Text>
              </PressableScale>
            </Animated.View>
          </AnimatedItem>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1C1B1F",
    justifyContent: "center",
    padding: 24,
    overflow: "hidden",
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
    color: "#938F99",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "font",
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
    fontFamily: "font",
  },
  subtitle: {
    fontSize: 16,
    color: "#CAC4D0",
    alignSelf: "center",
    marginBottom: 24,
    fontFamily: "font",
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
  btn: {
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
  btnText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  btnOutline: {
    backgroundColor: "rgba(43, 41, 48, 0.3)",
    borderRadius: 22,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  btnOutlineText: {
    color: "#FF8C42",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "font",
  },
});
