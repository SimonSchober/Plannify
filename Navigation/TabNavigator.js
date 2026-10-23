import React, { Component } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Dashboard from "../screens/Dashboard";
import Profile from "../screens/Profile";
import Homework from "../screens/Homework";
import Timetable from "../screens/Timetable";
import QROverviewModal from "../screens/QROverviewModal";

const TABS = [
  { key: "Dashboard", icon: "grid", label: "Dashboard" },
  { key: "Timetable", icon: "calendar", label: "Timetable" },
  { key: "Homework", icon: "checkmark-done", label: "Homework" },
  { key: "Profile", icon: "person", label: "Account" },
];

const BAR_PADDING = 8;
const BAR_HEIGHT = 80;

export default class TabNavigator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: "Dashboard",
      tabWidth: 0,
    };
    this.slideX = new Animated.Value(0);
  }

  getIndex = (key) => TABS.findIndex((tab) => tab.key === key);

  onBarLayout = (e) => {
    const barWidth = e.nativeEvent.layout.width;
    const tabWidth = (barWidth - BAR_PADDING * 2) / TABS.length;
    this.setState({ tabWidth });
    this.slideX.setValue(this.getIndex(this.state.activeTab) * tabWidth);
  };

  changeTab = (tab) => {
    if (tab === this.state.activeTab) return;
    this.setState({ activeTab: tab });

    Animated.spring(this.slideX, {
      toValue: this.getIndex(tab) * this.state.tabWidth,
      speed: 16,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  };

  renderScreen(tab = this.state.activeTab) {
    switch (tab) {
      case "Dashboard":
        return <Dashboard changeTab={this.changeTab} />;
      case "Timetable":
        return <Timetable />;
      case "Homework":
        return <Homework />;
      case "Profile":
        return <Profile changeTab={this.changeTab} />;
      default:
        return null;
    }
  }

  render() {
    const { activeTab, tabWidth } = this.state;

    return (
      <View style={styles.container}>
        {this.renderScreen()}
        <QROverviewModal />

        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar} onLayout={this.onBarLayout}>
            {tabWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX: this.slideX }],
                  },
                ]}
              />
            )}

            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tab}
                  onPress={() => this.changeTab(tab.key)}
                >
                  <View style={styles.tabContent}>
                    <Ionicons
                      name={tab.icon}
                      size={24}
                      color={active ? "#fff" : "#8a8a8e"}
                    />
                    <Text
                      style={[styles.tabLabel, active && styles.tabLabelActive]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c2c34",
  },
  tabBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#2c2c34",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#3d3d45",
    borderRadius: 35,
    padding: BAR_PADDING,
    height: BAR_HEIGHT,
    alignItems: "center",
    bottom: 30,
  },
  indicator: {
    position: "absolute",
    left: BAR_PADDING,
    top: BAR_PADDING,
    height: BAR_HEIGHT - BAR_PADDING * 2,
    borderRadius: 28,
    backgroundColor: "#6b5744",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
  },
  tabContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: "#8a8a8e",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#fff",
  },
});
