import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";

import { doc, getDoc } from "firebase/firestore";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const playedAnimations = new Set();
const playedCountUps = new Set();
const dataCache = { subjects: [], homework: [] };

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
      duration: 400,
      delay: index * 80,
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

function CountUp({ value, style, id }) {
  const alreadyPlayed = playedCountUps.has(id);
  const anim = React.useRef(
    new Animated.Value(alreadyPlayed ? value : 0),
  ).current;
  const [display, setDisplay] = React.useState(alreadyPlayed ? value : 0);

  React.useEffect(() => {
    const listenerId = anim.addListener(({ value: v }) =>
      setDisplay(Math.round(v)),
    );
    return () => anim.removeListener(listenerId);
  }, []);

  React.useEffect(() => {
    if (playedCountUps.has(id)) {
      anim.setValue(value);
      return;
    }
    if (value > 0) playedCountUps.add(id);
    Animated.timing(anim, {
      toValue: value,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

export default class Dashboard extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      fontsLoaded: false,
      subjects: dataCache.subjects,
      homework: dataCache.homework,
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
      const docRef = doc(db, "Timetable", uid);
      const docSnap = await getDoc(docRef);
      const subjects = docSnap.exists() ? docSnap.data().subjects || [] : [];
      dataCache.subjects = subjects;
      this.setState({ subjects });
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
      let homework = [];
      if (docSnap.exists()) {
        homework = docSnap.data().homeworks || [];
      } else {
        console.log("No homework data found for this user!");
      }
      dataCache.homework = homework;
      this.setState({ homework });
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

        <AnimatedItem id="dashboard-logo" index={0}>
          <Image source={require("../logo_light.png")} style={styles.logo} />
        </AnimatedItem>
        <AnimatedItem id="dashboard-title" index={1}>
          <Text style={styles.appTitle}>Plannify</Text>
        </AnimatedItem>

        {/* Today's Classes */}
        <AnimatedItem id="dashboard-classes-card" index={2}>
          <LinearGradient
            colors={["rgba(43, 41, 48, 0.85)", "rgba(62, 56, 66, 0.85)"]}
            style={styles.card}
          >
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
              <PressableScale
                scaleTo={0.92}
                onPress={() => this.props.changeTab("Timetable")}
              >
                <LinearGradient
                  colors={["rgba(62, 56, 66, 0.35)", "rgba(62, 56, 66, 0.35)"]}
                  style={styles.statCardInline}
                >
                  <Text style={styles.statIconInline}>📅</Text>
                  <CountUp
                    id="subjects"
                    value={this.state.subjects.length}
                    style={styles.statNumberInline}
                  />
                  <Text style={styles.statLabelInline}>{t.total}</Text>
                </LinearGradient>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <View style={{ gap: 8 }}>
              {todayClasses.length === 0 ? (
                <Text style={styles.cardBody}>{t.noClasses}</Text>
              ) : (
                todayClasses.map((s, i) => (
                  <AnimatedItem key={s.id} id={`class-${s.id}`} index={i}>
                    <View style={styles.subjectRow}>
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
                  </AnimatedItem>
                ))
              )}
            </View>
          </LinearGradient>
        </AnimatedItem>

        {/* Homework */}
        <AnimatedItem id="dashboard-homework-card" index={3}>
          <LinearGradient
            colors={["rgba(43, 41, 48, 0.85)", "rgba(62, 56, 66, 0.85)"]}
            style={styles.card}
          >
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
              <PressableScale
                scaleTo={0.92}
                onPress={() => this.props.changeTab("Timetable")}
              >
                <LinearGradient
                  colors={["rgba(62, 56, 66, 0.35)", "rgba(62, 56, 66, 0.35)"]}
                  style={styles.statCardInline}
                >
                  <Text style={styles.statIconInline}>✅</Text>
                  <CountUp
                    id="homework"
                    value={this.state.homework.length}
                    style={styles.statNumberInline}
                  />
                  <Text style={styles.statLabelInline}>{t.total}</Text>
                </LinearGradient>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            {nextHomework ? (
              <AnimatedItem id="dashboard-next-homework">
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
              </AnimatedItem>
            ) : (
              <Text style={styles.cardBody}>{t.noHomework}</Text>
            )}
          </LinearGradient>
        </AnimatedItem>

        {/* Profile */}
        <AnimatedItem id="dashboard-profile-card" index={4} style={{ flex: 1 }}>
          <PressableScale
            containerStyle={{ flex: 1 }}
            scaleTo={0.97}
            onPress={() => this.props.changeTab("Profile")}
          >
            <LinearGradient
              colors={["rgba(43, 41, 48, 0.85)", "rgba(62, 56, 66, 0.85)"]}
              style={styles.card}
            >
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
          </PressableScale>
        </AnimatedItem>
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
    fontFamily: "font",
  },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
    shadowColor: "rgba(255, 107, 53, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
  iconText: { fontSize: 24, fontFamily: "font" },
  cardTitleGroup: { flex: 1 },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#E6E0E9",
    letterSpacing: 0.3,
    fontFamily: "font",
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#CAC4D0",
    marginTop: 3,
    fontFamily: "font",
  },
  chevron: { fontSize: 28, color: "#CAC4D0", fontFamily: "font" },
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
    fontFamily: "font",
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
  cardAvatarText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    fontFamily: "font",
  },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardTimeText: {
    color: "#E6E0E9",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "font",
  },
  statCardInline: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    minWidth: 60,
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  statIconInline: { fontSize: 16, fontFamily: "font" },
  statNumberInline: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "font",
  },
  statLabelInline: {
    fontSize: 10,
    color: "#CAC4D0",
    letterSpacing: 0.3,
    fontFamily: "font",
  },
});
