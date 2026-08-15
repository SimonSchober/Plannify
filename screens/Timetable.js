import React, { Component } from "react";
import {
  Text,
  StyleSheet,
  View,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ScrollView,
  Animated,
} from "react-native";
import * as Font from "expo-font";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { LanguageContext } from "../LanguageContext";
import  { auth, db } from "../firebaseConfig"
import { doc, getDoc, collection, getDocs } from "firebase/firestore"
let customFonts = {
  font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
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

function SwipeableRow({ children, onDelete }) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const screenWidth = require("react-native").Dimensions.get("window").width;

  const panResponder = require("react-native").PanResponder.create({
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
        }).start(() => onDelete());
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  return (
    <Animated.View
      style={{ transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
      {children}
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
      items: DAYS.map((d) => ({ label: d, value: d })),
      open: false,
      fontsLoaded: false,
      subject: [],
      showStartPicker: false,
      showEndPicker: false,
      startTime: new Date(),
      endTime: new Date(),
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this.loadFontAsync();
    this.fetchSubjects();
  }

  goToPreviousDay = () => {
    this.setState((state) => ({
      currentDayIndex: (state.currentDayIndex - 1 + DAYS.length) % DAYS.length,
    }));
  };

  goToNextDay = () => {
    this.setState((state) => ({
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
    const { t } = this.context;

    if (!this.state.subjectInput) {
      Alert.alert(t.subjectRequired, t.subjectRequiredMsg);
      return;
    }
    // if (
    //   this.timeToMinutes(this.state.startTime) ===
    //   this.timeToMinutes(this.state.endTime)
    // ) {
    //   Alert.alert(t.invalidTime, t.sameTime);
    //   return;
    // }
    if (
      this.timeToMinutes(this.state.startTime) >
      this.timeToMinutes(this.state.endTime)
    ) {
      Alert.alert(t.invalidTime, t.endBeforeStart);
      return;
    }
    if (this.hasOverlap()) {
      Alert.alert(
        t.timeConflict,
        `${t.timeConflictMsg} ${this.state.selectedDay} ${t.duringThisTime}`,
      );
      return;
    }

    try {
      const uId = firebase.auth().currentUser.uid;
      const newSubject = {
        id: Date.now().toString(),
        day: this.state.selectedDay,
        subject: this.state.subjectInput,
        teacher: this.state.teacher,
        description: this.state.description,
        startTime: this.state.startTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        endTime: this.state.endTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      };

      const docRef = firebase.firestore().collection("Timetable").doc(uId);
      const doc = await docRef.get();

      if (doc.exists) {
        await docRef.update({
          subjects: [...(doc.data().subjects || []), newSubject],
        });
      } else {
        await docRef.set({ subjects: [newSubject] });
      }

      Alert.alert(t.subjectUploaded);
      this.setState({
        visible: false,
        subjectInput: "",
        teacher: "",
        description: "",
      });
      this.fetchSubjects();
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  fetchSubjects = async () => {
    try {
      const uid = auth.currentUser?auth.currentUser.uid: null
      if (!uid) return 

      const docRef = doc(db, "Timetable", uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        this.setState({ subjects:data.subjects || [] });
      }else {
        console.log("No timetable data found.")
        this.setState({subject:[]})
      }
    } catch (error) {
      console.error(error);
  
    }
  };

  deleteSubject = async (id) => {
    try {
      const uid = firebase.auth().currentUser.uid;
      const updatedSubjects = this.state.subject.filter(
        (item) => item.id !== id,
      );
      await firebase
        .firestore()
        .collection("Timetable")
        .doc(uid)
        .update({ subjects: updatedSubjects });
      this.setState({ subject: updatedSubjects });
    } catch (error) {
      alert(error.message);
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

    const { t } = this.context;
    const { startTime, endTime, currentDayIndex } = this.state;
    const titleMarginTop = Platform.OS === "ios" ? 50 : 10;
    const currentDay = DAYS[currentDayIndex];
    const subjectsForDay = this.state.subject.filter(
      (item) => item.day === currentDay,
    );

    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <Text style={[styles.title, { marginTop: titleMarginTop }]}>
          {t.timetable}
        </Text>

        <View style={styles.dayNavRow}>
          <TouchableOpacity
            onPress={this.goToPreviousDay}
            style={styles.navButton}
          >
            <Text style={styles.navArrow}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.dayNavText}>{currentDay}</Text>
          <TouchableOpacity onPress={this.goToNextDay} style={styles.navButton}>
            <Text style={styles.navArrow}>{">"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ padding: 10 }}
          persistentScrollbar
          showsVerticalScrollIndicator
        >
          <FlatList
            data={subjectsForDay}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {t.noSubjects} {currentDay}
              </Text>
            }
            ListFooterComponent={
              <TouchableOpacity
                onPress={() =>
                  this.setState({ visible: true, selectedDay: currentDay })
                }
              >
                <LinearGradient
                  colors={["#FF6B35", "#CC5520"]}
                  style={styles.addSubjectButton}
                >
                  <Text style={styles.addSubjectText}>{t.addSubject}</Text>
                </LinearGradient>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <SwipeableRow onDelete={() => this.deleteSubject(item.id)}>
                <LinearGradient
                  colors={["#2B2930", "#3E3842"]}
                  style={styles.subjectCard}
                >
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
                </LinearGradient>
              </SwipeableRow>
            )}
          />
        </ScrollView>

        <Modal visible={this.state.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.card}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.createSubject}</Text>
                <TouchableOpacity
                  onPress={() => this.setState({ visible: false })}
                >
                  <Image
                    style={styles.noLogo}
                    source={require("../Close.png")}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.timeView}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => this.setState({ showStartPicker: true })}
                >
                  <Text style={styles.timeText}>
                    {t.start}:{" "}
                    {startTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => this.setState({ showEndPicker: true })}
                >
                  <Text style={styles.timeText}>
                    {t.end}:{" "}
                    {endTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </Text>
                </TouchableOpacity>
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
                  backgroundColor: "#3E3842",
                  borderColor: "#3E3842",
                }}
                textStyle={{ color: "#E6E0E9" }}
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

              <TouchableOpacity onPress={this.handleSaveNote}>
                <LinearGradient
                  colors={["#FF6B35", "#CC5520", "#8B3010"]}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveText}>{t.saveSubject}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1C1B1F", padding: 24 },
  backgroundCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#FF6B35",
    opacity: 0.1,
    top: -80,
    left: -80,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FF8C42",
    opacity: 0.1,
    top: 120,
    right: -60,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFB347",
    opacity: 0.1,
    bottom: -50,
    right: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#E6E0E9",
    alignSelf: "center",
    marginBottom: 8,
  },
  dayNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#938F99",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  navArrow: { color: "#E6E0E9", fontSize: 20, fontWeight: "700" },
  dayNavText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E6E0E9",
    minWidth: 110,
    textAlign: "center",
  },
  emptyText: {
    color: "#938F99",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    fontSize: 14,
  },
  subjectCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: "rgba(255, 139, 66, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  dayBadgeText: {
    color: "#FFB347",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardTitle: { color: "white", fontSize: 22, fontWeight: "700" },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardTimeText: { color: "#E6E0E9", fontSize: 12, fontWeight: "600" },
  cardTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardAvatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  cardTeacher: { color: "#CAC4D0", fontSize: 16, fontWeight: "500", flex: 1 },
  addSubjectButton: {
    borderRadius: 100,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
  },
  addSubjectText: { color: "white", fontSize: 18, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#2B2930",
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#E6E0E9" },
  timeView: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeButton: {
    flex: 0.48,
    backgroundColor: "#3E3842",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  timeText: { color: "#E6E0E9", fontWeight: "600" },
  noLogo: { width: 30, height: 30, tintColor: "#FF6B35" },
  dropdown: {
    backgroundColor: "#3E3842",
    borderColor: "#3E3842",
    borderRadius: 12,
    marginBottom: 16,
  },
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
  saveText: { color: "white", fontSize: 18, fontWeight: "700" },
});
