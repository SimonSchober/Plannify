import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Easing,
  Modal,
  TextInput,
} from "react-native";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";

import { doc, getDoc } from "firebase/firestore";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const playedAnimations = new Set();
const playedCountUps = new Set();
const dataCache = { subjects: [], homework: [] };
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getNextLesson(subjects, now) {
  const todayIndex = WEEKDAYS.indexOf(
    now.toLocaleDateString("en-US", { weekday: "long" }),
  );

  return subjects
    .filter((lesson) =>
      WEEKDAYS.includes(lesson.day) &&
      typeof lesson.startTime === "string" &&
      /^\d{2}:\d{2}$/.test(lesson.startTime),
    )
    .map((lesson) => {
      const target = new Date(now);
      let daysUntil = (WEEKDAYS.indexOf(lesson.day) - todayIndex + 7) % 7;
      target.setDate(target.getDate() + daysUntil);
      const [hour, minute] = lesson.startTime.split(":").map(Number);
      target.setHours(hour, minute, 0, 0);
      if (target <= now) {
        daysUntil += 7;
        target.setDate(target.getDate() + 7);
      }
      return { ...lesson, target };
    })
    .sort((a, b) => a.target - b.target)[0] || null;
}

function PressableScale({
  children,
  onPress,
  style,
  containerStyle,
  scaleTo = 0.95,
  hitSlop,
  accessibilityRole,
  accessibilityLabel,
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
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
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
      searchVisible: false,
      searchQuery: "",
      now: new Date(),
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
    this.countdownTimer = setInterval(
      () => this.setState({ now: new Date() }),
      30000,
    );
  }

  componentWillUnmount() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
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

    const { t, language = "en" } = this.context;
    const now = this.state.now;
    const today = now.toLocaleDateString("en-US", { weekday: "long" });
    const todayClasses = this.state.subjects.filter((s) => s.day === today);
    const nextLesson = getNextLesson(this.state.subjects, this.state.now);
    const minutesUntilLesson = nextLesson
      ? Math.max(1, Math.ceil((nextLesson.target - this.state.now) / 60000))
      : null;
    const countdown = minutesUntilLesson === null
      ? (language === "de" ? "Keine Stunden geplant" : "No lessons scheduled")
      : minutesUntilLesson < 60
        ? `${minutesUntilLesson}m`
        : (() => {
            const hours = Math.floor(minutesUntilLesson / 60);
            const minutes = minutesUntilLesson % 60;
            return `${hours}h ${minutes}m`;
          })();
    const nextLessonDay = nextLesson
      ? nextLesson.target.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { weekday: "long" })
      : "";
    const query = this.state.searchQuery.trim().toLowerCase();
    const searchResults = query
      ? [
          ...this.state.subjects
            .filter((subject) =>
              [subject.subject, subject.teacher, subject.day, subject.startTime, subject.endTime]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
            )
            .map((subject) => ({ ...subject, resultType: "lesson" })),
          ...this.state.homework
            .filter((task) =>
              [task.subject, task.description, task.dueDate, task.status]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
            )
            .map((task) => ({ ...task, resultType: "task" })),
        ]
      : [];
    const searchText = language === "de"
      ? { title: "Suchen", placeholder: "Fächer oder Aufgaben suchen…", lessons: "Stunde", tasks: "Aufgabe", empty: "Keine passenden Ergebnisse", hint: "Gib einen Suchbegriff ein", close: "Schließen" }
      : { title: "Search", placeholder: "Search lessons or tasks…", lessons: "Lesson", tasks: "Task", empty: "No matching results", hint: "Enter a search term", close: "Close" };

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
            style={[styles.card, styles.listCard]}
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
                    id="today-classes"
                    value={todayClasses.length}
                    style={styles.statNumberInline}
                  />
                  <Text style={styles.statLabelInline}>{t.classesToday}</Text>
                </LinearGradient>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <ScrollView
              style={styles.moduleScroll}
              contentContainerStyle={{ gap: 8 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
          </LinearGradient>
        </AnimatedItem>

        {/* Homework */}
        <AnimatedItem id="dashboard-homework-card" index={3}>
          <LinearGradient
            colors={["rgba(43, 41, 48, 0.85)", "rgba(62, 56, 66, 0.85)"]}
            style={[styles.card, styles.listCard]}
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
                  <Text style={styles.statLabelInline}>{t.pendingTasks}</Text>
                </LinearGradient>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <ScrollView
              style={styles.moduleScroll}
              contentContainerStyle={{ gap: 8 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {this.state.homework.length > 0 ? (
                this.state.homework.map((item, index) => (
                  <AnimatedItem
                    key={item.id || "homework-" + index}
                    id={"dashboard-homework-" + (item.id || index)}
                    index={index}
                  >
                    <View style={styles.subjectRow}>
                      <View style={styles.cardAvatar}>
                        <Text style={styles.cardAvatarText}>
                          {item.subject?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.subject}</Text>
                      </View>
                      {!!item.dueDate && (
                        <View style={styles.timeTag}>
                          <Text style={styles.cardTimeText}>{item.dueDate}</Text>
                        </View>
                      )}
                    </View>
                  </AnimatedItem>
                ))
              ) : (
                <Text style={styles.cardBody}>{t.noHomework}</Text>
              )}
            </ScrollView>
          </LinearGradient>
        </AnimatedItem>

        {/* Next lesson */}
        <AnimatedItem id="dashboard-next-lesson-card" index={4}>
          <PressableScale
            scaleTo={0.97}
            onPress={() => this.props.changeTab("Timetable")}
          >
            <LinearGradient
              colors={["rgba(43, 41, 48, 0.85)", "rgba(62, 56, 66, 0.85)"]}
              style={[styles.card, styles.nextLessonCard]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="time-outline" size={24} color="#FF8C42" />
                </View>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.cardTitle}>
                    {language === "de" ? "Nächste Stunde" : "Next lesson"}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1} ellipsizeMode="tail">
                    {nextLesson ? nextLesson.subject : countdown}
                  </Text>
                </View>
                {!!nextLesson && (
                  <View style={styles.countdownTag}>
                    <Text
                      style={styles.countdownText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {countdown}
                    </Text>
                  </View>
                )}
              </View>
              {!!nextLesson && (
                <Text style={styles.nextLessonDay} numberOfLines={1} ellipsizeMode="tail">
                  {nextLessonDay} · {nextLesson.startTime}
                </Text>
              )}
            </LinearGradient>
          </PressableScale>
        </AnimatedItem>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={searchText.title}
          onPress={() => this.setState({ searchVisible: true })}
          containerStyle={styles.searchButton}
          style={styles.searchButtonContent}
          scaleTo={0.92}
          hitSlop={8}
        >
          <Ionicons name="search-outline" size={22} color="#FF8C42" />
          <Text style={styles.searchButtonText}>Search</Text>
        </PressableScale>

        <Modal
          visible={this.state.searchVisible}
          transparent
          animationType="fade"
          onRequestClose={() => this.setState({ searchVisible: false })}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.searchModal}>
              <View style={styles.searchModalHeader}>
                <Text style={styles.searchModalTitle}>{searchText.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={searchText.close}
                  onPress={() => this.setState({ searchVisible: false, searchQuery: "" })}
                  hitSlop={10}
                >
                  <Text style={styles.closeButton}>×</Text>
                </Pressable>
              </View>
              <TextInput
                autoFocus
                value={this.state.searchQuery}
                onChangeText={(searchQuery) => this.setState({ searchQuery })}
                placeholder={searchText.placeholder}
                placeholderTextColor="#938F99"
                style={styles.searchInput}
                returnKeyType="search"
              />
              <ScrollView
                style={styles.searchResults}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {!query ? (
                  <Text style={styles.searchEmpty}>{searchText.hint}</Text>
                ) : searchResults.length === 0 ? (
                  <Text style={styles.searchEmpty}>{searchText.empty}</Text>
                ) : (
                  searchResults.map((result, index) => (
                    <View key={`${result.resultType}-${result.id || index}`} style={styles.searchResult}>
                      <Text style={styles.searchResultType}>
                        {result.resultType === "lesson" ? searchText.lessons : searchText.tasks}
                      </Text>
                      <Text style={styles.searchResultTitle}>
                        {result.subject || result.title || result.description}
                      </Text>
                      <Text style={styles.searchResultDetails}>
                        {result.resultType === "lesson"
                          ? [result.day, result.startTime && result.endTime ? `${result.startTime} - ${result.endTime}` : null, result.teacher].filter(Boolean).join(" · ")
                          : [result.dueDate, result.status].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  listCard: { maxHeight: 230 },
  nextLessonCard: {
    height: 128,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    justifyContent: "flex-start",
  },
  countdownTag: {
    maxWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 140, 66, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 140, 66, 0.3)",
  },
  countdownText: {
    color: "#FFB078",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "font",
  },
  nextLessonDay: {
    marginTop: 12,
    marginLeft: 60,
    color: "#AAA4B0",
    fontSize: 13,
    fontFamily: "font",
  },
  moduleScroll: { flexGrow: 0, maxHeight: 128 },
  searchButton: {
    position: "absolute",
    right: 30,
    bottom: 38,
    minWidth: 98,
    height: 48,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 5,
  },
  searchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  searchButtonText: {
    color: "#FF8C42",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "font",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  searchModal: {
    maxHeight: "78%",
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#29272E",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.45)",
  },
  searchModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  searchModalTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "700", fontFamily: "font" },
  closeButton: { color: "#CAC4D0", fontSize: 30, lineHeight: 32 },
  searchInput: {
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  searchResults: { marginTop: 12, flexGrow: 0 },
  searchEmpty: { color: "#AAA4B0", textAlign: "center", paddingVertical: 24, fontFamily: "font" },
  searchResult: { padding: 12, marginBottom: 8, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.06)" },
  searchResultType: { color: "#FF8C42", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 3, fontFamily: "font" },
  searchResultTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "font" },
  searchResultDetails: { color: "#CAC4D0", fontSize: 12, marginTop: 4, fontFamily: "font" },
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
