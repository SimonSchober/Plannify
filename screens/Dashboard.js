import React, { Component } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";
import { doc, setDocs, collection, getDoc } from "firebase/firestore";
import { firebase } from "firebase/app";

let customFonts = {
  font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
};

export default class Dashboard extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      fontsLoaded: false,
      subjects: [],
      homework: [],
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this.loadFontAsync();
    this.fetchSubjects();
    this.fetchHomework();
  }

  fetchSubjects = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No user is signed in");
        return;
      }
      const uid = currentUser.uid;
      const docRef = doc(db, "timetable", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.setState({ subjects: docSnap.data().subjects || [] });
      } else {
        this.setState({ subjects: [] });
      }
    } catch (error) {
      console.error(error);
    }
  };

  fetchHomework = async () => {
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;
      const docRef = doc(db, "Homework", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({ homeworkData: data });
      } else {
        console.log("No homework data found for this user!");
      }
    } catch (error) {
      console.error("Error fetching homework items: ", error);
    }
  };
  render() {
    if (!this.state.fontsLoaded) return null;

    const { t } = this.context;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayClasses = this.state.subjects.filter((s) => s.day === today);
    const nextHomework =
      this.state.homework.length > 0 ? this.state.homework[0] : null;

    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <Image source={require("../logo_light.png")} style={styles.logo} />
        <Text style={styles.appTitle}>Plannify</Text>

        {/* Today's Classes */}
        <LinearGradient colors={["#2B2930", "#3E3842"]} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>📅</Text>
            </View>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>{t.todaysClasses}</Text>
              <Text style={styles.cardSubtitle}>
                {todayClasses.length} {t.classesToday}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => this.props.changeTab("Timetable")}
            >
              <LinearGradient
                colors={["#3E3842", "#4A434C"]}
                style={styles.statCardInline}
              >
                <Text style={styles.statIconInline}>📅</Text>
                <Text style={styles.statNumberInline}>
                  {this.state.subjects.length}
                </Text>
                <Text style={styles.statLabelInline}>{t.total}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={{ gap: 8 }}>
            {todayClasses.length === 0 ? (
              <Text style={styles.cardBody}>{t.noClasses}</Text>
            ) : (
              todayClasses.map((s) => (
                <View key={s.id} style={styles.subjectRow}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>
                      {s.subject?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{s.subject}</Text>
                    <Text style={styles.cardSubtitle}>{s.teacher}</Text>
                  </View>
                  <View style={styles.timeTag}>
                    <Text style={styles.cardTimeText}>
                      {s.startTime} - {s.endTime}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </LinearGradient>

        {/* Homework */}
        <LinearGradient colors={["#2B2930", "#3E3842"]} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✅</Text>
            </View>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>{t.homework}</Text>
              <Text style={styles.cardSubtitle}>
                {this.state.homework.length} {t.pendingTasks}
              </Text>
            </View>
            <LinearGradient
              colors={["#3E3842", "#4A434C"]}
              style={styles.statCardInline}
            >
              <Text style={styles.statIconInline}>✅</Text>
              <Text style={styles.statNumberInline}>
                {this.state.homework.length}
              </Text>
              <Text style={styles.statLabelInline}>{t.total}</Text>
            </LinearGradient>
          </View>

          <View style={styles.divider} />

          {nextHomework ? (
            <View style={styles.subjectRow}>
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>
                  {nextHomework.subject?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{nextHomework.subject}</Text>
              </View>
              {nextHomework.dueDate && (
                <View style={styles.timeTag}>
                  <Text style={styles.cardTimeText}>
                    {nextHomework.dueDate}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.cardBody}>{t.noHomework}</Text>
          )}
        </LinearGradient>

        {/* Profile */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => this.props.changeTab("Profile")}
        >
          <LinearGradient colors={["#2B2930", "#3E3842"]} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>👤</Text>
              </View>
              <View style={styles.cardTitleGroup}>
                <Text style={styles.cardTitle}>{t.profileCard}</Text>
                <Text style={styles.cardSubtitle}>{t.enterAccount}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1B1F",
    justifyContent: "center",
    padding: 20,
    overflow: "hidden",
    gap: 12,
  },
  backgroundCircle1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF6B35",
    opacity: 0.3,
    top: -100,
    right: -80,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#FF8C42",
    opacity: 0.25,
    top: 60,
    left: -80,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#FF8C42",
    opacity: 0.25,
    bottom: -60,
    right: 10,
  },
  logo: { width: 250, height: 140, alignSelf: "center" },
  appTitle: {
    fontSize: 35,
    fontWeight: "700",
    color: "#FFFFFF",
    alignSelf: "center",
    marginTop: -20,
    marginBottom: 4,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 24 },
  cardTitleGroup: { flex: 1 },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#E6E0E9",
    letterSpacing: 0.3,
  },
  cardSubtitle: { fontSize: 15, color: "#CAC4D0", marginTop: 3 },
  chevron: { fontSize: 28, color: "#CAC4D0" },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 10,
    marginHorizontal: 4,
  },
  cardBody: {
    fontSize: 16,
    color: "#938F99",
    textAlign: "center",
    paddingBottom: 2,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  cardAvatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardTimeText: { color: "#E6E0E9", fontSize: 12, fontWeight: "600" },
  statCardInline: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
    minWidth: 60,
  },
  statIconInline: { fontSize: 16 },
  statNumberInline: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  statLabelInline: { fontSize: 10, color: "#CAC4D0", letterSpacing: 0.3 },
});
