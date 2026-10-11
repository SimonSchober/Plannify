import React, { Component } from "react";
import {
  Text,
  StyleSheet,
  View,
  Platform,
  Pressable,
  Image,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from "react-native";
import * as Font from "expo-font";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LanguageContext } from "../LanguageContext";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const playedAnimations = new Set();

const formatTime = (date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

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

function AnimatedItem({ children, index = 0, direction = 0, id }) {
  const alreadyPlayed = id ? playedAnimations.has(id) : false;
  const anim = React.useRef(new Animated.Value(alreadyPlayed ? 1 : 0)).current;

  React.useEffect(() => {
    if (alreadyPlayed) return;
    if (id) playedAnimations.add(id);
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 6) * 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [direction * 24, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function SwipeableRow({ children, onDelete }) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const heightAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const measuredHeight = React.useRef(0);
  const [collapsing, setCollapsing] = React.useState(false);
  const screenWidth = Dimensions.get("window").width;
  const onDeleteRef = React.useRef(onDelete);
  onDeleteRef.current = onDelete;

  const collapse = () => {
    heightAnim.setValue(measuredHeight.current);
    setCollapsing(true);
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => onDeleteRef.current());
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -screenWidth * 0.6) {
          Animated.timing(translateX, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(collapse);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      onLayout={(e) => {
        if (!collapsing) measuredHeight.current = e.nativeEvent.layout.height;
      }}
      style={
        collapsing
          ? { height: heightAnim, opacity: fadeAnim, overflow: "hidden" }
          : null
      }
    >
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export default class Timetable extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      subjectInput: "",
      teacher: "",
      description: "",
      selectedDay: "Monday",
      currentDayIndex: 0,
      direction: 0,
      items: DAYS.map((d) => ({ label: d, value: d })),
      open: false,
      fontsLoaded: false,
      subject: [],
      showStartPicker: false,
      showEndPicker: false,
      startTime: new Date(),
      endTime: new Date(),
      toastText: "",
    };

    this.modalAnim = new Animated.Value(0);
    this.shakeAnim = new Animated.Value(0);
    this.toastAnim = new Animated.Value(0);
    this.toastTimer = null;
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this.loadFontAsync();
    this.fetchSubjects();
  }

  componentWillUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  openModal = (day) => {
    this.modalAnim.setValue(0);
    this.setState({ visible: true, selectedDay: day }, () => {
      Animated.spring(this.modalAnim, {
        toValue: 1,
        speed: 14,
        bounciness: 6,
        useNativeDriver: true,
      }).start();
    });
  };

  closeModal = (reset = false) => {
    Animated.timing(this.modalAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      this.setState({
        visible: false,
        open: false,
        showStartPicker: false,
        showEndPicker: false,
        ...(reset ? { subjectInput: "", teacher: "", description: "" } : {}),
      });
    });
  };

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

  showToast = (text) => {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.setState({ toastText: text }, () => {
      Animated.spring(this.toastAnim, {
        toValue: 1,
        speed: 16,
        bounciness: 6,
        useNativeDriver: true,
      }).start();
      this.toastTimer = setTimeout(() => {
        Animated.timing(this.toastAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }, 1800);
    });
  };

  goToPreviousDay = () => {
    this.setState((state) => ({
      direction: -1,
      currentDayIndex: (state.currentDayIndex - 1 + DAYS.length) % DAYS.length,
    }));
  };

  goToNextDay = () => {
    this.setState((state) => ({
      direction: 1,
      currentDayIndex: (state.currentDayIndex + 1) % DAYS.length,
    }));
  };

  timeToMinutes = (date) => date.getHours() * 60 + date.getMinutes();

  hasOverlap = () => {
    const newStart = this.timeToMinutes(this.state.startTime);
    const newEnd = this.timeToMinutes(this.state.endTime);
    return this.state.subject.some((item) => {
      if (item.day !== this.state.selectedDay) return false;
      const [sH, sM] = item.startTime.split(":").map(Number);
      const [eH, eM] = item.endTime.split(":").map(Number);
      return newStart < eH * 60 + eM && newEnd > sH * 60 + sM;
    });
  };

  handleSaveNote = async () => {
    const t = this.context?.t || {};

    if (!this.state.subjectInput.trim()) {
      this.shake();
      Alert.alert(
        t.subjectRequired || "Subject required",
        t.subjectRequiredMsg || "Please enter a subject.",
      );
      return;
    }

    if (
      this.timeToMinutes(this.state.startTime) >=
      this.timeToMinutes(this.state.endTime)
    ) {
      this.shake();
      Alert.alert(
        t.invalidTime || "Invalid time",
        t.endBeforeStart || "The end time must be after the start time.",
      );
      return;
    }

    if (this.hasOverlap()) {
      this.shake();
      Alert.alert(
        t.timeConflict || "Time conflict",
        `${t.timeConflictMsg || "You already have a subject on"} ${
          this.state.selectedDay
        } ${t.duringThisTime || "during this time."}`,
      );
      return;
    }

    try {
      if (!auth.currentUser) {
        Alert.alert("Not logged in");
        return;
      }
      const uId = auth.currentUser.uid;
      const newSubject = {
        id: Date.now().toString(),
        day: this.state.selectedDay,
        subject: this.state.subjectInput.trim(),
        teacher: this.state.teacher,
        description: this.state.description,
        startTime: formatTime(this.state.startTime),
        endTime: formatTime(this.state.endTime),
      };

      const docRef = doc(db, "Timetable", uId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          subjects: [...(docSnap.data().subjects || []), newSubject],
        });
      } else {
        await setDoc(docRef, { subjects: [newSubject] });
      }

      this.closeModal(true);
      this.setState({ direction: 0 });
      this.fetchSubjects();
      this.showToast(t.subjectUploaded || "Subject saved");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error?.message || "Unknown error");
    }
  };

  fetchSubjects = async () => {
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;

      const docRef = doc(db, "Timetable", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({ subject: data.subjects || [] });
      } else {
        this.setState({ subject: [] });
      }
    } catch (error) {
      console.error(error);
    }
  };

  deleteSubject = async (id) => {
    const t = this.context?.t || {};
    try {
      const uid = auth.currentUser.uid;
      const updatedSubjects = this.state.subject.filter(
        (item) => item.id !== id,
      );
      const docRef = doc(db, "Timetable", uid);
      await updateDoc(docRef, { subjects: updatedSubjects });
      this.setState({ subject: updatedSubjects, direction: 0 });
      this.showToast(t.subjectDeleted || "Subject deleted");
    } catch (error) {
      Alert.alert("Error", error?.message || "Unknown error");
    }
  };

  onChangeStartTime = (event, selectedDate) => {
    this.setState({
      startTime: selectedDate || this.state.startTime,
      showStartPicker: Platform.OS === "ios",
    });
  };

  onChangeEndTime = (event, selectedDate) => {
    this.setState({
      endTime: selectedDate || this.state.endTime,
      showEndPicker: Platform.OS === "ios",
    });
  };

  render() {
    if (!this.state.fontsLoaded) return null;

    const t = this.context?.t || {};
    const { startTime, endTime, currentDayIndex, direction } = this.state;
    const titleMarginTop = Platform.OS === "ios" ? 50 : 10;
    const currentDay = DAYS[currentDayIndex];
    const subjectsForDay = this.state.subject
      .filter((item) => item.day === currentDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const cardAnimStyle = {
      opacity: this.modalAnim,
      transform: [
        { translateX: this.shakeAnim },
        {
          translateY: this.modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
        {
          scale: this.modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1],
          }),
        },
      ],
    };

    const toastStyle = {
      opacity: this.toastAnim,
      transform: [
        {
          translateY: this.toastAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [40, 0],
          }),
        },
        {
          scale: this.toastAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    };

    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <Text style={[styles.title, { marginTop: titleMarginTop }]}>
          {t.timetable}
        </Text>

        <View style={styles.dayNavRow}>
          <PressableScale
            onPress={this.goToPreviousDay}
            style={styles.navButton}
            scaleTo={0.88}
          >
            <Text style={styles.navArrow}>{"<"}</Text>
          </PressableScale>

          <AnimatedItem
            key={`label-${currentDay}`}
            id={`timetable-label-${currentDay}`}
            direction={direction}
          >
            <Text style={styles.dayNavText}>{currentDay}</Text>
          </AnimatedItem>

          <PressableScale
            onPress={this.goToNextDay}
            style={styles.navButton}
            scaleTo={0.88}
          >
            <Text style={styles.navArrow}>{">"}</Text>
          </PressableScale>
        </View>

        <FlatList
          key={`list-${currentDay}`}
          data={subjectsForDay}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AnimatedItem
              id={`timetable-empty-${currentDay}`}
              direction={direction}
            >
              <Text style={styles.emptyText}>
                {t.noSubjects} {currentDay}
              </Text>
            </AnimatedItem>
          }
          ListFooterComponent={
            <PressableScale
              onPress={() => this.openModal(currentDay)}
              style={styles.addSubjectButton}
              scaleTo={0.97}
            >
              <Text style={styles.addSubjectText}>{t.addSubject}</Text>
            </PressableScale>
          }
          renderItem={({ item, index }) => (
            <AnimatedItem
              id={`timetable-subject-${item.id}`}
              index={index}
              direction={direction}
            >
              <SwipeableRow onDelete={() => this.deleteSubject(item.id)}>
                <View style={styles.subjectCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{item.day}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{item.subject}</Text>
                    </View>
                    <View style={styles.timeTag}>
                      <Text style={styles.cardTimeText}>
                        {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardTeacherRow}>
                    <View style={styles.cardAvatar}>
                      <Text style={styles.cardAvatarText}>
                        {item.teacher?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.cardTeacher}>{item.teacher}</Text>
                  </View>
                </View>
              </SwipeableRow>
            </AnimatedItem>
          )}
        />

        <Animated.View pointerEvents="none" style={[styles.toast, toastStyle]}>
          <Text style={styles.toastText}>✓ {this.state.toastText}</Text>
        </Animated.View>

        <Modal
          visible={this.state.visible}
          transparent
          animationType="fade"
          onRequestClose={() => this.closeModal()}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.card, cardAnimStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.createSubject}</Text>
                <PressableScale
                  onPress={() => this.closeModal()}
                  scaleTo={0.8}
                  hitSlop={12}
                >
                  <Image
                    style={styles.noLogo}
                    source={require("../Close.png")}
                  />
                </PressableScale>
              </View>

              <View style={styles.timeView}>
                <PressableScale
                  containerStyle={styles.timeButtonWrap}
                  style={styles.timeButton}
                  onPress={() => this.setState({ showStartPicker: true })}
                >
                  <Text style={styles.timeText}>
                    {t.start}: {formatTime(startTime)}
                  </Text>
                </PressableScale>
                <PressableScale
                  containerStyle={styles.timeButtonWrap}
                  style={styles.timeButton}
                  onPress={() => this.setState({ showEndPicker: true })}
                >
                  <Text style={styles.timeText}>
                    {t.end}: {formatTime(endTime)}
                  </Text>
                </PressableScale>
              </View>

              {this.state.showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour
                  onChange={this.onChangeStartTime}
                />
              )}
              {this.state.showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour
                  onChange={this.onChangeEndTime}
                />
              )}

              <DropDownPicker
                items={this.state.items}
                open={this.state.open}
                value={this.state.selectedDay}
                setOpen={(open) => this.setState({ open })}
                setValue={(callback) =>
                  this.setState((state) => ({
                    selectedDay: callback(state.selectedDay),
                  }))
                }
                style={styles.dropdown}
                dropDownContainerStyle={{
                  backgroundColor: "#2B2930",
                  borderColor: "rgba(255, 107, 53, 0.35)",
                }}
                textStyle={{
                  color: "#E6E0E9",
                  fontFamily: "font",
                  fontSize: 15,
                }}
              />

              <TextInput
                style={styles.input}
                onChangeText={(subjectInput) => this.setState({ subjectInput })}
                value={this.state.subjectInput}
                placeholder={t.subject}
                placeholderTextColor="#938F99"
              />
              <TextInput
                style={styles.input}
                onChangeText={(teacher) => this.setState({ teacher })}
                value={this.state.teacher}
                placeholder={t.teacher}
                placeholderTextColor="#938F99"
              />
              <TextInput
                style={styles.input}
                onChangeText={(description) => this.setState({ description })}
                value={this.state.description}
                placeholder={t.description}
                placeholderTextColor="#938F99"
                multiline
              />

              <PressableScale
                onPress={this.handleSaveNote}
                style={styles.saveButton}
                scaleTo={0.97}
              >
                <Text style={styles.saveText}>{t.saveSubject}</Text>
              </PressableScale>
            </Animated.View>
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#E6E0E9",
    alignSelf: "center",
    marginBottom: 8,
    fontFamily: "font",
  },
  dayNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navArrow: {
    color: "#FF8C42",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "font",
  },
  dayNavText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E6E0E9",
    minWidth: 110,
    textAlign: "center",
    fontFamily: "font",
  },
  emptyText: {
    color: "#938F99",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    fontSize: 14,
    fontFamily: "font",
  },
  subjectCard: {
    backgroundColor: "rgba(43, 41, 48, 0.7)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
    shadowColor: "rgba(255, 107, 53, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  dayBadge: {
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  dayBadgeText: {
    color: "#FF8C42",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: "font",
  },
  cardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "font",
  },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardTimeText: {
    color: "#E6E0E9",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "font",
  },
  cardTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  cardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardAvatarText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
    fontFamily: "font",
  },
  cardTeacher: {
    color: "#CAC4D0",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    fontFamily: "font",
  },
  addSubjectButton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "rgba(255, 107, 53, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addSubjectText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(43, 41, 48, 0.95)",
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
    shadowColor: "rgba(255, 107, 53, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E6E0E9",
    fontFamily: "font",
  },
  timeView: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeButtonWrap: {
    flex: 0.48,
  },
  timeButton: {
    backgroundColor: "#3E3842",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  timeText: {
    color: "#E6E0E9",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  noLogo: { width: 26, height: 26, tintColor: "#FF6B35" },
  dropdown: {
    backgroundColor: "#3E3842",
    borderColor: "rgba(255, 107, 53, 0.25)",
    borderRadius: 12,
    minHeight: 40,
    marginBottom: 10,
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
  saveButton: {
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
  saveText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  toast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#3E3842",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.45)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#E6E0E9",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "font",
  },
});
