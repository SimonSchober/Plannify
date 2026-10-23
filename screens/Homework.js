import React, { Component } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  TextInput,
  Platform,
  FlatList,
  Alert,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebaseConfig";
import { RadioButton } from "react-native-paper";
import DropDownPicker from "react-native-dropdown-picker";
import { LanguageContext } from "../LanguageContext";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let customFonts = {
  font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};

const playedAnimations = new Set();

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

function AnimatedItem({ children, index = 0, id }) {
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

  const remove = () => {
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(collapse);
  };

  const removeRef = React.useRef(remove);
  removeRef.current = remove;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -screenWidth * 0.6) {
          removeRef.current();
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
        {typeof children === "function" ? children({ remove }) : children}
      </Animated.View>
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
      clicked: "not started",
      toastText: "",
      subjectOpen: false,
      subjectItems: [],
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
    this.fetchHomeworks();
    this.fetchSubjectItems();
  }

  componentWillUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  openModal = () => {
    this.modalAnim.setValue(0);
    this.setState({ visible: true }, () => {
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
        subjectOpen: false,
        showCalendar: false,
        ...(reset
          ? {
              subjectInput: null,
              description: "",
              dueDate: null,
              clicked: "not started",
            }
          : {}),
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

  fetchSubjectItems = async () => {
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;
      const docRef = doc(db, "Timetable", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({ subjectItems: data.subjects || [] });
      } else {
        console.log("No subject item found.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  fetchHomeworks = async () => {
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;
      const docRef = doc(db, "Homework", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.setState({ homeworks: data.homeworks || [] });
      } else {
        console.log("No homework found.");
      }
    } catch (error) {
      console.error("Error no homework found", error);
    }
  };

  handleSaveNote = async (value) => {
    const { t } = this.context;
    if (!this.state.subjectInput) {
      this.shake();
      Alert.alert(t.subjectRequired, t.subjectRequiredMsg);
      return;
    }
    try {
      const uId = auth.currentUser ? auth.currentUser.uid : null;
      if (!uId) return;
      const newHomework = {
        id: Date.now().toString(),
        subject: this.state.subjectInput,
        description: this.state.description,
        dueDate: this.state.dueDate || "No Date",
        status: value,
      };
      const docRef = doc(db, "Homework", uId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const oldData = docSnap.data().homeworks || [];
        await updateDoc(docRef, { homeworks: [...oldData, newHomework] });
      } else {
        await setDoc(docRef, { homeworks: [newHomework] });
      }

      this.closeModal(true);
      this.fetchHomeworks();
      this.showToast(t.homeworkSaved || "Homework saved");
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  deleteHomework = async (id) => {
    const { t } = this.context;
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;
      const updatedHomeworks = this.state.homeworks.filter((h) => h.id !== id);
      const docRef = doc(db, "Homework", uid);
      await updateDoc(docRef, { homeworks: updatedHomeworks });
      this.setState({ homeworks: updatedHomeworks });
      this.showToast(t.homeworkDeleted || "Homework deleted");
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  updateHomeworkStatus = async (id, newStatus) => {
    try {
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) return;
      const docRef = doc(db, "Homework", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const fetchedHomework = docSnap.data().homeworks || [];
        const updatedHomeworks = fetchedHomework.map((hw) =>
          hw.id === id ? { ...hw, status: newStatus } : hw,
        );
        await updateDoc(docRef, { homeworks: updatedHomeworks });
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
      { value: "not started", label: t.notStarted, color: "#ff241c" },
      { value: "in progress", label: t.inProgress, color: "#FFB347" },
      { value: "done", label: t.done, color: "#4CAF50" },
    ];

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
          {t.homework}
        </Text>
        <Text style={styles.subtitle}>{t.trackTasks}</Text>

        <FlatList
          data={sortedHomeworks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <AnimatedItem id={`homework-${item.id}`} index={index}>
              <SwipeableRow onDelete={() => this.deleteHomework(item.id)}>
                {({ remove }) => (
                  <LinearGradient
                    colors={[
                      "rgba(43, 41, 48, 0.88)",
                      "rgba(62, 56, 66, 0.88)",
                    ]}
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

                      <PressableScale
                        onPress={remove}
                        scaleTo={0.8}
                        hitSlop={12}
                      >
                        <Image
                          style={styles.noLogo}
                          source={require("../Close.png")}
                        />
                      </PressableScale>
                    </View>

                    <Text style={styles.cardDescription}>
                      {item.description || item.descriptionds}
                    </Text>

                    <RadioButton.Group
                      onValueChange={(value) =>
                        this.updateHomeworkStatus(item.id, value)
                      }
                      value={item.status}
                    >
                      <View style={styles.radioGroup}>
                        {radioOptions.map((opt) => (
                          <PressableScale
                            key={opt.value}
                            scaleTo={0.96}
                            style={[
                              styles.radioOption,
                              item.status === opt.value && {
                                borderColor: opt.color,
                                backgroundColor: `${opt.color}25`,
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
                                item.status === opt.value && {
                                  color: opt.color,
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </PressableScale>
                        ))}
                      </View>
                    </RadioButton.Group>
                  </LinearGradient>
                )}
              </SwipeableRow>
            </AnimatedItem>
          )}
          ListFooterComponent={
            <PressableScale
              style={styles.actionButton}
              scaleTo={0.97}
              onPress={this.openModal}
            >
              <Text style={styles.actionButtonText}>{t.addHomework}</Text>
            </PressableScale>
          }
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
                <Text style={styles.modalTitle}>{t.newHomework}</Text>
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

              <View style={styles.topview}>
                <PressableScale
                  containerStyle={{ flex: 1 }}
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
                </PressableScale>
              </View>

              {this.state.showCalendar && (
                <AnimatedItem id="homework-calendar">
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
                        textDayFontFamily: "font",
                        textMonthFontFamily: "font",
                        textDayHeaderFontFamily: "font",
                      }}
                    />
                  </View>
                </AnimatedItem>
              )}

              <RadioButton.Group
                onValueChange={(value) => this.setState({ clicked: value })}
                value={this.state.clicked}
              >
                <View style={styles.radioGroup}>
                  {radioOptions.map((opt) => (
                    <PressableScale
                      key={opt.value}
                      scaleTo={0.96}
                      style={[
                        styles.radioOption,
                        this.state.clicked === opt.value && {
                          borderColor: opt.color,
                          backgroundColor: `${opt.color}25`,
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
                    </PressableScale>
                  ))}
                </View>
              </RadioButton.Group>

              {/* Subject Dropdown */}
              <DropDownPicker
                items={this.state.subjectItems.map((s) => ({
                  label: s.subject || "Unknown Subject",
                  value: s.subject || "Unknown",
                }))}
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
                textStyle={{
                  color: "#E6E0E9",
                  fontFamily: "font",
                  fontSize: 15,
                }}
                placeholderStyle={{
                  color: "#938F99",
                  fontFamily: "font",
                  fontSize: 15,
                }}
                zIndex={3000}
                zIndexInverse={1000}
              />

              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: "top" }]}
                value={this.state.description}
                onChangeText={(description) => this.setState({ description })}
                placeholder={t.description}
                placeholderTextColor="#938F99"
                multiline
              />

              <PressableScale
                style={styles.actionButton}
                scaleTo={0.97}
                onPress={() => this.handleSaveNote(this.state.clicked)}
              >
                <Text style={styles.actionButtonText}>{t.saveHomework}</Text>
              </PressableScale>
            </Animated.View>
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
    fontFamily: "font",
  },
  subtitle: {
    fontSize: 16,
    color: "#CAC4D0",
    alignSelf: "center",
    marginBottom: 24,
    fontFamily: "font",
  },
  homeworkCard: {
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
    marginBottom: 8,
  },
  dueDateTag: {
    backgroundColor: "rgba(255, 139, 66, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  dueDateText: {
    color: "#FFB347",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "font",
  },
  cardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "font",
  },
  cardDescription: {
    color: "#CAC4D0",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    fontFamily: "font",
  },
  radioGroup: {
    flexDirection: Platform.OS === "ios" ? "column" : "row",
    justifyContent: "space-between",
    gap: Platform.OS === "ios" ? 6 : 0,
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,107,53,0.15)",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingRight: 8,
    paddingVertical: Platform.OS === "ios" ? 2 : 0,
    gap: 2,
  },
  radioLabel: {
    color: "#938F99",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "font",
  },
  actionButton: {
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
  actionButtonText: {
    color: "#FF8C42",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "font",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#2B2930",
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
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
  topview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  duedatebutton: {
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  duedateLabel: {
    color: "#E6E0E9",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "font",
  },
  noLogo: { width: 26, height: 26, tintColor: "#FF6B35" },
  calendarContainer: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  dropdown: {
    backgroundColor: "#3E3842",
    borderColor: "#3E3842",
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
