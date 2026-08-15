import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as Font from "expo-font";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default class SignUp extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);

    this.state = {
      username: "",
      name: "",
      email: "",
      school: "",
      grade: "",
      teacher: "",
      password: "",
      number: "",
      fontsLoaded: false,
    };
  }

  signUp = async (
    email,
    password,
    school,
    grade,
    teacher,
    name,
    number,
    username,
  ) => {
    const { t } = this.context;
    if (
      email &&
      name &&
      password &&
      school &&
      grade &&
      teacher &&
      number &&
      username
    ) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const uid = userCredential.user.uid;
        await setDoc(doc(db, "Users", uid), {
          name: name,
          grade: grade,
          number: number,
          teacher: teacher,
          password: password,
          username: username,
          school: school,
          email: email,
          createdAt: new Date().toISOString(),
        });
        Alert.alert("Success", "Account created successfully!");
        this.props.navigation.navigate("TabNavigator");
      } catch (error) {
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
      }
    } else {
      Alert.alert("Missing Information");
    }
  };

  async componentDidMount() {
    await Font.loadAsync({
      font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
    });

    this.setState({
      fontsLoaded: true,
    });
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
          <View
            style={[
              styles.circle,
              {
                width: 300,
                height: 300,
                top: -100,
                right: -100,
                opacity: 0.3,
              },
            ]}
          />

          <View
            style={[
              styles.circle,
              {
                width: 250,
                height: 250,
                bottom: -80,
                left: -80,
                opacity: 0.2,
                backgroundColor: "#FF8C42",
              },
            ]}
          />

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

          <Text style={styles.title}>{t.welcomeToPlannify}</Text>

          <Text style={styles.subtitle}>{t.createAccount}</Text>

          <View style={styles.card}>
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
            />

            <TextInput
              style={styles.input}
              onChangeText={(school) => this.setState({ school })}
              placeholder={t.school}
              placeholderTextColor="#938F99"
            />

            <TextInput
              style={styles.input}
              onChangeText={(grade) => this.setState({ grade })}
              placeholder={t.grade}
              placeholderTextColor="#938F99"
            />

            <TextInput
              style={styles.input}
              onChangeText={(teacher) => this.setState({ teacher })}
              placeholder={t.homeroomTeacher}
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

            <TouchableOpacity
              onPress={() =>
                this.signUp(
                  this.state.email,
                  this.state.password,
                  this.state.school,
                  this.state.grade,
                  this.state.teacher,
                  this.state.name,
                  this.state.number,
                )
              }
              style={styles.btn}
            >
              <Text style={styles.btnText}>{t.createAccount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => this.props.navigation.navigate("LogIn")}
            >
              <Text style={styles.btnOutlineText}>{t.alreadyHaveAccount}</Text>
            </TouchableOpacity>
          </View>
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

  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#FF6B35",
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
    backgroundColor: "#2B2930",
    borderRadius: 28,
    padding: 24,
  },

  input: {
    backgroundColor: "#3E3842",
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    color: "#E6E0E9",
    marginBottom: 16,
  },

  btn: {
    backgroundColor: "#FF8C42",
    borderRadius: 100,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },

  btnText: {
    color: "#1C1B1F",
    fontSize: 16,
    fontWeight: "600",
  },

  btnOutline: {
    borderRadius: 100,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#79747E",
  },

  btnOutlineText: {
    color: "#FF8C42",
    fontSize: 16,
    fontWeight: "600",
  },
});
