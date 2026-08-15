import React, { Component } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Dashboard from "../screens/Dashboard";
import Profile from "../screens/Profile";
import Homework from "../screens/Homework";
import Timetable from "../screens/Timetable";

export default class TabNavigator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: "Dashboard",
    };
  }

  renderScreen() {
    if (this.state.activeTab === "Dashboard") {
      return (
        <Dashboard changeTab={(tab) => this.setState({ activeTab: tab })} />
      );
    } else if (this.state.activeTab === "Timetable") {
      return <Timetable />;
    } else if (this.state.activeTab === "Homework") {
      return <Homework />;
    } else if (this.state.activeTab === "Profile") {
      return <Profile />;
    }
  }

  render() {
    const { activeTab } = this.state;

    return (
      <View style={styles.container}>
        {this.renderScreen()}

        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "Dashboard" && styles.tabActive,
              ]}
              onPress={() => this.setState({ activeTab: "Dashboard" })}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name="grid"
                  size={24}
                  color={activeTab === "Dashboard" ? "#fff" : "#8a8a8e"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === "Dashboard" && styles.tabLabelActive,
                  ]}
                >
                  Dashboard
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "Timetable" && styles.tabActive,
              ]}
              onPress={() => this.setState({ activeTab: "Timetable" })}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name="calendar"
                  size={24}
                  color={activeTab === "Timetable" ? "#fff" : "#8a8a8e"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === "Timetable" && styles.tabLabelActive,
                  ]}
                >
                  Timetable
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "Homework" && styles.tabActive]}
              onPress={() => this.setState({ activeTab: "Homework" })}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name="checkmark-done"
                  size={24}
                  color={activeTab === "Homework" ? "#fff" : "#8a8a8e"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === "Homework" && styles.tabLabelActive,
                  ]}
                >
                  Homework
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "Profile" && styles.tabActive]}
              onPress={() => this.setState({ activeTab: "Profile" })}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name="person"
                  size={24}
                  color={activeTab === "Profile" ? "#fff" : "#8a8a8e"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === "Profile" && styles.tabLabelActive,
                  ]}
                >
                  Account
                </Text>
              </View>
            </TouchableOpacity>
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
    padding: 8,
    height: 80,
    alignItems: "center",
    bottom: 30,
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
  tabActive: {
    backgroundColor: "#6b5744",
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
