import React, { Component } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  TextInput,
  Platform,
  FlatList,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebaseConfig";
import { RadioButton } from "react-native-paper";
import DropDownPicker from "react-native-dropdown-picker";
import { LanguageContext } from "../LanguageContext";
import {doc, getDoc, collection} from  "firebase/firestore"

let customFonts = {
  font: require("../Roboto_Condensed/RobotoCondensed-Italic-VariableFont_wght.ttf"),
};

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

function HomeworkWrapper(props) {
  const insets = useSafeAreaInsets();
  return <Homework {...props} topInset={insets.top} />;
}

export default HomeworkWrapper;

class Homework extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      showCalendar: false,
      dueDate: null,
      subjectInput: null,
      description: "",
      homeworks: [],
      fontsLoaded: false,
      clicked: "option1",
      // Dropdown
      subjectOpen: false,
      subjectItems: [],
    };
  }

  async loadFontAsync() {
    await Font.loadAsync(customFonts);
    this.setState({ fontsLoaded: true });
  }

  componentDidMount() {
    this.loadFontAsync();
    this.fetchHomeworks();
    this.fetchSubjectItems();
  }

  fetchSubjectItems = async () => {
    try {
    const uid = auth.currentUser?auth.currentUser.uid:null
    if (!uid) return
    const docRef = doc (db, "Timetable", uid)
    const docSnap = await getDoc(docRef)
    if(docSnap.exists()) {
      const data = docSnap.data()
      this.setState({subjectItems: data.subjects || []})
    }else{
      console.log ("No subject item found.")
    }
    } catch (error) {
      console.error(error);
    }
  };

  fetchHomeworks = async () => {
    try {
  const uid = auth.currentUser?auth.currentUser.uid:null
  if (!uid) return 
  const docRef = doc(db,"Homework", uid)
  const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data =docSnap.data()
        this.setState({ homeworks: data.homeworks || [] });
      }else {
        console.log("No homework found.")
      }

    } catch (error) {
      console.error(error);
    }
  };

  handleSaveNote = async (value) => {
    const { t } = this.context;
    if (!this.state.subjectInput) {
      Alert.alert(t.subjectRequired, t.subjectRequiredMsg);
      return;
    }
    try {
      const uId = firebase.auth().currentUser.uid;
      const newHomework = {
        id: Date.now().toString(),
        subject: this.state.subjectInput,
        description: this.state.description,
        dueDate: this.state.dueDate || "No Date",
        status: value,
      };

      const docRef = firebase.firestore().collection("Homework").doc(uId);
      const doc = await docRef.get();

      if (doc.exists) {
        const oldData = doc.data().homeworks || [];
        await docRef.update({ homeworks: [...oldData, newHomework] });
      } else {
        await docRef.set({ homeworks: [newHomework] });
      }

      Alert.alert(t.homeworkSaved);
      this.setState({
        visible: false,
        subjectInput: null,
        description: "",
        dueDate: null,
        clicked: "option1",
      });
      this.fetchHomeworks();
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  deleteHomework = async (id) => {
    try {
      const uid = firebase.auth().currentUser.uid;
      const updatedHomeworks = this.state.homeworks.filter((h) => h.id !== id);
      await firebase
        .firestore()
        .collection("Homework")
        .doc(uid)
        .update({ homeworks: updatedHomeworks });
      this.setState({ homeworks: updatedHomeworks });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  updateHomeworkStatus = async (id, newStatus) => {
    const { t } = this.context;
    try {
      if (newStatus === "option3") {
        Alert.alert(t.homeworkCompleted, t.removeHomework, [
          { text: t.cancel, style: "cancel" },
          { text: t.delete, onPress: () => this.deleteHomework(id) },
        ]);
        return;
      }
      const uid = firebase.auth().currentUser.uid;
      const docRef = firebase.firestore().collection("Homework").doc(uid);
      const doc = await docRef.get();
      if (doc.exists) {
        const homeworks = doc.data().homeworks || [];
        const updatedHomeworks = homeworks.map((hw) =>
          hw.id === id ? { ...hw, status: newStatus } : hw,
        );
        await docRef.update({ homeworks: updatedHomeworks });
        this.setState({ homeworks: updatedHomeworks });
      }
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  render() {
    if (!this.state.fontsLoaded) return null;

    const { t } = this.context;
    const titleMarginTop = Platform.OS === "ios" ? 50 : 10;

    const sortedHomeworks = [...this.state.homeworks].sort((a, b) => {
      if (a.dueDate === "No Date") return 1;
      if (b.dueDate === "No Date") return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const radioOptions = [
      { value: "option1", label: t.notStarted, color: "#ff241c" },
      { value: "option2", label: t.inProgress, color: "#FFB347" },
      { value: "option3", label: t.done, color: "#4CAF50" },
    ];

    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <Text style={[styles.title, { marginTop: titleMarginTop }]}>
          {t.homework}
        </Text>
        <Text style={styles.subtitle}>{t.trackTasks}</Text>

        <ScrollView
          style={{ padding: 10 }}
          persistentScrollbar
          showsVerticalScrollIndicator
        >
          <FlatList
            data={sortedHomeworks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <SwipeableRow onDelete={() => this.deleteHomework(item.id)}>
                <LinearGradient
                  colors={["#2B2930", "#3E3842"]}
                  style={styles.homeworkCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.dueDateTag}>
                        <Text style={styles.dueDateText}>
                          {t.due}: {item.dueDate}
                        </Text>
                      </View>
                      <Text style={styles.cardTitle}>{item.subject}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  <RadioButton.Group
                    onValueChange={(value) =>
                      this.updateHomeworkStatus(item.id, value)
                    }
                    value={item.status}
                  >
                    <View style={styles.radioGroup}>
                      {radioOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.radioOption,
                            item.status === opt.value && {
                              borderColor: opt.color,
                              backgroundColor: `${opt.color}22`,
                            },
                          ]}
                          onPress={() =>
                            this.updateHomeworkStatus(item.id, opt.value)
                          }
                        >
                          <RadioButton value={opt.value} color={opt.color} />
                          <Text
                            style={[
                              styles.radioLabel,
                              item.status === opt.value && { color: opt.color },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </RadioButton.Group>
                </LinearGradient>
              </SwipeableRow>
            )}
            ListFooterComponent={
              <TouchableOpacity
                onPress={() => this.setState({ visible: true })}
              >
                <LinearGradient
                  colors={["#FF6B35", "#CC5520"]}
                  style={styles.addHomeworkButton}
                >
                  <Text style={styles.addHomeworkText}>{t.addHomework}</Text>
                </LinearGradient>
              </TouchableOpacity>
            }
          />
        </ScrollView>

        <Modal visible={this.state.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.card}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.newHomework}</Text>
                <TouchableOpacity
                  onPress={() => this.setState({ visible: false })}
                >
                  <Image
                    style={styles.noLogo}
                    source={require("../Close.png")}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.topview}>
                <TouchableOpacity
                  style={styles.duedatebutton}
                  onPress={() =>
                    this.setState({ showCalendar: !this.state.showCalendar })
                  }
                >
                  <Text style={styles.duedateLabel}>
                    {this.state.dueDate
                      ? `${t.due}: ${this.state.dueDate}`
                      : t.selectDueDate}
                  </Text>
                </TouchableOpacity>
              </View>

              {this.state.showCalendar && (
                <View style={styles.calendarContainer}>
                  <Calendar
                    onDayPress={(day) =>
                      this.setState({
                        dueDate: day.dateString,
                        showCalendar: false,
                      })
                    }
                    theme={{
                      calendarBackground: "#2B2930",
                      textSectionTitleColor: "#FF8C42",
                      dayTextColor: "#E6E0E9",
                      todayTextColor: "#FF8C42",
                      selectedDayBackgroundColor: "#FF6B35",
                      monthTextColor: "#E6E0E9",
                      arrowColor: "#FF6B35",
                    }}
                  />
                </View>
              )}

              <RadioButton.Group
                onValueChange={(value) => this.setState({ clicked: value })}
                value={this.state.clicked}
              >
                <View style={styles.radioGroup}>
                  {radioOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.radioOption,
                        this.state.clicked === opt.value && {
                          borderColor: opt.color,
                          backgroundColor: `${opt.color}22`,
                        },
                      ]}
                      onPress={() => this.setState({ clicked: opt.value })}
                    >
                      <RadioButton value={opt.value} color={opt.color} />
                      <Text
                        style={[
                          styles.radioLabel,
                          this.state.clicked === opt.value && {
                            color: opt.color,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </RadioButton.Group>

              {/* Subject Dropdown */}
              <DropDownPicker
                items={this.state.subjectItems}
                open={this.state.subjectOpen}
                value={this.state.subjectInput}
                setOpen={(open) => this.setState({ subjectOpen: open })}
                setValue={(callback) =>
                  this.setState((state) => ({
                    subjectInput: callback(state.subjectInput),
                  }))
                }
                placeholder={t.subject}
                style={styles.dropdown}
                dropDownContainerStyle={{
                  backgroundColor: "#3E3842",
                  borderColor: "#3E3842",
                }}
                textStyle={{ color: "#E6E0E9" }}
                placeholderStyle={{ color: "#938F99" }}
                zIndex={3000}
                zIndexInverse={1000}
              />

              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={this.state.description}
                onChangeText={(description) => this.setState({ description })}
                placeholder={t.description}
                placeholderTextColor="#938F99"
                multiline
              />

              <TouchableOpacity
                onPress={() => this.handleSaveNote(this.state.clicked)}
              >
                <LinearGradient
                  colors={["#FF6B35", "#CC5520", "#8B3010"]}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveText}>{t.saveHomework}</Text>
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#FF6B35",
    opacity: 0.1,
    bottom: -80,
    left: -100,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FF8C42",
    opacity: 0.1,
    top: 80,
    right: -60,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFB347",
    opacity: 0.1,
    bottom: 400,
    left: 60,
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
  homeworkCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dueDateTag: {
    backgroundColor: "rgba(255, 139, 66, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  dueDateText: { color: "#FFB347", fontSize: 11, fontWeight: "800" },
  cardTitle: { color: "white", fontSize: 22, fontWeight: "700" },
  cardDescription: {
    color: "#CAC4D0",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: Platform.OS === "ios" ? "column" : "row",
    justifyContent: "space-between",
    gap: Platform.OS === "ios" ? 8 : 0,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,107,53,0.15)",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingRight: 10,
    paddingVertical: Platform.OS === "ios" ? 4 : 0,
    gap: 2,
  },
  radioLabel: { color: "#938F99", fontSize: 13, fontWeight: "600" },
  addHomeworkButton: {
    borderRadius: 100,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
  },
  addHomeworkText: { color: "white", fontSize: 18, fontWeight: "700" },
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
  topview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  duedatebutton: {
    flex: 1,
    backgroundColor: "#3E3842",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  duedateLabel: { color: "#E6E0E9", fontSize: 14, fontWeight: "600" },
  noLogo: { width: 30, height: 30, tintColor: "#FF6B35" },
  calendarContainer: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
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
