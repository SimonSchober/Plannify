import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  DeviceEventEmitter,
  Dimensions,
} from "react-native";
import * as Font from "expo-font";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { LanguageContext } from "../LanguageContext";

const OPEN_EVENT = "plannify.openOverview";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const buildOverviewLink = (uid) =>
  Linking.createURL("overview", { queryParams: { uid } });

export const extractUid = (data) => {
  if (!data) return null;
  const text = String(data).trim();

  if (!text.includes("://")) {
    return /^[A-Za-z0-9]{20,40}$/.test(text) ? text : null;
  }

  try {
    const { queryParams } = Linking.parse(text);
    const uid = queryParams?.uid;
    return typeof uid === "string" && /^[A-Za-z0-9]{20,40}$/.test(uid)
      ? uid
      : null;
  } catch (error) {
    return null;
  }
};

export const openOverview = (uid) => {
  DeviceEventEmitter.emit(OPEN_EVENT, uid);
};

export default function QROverviewModal() {
  const { t = {}, language = "en" } = useContext(LanguageContext) || {};
  const [fontsLoaded] = Font.useFonts({
    font: require("./Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
  });

  const [authUser, setAuthUser] = useState(null);
  const [requestedUid, setRequestedUid] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setAuthUser(user));
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    Linking.getInitialURL().then((url) => {
      const uid = extractUid(url);
      if (mounted && uid) setRequestedUid(uid);
    });

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      const uid = extractUid(url);
      if (uid) setRequestedUid(uid);
    });

    const eventSub = DeviceEventEmitter.addListener(OPEN_EVENT, (value) => {
      const uid = extractUid(value);
      if (uid) setRequestedUid(uid);
    });

    return () => {
      mounted = false;
      linkSub.remove();
      eventSub.remove();
    };
  }, []);

  const load = useCallback(
    async (uid) => {
      setVisible(true);
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const [userSnap, timetableSnap] = await Promise.all([
          getDoc(doc(db, "Users", uid)),
          getDoc(doc(db, "Timetable", uid)),
        ]);

        if (!userSnap.exists()) {
          setError(t.profileNotFound || "Profile not found.");
          return;
        }

        const user = userSnap.data();
        setData({
          profile: {
            name: user.name || "",
            username: user.username || "",
            school: user.school || "",
          },
          subjects: timetableSnap.exists()
            ? timetableSnap.data().subjects || []
            : [],
        });
      } catch (err) {
        console.error("Could not load overview", err);
        setError(
          err?.code === "permission-denied"
            ? t.noPermission || "You don't have permission to view this profile."
            : err?.message || "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (requestedUid && authUser) load(requestedUid);
  }, [requestedUid, authUser]);

  const close = () => {
    setVisible(false);
    setRequestedUid(null);
    setData(null);
    setError(null);
  };

  if (!fontsLoaded) return null;

  const todayIndex = (new Date().getDay() + 6) % 7;
  const today = DAYS[todayIndex];
  const todayLabel = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    weekday: "long",
  }).format(new Date());
  const todaysSubjects = data
    ? data.subjects
        .filter((subject) => subject.day === today)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t.overviewTitle || "Overview"}
            </Text>
            <Pressable onPress={close} hitSlop={12}>
              <Ionicons name="close" size={26} color="#FF6B35" />
            </Pressable>
          </View>

          {loading && (
            <ActivityIndicator
              color="#FF8C42"
              size="large"
              style={styles.loader}
            />
          )}

          {!loading && error && <Text style={styles.errorText}>{error}</Text>}

          {!loading && data && (
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.profileBox}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(data.profile.name || data.profile.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{data.profile.name}</Text>
                  {!!data.profile.username && (
                    <Text style={styles.profileMeta}>
                      @{data.profile.username}
                    </Text>
                  )}
                  {!!data.profile.school && (
                    <Text style={styles.profileMeta}>{data.profile.school}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                {t.todaysClasses || t.timetable || "Today's classes"}
              </Text>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{todayLabel}</Text>
              </View>
              {todaysSubjects.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t.noClasses || "No classes scheduled for today."}
                </Text>
              ) : (
                todaysSubjects.map((item, index) => (
                  <View key={item.id || `${item.subject}-${index}`} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.subject}</Text>
                      {!!item.teacher && (
                        <Text style={styles.rowMeta}>{item.teacher}</Text>
                      )}
                    </View>
                    <View style={styles.timeTag}>
                      <Text style={styles.timeText}>
                        {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "92%",
    maxHeight: "80%",
    backgroundColor: "#2B2930",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 53, 0.35)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E6E0E9",
    fontFamily: "font",
  },
  loader: {
    marginVertical: 30,
  },
  errorText: {
    color: "#FF5A4F",
    fontSize: 15,
    textAlign: "center",
    marginVertical: 20,
    fontFamily: "font",
  },
  scroll: {
    flexGrow: 0,
    maxHeight: Dimensions.get("window").height * 0.5,
  },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(62, 56, 66, 0.45)",
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "font",
  },
  profileName: {
    color: "#E6E0E9",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "font",
  },
  profileMeta: {
    color: "#CAC4D0",
    fontSize: 14,
    marginTop: 2,
    fontFamily: "font",
  },
  sectionTitle: {
    color: "#FF8C42",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
    fontFamily: "font",
  },
  emptyText: {
    color: "#938F99",
    fontSize: 14,
    fontFamily: "font",
  },
  dayBadge: {
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  dayBadgeText: {
    color: "#FF8C42",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: "font",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  rowTitle: {
    color: "#E6E0E9",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "font",
  },
  rowMeta: {
    color: "#CAC4D0",
    fontSize: 13,
    marginTop: 1,
    fontFamily: "font",
  },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timeText: {
    color: "#E6E0E9",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "font",
  },
});
