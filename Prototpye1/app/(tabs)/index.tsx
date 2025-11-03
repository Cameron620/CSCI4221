import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Button,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  priority: "high" | "medium" | "low";
}

interface EventLayout extends Event {
  leftOffset: number;
  widthFraction: number;
  slotIndex: number;
  totalSlots: number;
}

export default function CalendarScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [today, setToday] = useState(new Date());
  const scrollRef = useRef<ScrollView>(null);

  const rowHeight = 80;
  const sidebarWidth = 50;
  const screenWidth = Dimensions.get("window").width;
  const columnWidth = (screenWidth - sidebarWidth) / 7;
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM–7PM

  // Week dates based on today
  const getWeekDates = (refDate: Date) => {
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - refDate.getDay() + 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const [weekDates, setWeekDates] = useState(getWeekDates(today));

  // Update today at midnight
  useEffect(() => {
    const updateToday = () => {
      const now = new Date();
      setToday(now);
      setWeekDates(getWeekDates(now));
    };

    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();

    const timeout = setTimeout(() => {
      updateToday();
      const interval = setInterval(updateToday, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#3b82f6";
    }
  };

  // Scroll to current hour on mount
  useEffect(() => {
    const now = new Date();
    const y = (now.getHours() - 8) * rowHeight;
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  const isOverlap = (a: Event, b: Event) => {
    if (a.date !== b.date) return false;
    const startA = parseInt(a.startTime.replace(":", ""), 10);
    const endA = parseInt(a.endTime.replace(":", ""), 10);
    const startB = parseInt(b.startTime.replace(":", ""), 10);
    const endB = parseInt(b.endTime.replace(":", ""), 10);
    return startA < endB && startB < endA;
  };

  const conflicts = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (isOverlap(events[i], events[j])) {
          map[events[i].id] = map[events[i].id] ? [...map[events[i].id], events[j].id] : [events[j].id];
          map[events[j].id] = map[events[j].id] ? [...map[events[j].id], events[i].id] : [events[i].id];
        }
      }
    }
    return map;
  }, [events]);

  const addEvent = () => {
    if (!title.trim()) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (sh > eh || (sh === eh && sm >= em)) {
      alert("End time must be after start time");
      return;
    }
    setEvents([
      ...events,
      { 
        id: Date.now().toString(), 
        title, 
        date: date.toISOString().split("T")[0], 
        startTime, 
        endTime, 
        priority 
      }
    ]);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setPriority("medium");
    setDate(new Date());
    setModalVisible(false);
  };

  const deleteEvent = (id: string) => setEvents(events.filter((e) => e.id !== id));

  const getTop = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h - 8) * rowHeight + (m / 60) * rowHeight;
  };

  const getHeight = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return (eh + em / 60 - sh - sm / 60) * rowHeight;
  };

  // Layout overlapping events side-by-side
  const eventsWithLayout: EventLayout[] = useMemo(() => {
    const result: EventLayout[] = [];
    for (const dayDate of weekDates) {
      const dayEvents = events
        .filter((e) => e.date === dayDate.toISOString().split("T")[0])
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const slots: Event[][] = [];
      dayEvents.forEach((event) => {
        let placed = false;
        for (const slot of slots) {
          if (!slot.some((e) => isOverlap(e, event))) {
            slot.push(event);
            placed = true;
            break;
          }
        }
        if (!placed) slots.push([event]);
      });

      slots.forEach((slot) => {
        const totalSlots = slot.length;
        slot.forEach((e, idx) => {
          result.push({ ...e, leftOffset: idx * (1 / totalSlots), widthFraction: 1 / totalSlots, slotIndex: idx, totalSlots });
        });
      });
    }
    return result;
  }, [events, weekDates]);

  const now = new Date();
  const currentTimeTop = ((now.getHours() + now.getMinutes()/60) - 8) * rowHeight;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Weekly Calendar</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Text style={{ color: "#2563eb", fontWeight: "bold" }}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* "Now" Button */}
      <TouchableOpacity
        onPress={() => scrollRef.current?.scrollTo({ y: currentTimeTop, animated: true })}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          backgroundColor: "#2563eb",
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          zIndex: 20,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Now</Text>
      </TouchableOpacity>

      {/* Calendar */}
      <ScrollView style={{ flex: 1 }} ref={scrollRef}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ position: "relative", height: rowHeight * hours.length + rowHeight }}>
            {/* Sticky Day Headers */}
            <View style={{ flexDirection: "row", position: "absolute", top: 0, left: 0, zIndex: 10 }}>
              <View style={{ width: sidebarWidth, height: rowHeight, backgroundColor: "#e0f2fe" }} />
              {weekDates.map((d, i) => {
                const isCurrentDay = d.toDateString() === today.toDateString();
                return (
                  <View key={i} style={[styles.dayHeader, { width: columnWidth, height: rowHeight, backgroundColor: isCurrentDay ? "#dbeafe" : "#e0f2fe" }]}>
                    <Text style={{ fontWeight: "bold", color: "#1e293b" }}>
                      {d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Grid */}
            <View style={{ marginTop: rowHeight, position: "relative" }}>
              {hours.map((hour) => (
                <View key={hour} style={{ flexDirection: "row", height: rowHeight }}>
                  <View style={styles.hourLabel}>
                    <Text style={{ fontSize: 12, color: "#475569" }}>{hour}:00</Text>
                  </View>
                  {weekDates.map((_, dayIndex) => (
                    <View key={dayIndex} style={{ width: columnWidth, borderWidth: 0.5, borderColor: "#e2e8f0" }} />
                  ))}
                </View>
              ))}

              {/* Current Time Indicator */}
              {now >= weekDates[0] && now <= new Date(weekDates[6].getTime() + 24*60*60*1000) && (
                <View style={{
                  position: 'absolute',
                  top: currentTimeTop + rowHeight,
                  left: sidebarWidth,
                  width: columnWidth * 7,
                  height: 2,
                  backgroundColor: 'red'
                }} />
              )}

              {/* Events */}
              {eventsWithLayout.map((e) => {
                const fullTop = getTop(e.startTime);
                const fullHeight = getHeight(e.startTime, e.endTime);
                const height = fullHeight / e.totalSlots;
                const top = fullTop + height * e.slotIndex;
                const left = sidebarWidth + columnWidth * weekDates.findIndex(d => d.toISOString().split("T")[0] === e.date) + e.leftOffset * (columnWidth - 8);
                const width = e.widthFraction * (columnWidth - 8);
                const hasConflict = conflicts[e.id]?.length > 0;
                const borderColor = hasConflict && e.priority === "high" ? "#b91c1c" : hasConflict ? "#facc15" : "transparent";

                return (
                  <View
                    key={e.id}
                    style={{
                      position: "absolute",
                      top: top + rowHeight,
                      left,
                      width,
                      height,
                      marginHorizontal: 2,
                      backgroundColor: priorityColor(e.priority),
                      borderRadius: 10,
                      borderWidth: hasConflict ? 3 : 0,
                      borderColor,
                      padding: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.25,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "#fff", fontWeight: "bold", flex: 1 }}>{hasConflict ? "⚠️ " : ""}{e.title}</Text>
                      <TouchableOpacity onPress={() => deleteEvent(e.id)}>
                        <Feather name="trash-2" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: "#fff", fontSize: 12 }}>{e.startTime} - {e.endTime}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* High-Priority Events at Bottom */}
        <View style={{
          height: 120,
          borderTopWidth: 1,
          borderColor: '#e2e8f0',
          padding: 8,
          backgroundColor: "#f9fafb"
        }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>⚠️ High Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events.filter(e => e.priority === 'high').sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(e => (
              <View key={e.id} style={{
                backgroundColor: "#ef4444",
                borderRadius: 10,
                padding: 10,
                marginRight: 8,
                minWidth: 120,
              }}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>{e.title}</Text>
                <Text style={{ color: "#fff", fontSize: 12 }}>{e.date} — {e.startTime} to {e.endTime}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />

            {/* Date Picker */}
            <View style={{ marginVertical: 8 }}>
              <Text style={{ fontWeight: "bold" }}>Select Date:</Text>

              {Platform.OS === "web" ? (
                <input
                  type="date"
                  value={date.toISOString().split("T")[0]}
                  onChange={(e: any) => setDate(new Date(e.target.value))}
                  style={{ borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 10, padding: 8, borderRadius: 8 }}
                />
              ) : (
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ borderWidth: 1, borderColor: "#cbd5e1", padding: 8, borderRadius: 8, marginBottom: 10 }}>
                  <Text>{date.toDateString()}</Text>
                </TouchableOpacity>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(e, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
            </View>

            <TextInput placeholder="Start Time (HH:MM)" value={startTime} onChangeText={setStartTime} style={styles.input} />
            <TextInput placeholder="End Time (HH:MM)" value={endTime} onChangeText={setEndTime} style={styles.input} />

            <Text style={{ fontWeight: "bold" }}>Priority:</Text>
            <View style={{ flexDirection: "row", marginVertical: 8 }}>
              {["high", "medium", "low"].map((p) => (
                <TouchableOpacity key={p} onPress={() => setPriority(p as any)} style={{ backgroundColor: priority === p ? priorityColor(p) : "#e2e8f0", padding: 8, borderRadius: 8, marginRight: 8 }}>
                  <Text style={{ color: priority === p ? "#fff" : "#000" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Add Event" onPress={addEvent} />
            <Button title="Cancel" color="#999" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBar: { backgroundColor: "#2563eb", padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  addButton: { backgroundColor: "#fff", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  dayHeader: { alignItems: "center", justifyContent: "center", paddingVertical: 6, borderBottomWidth: 1, borderColor: "#cbd5e1" },
  hourLabel: { width: 50, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9", borderRightWidth: 1, borderColor: "#e2e8f0" },
  modalBackdrop: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  modalContent: { margin: 20, backgroundColor: "#fff", padding: 20, borderRadius: 12 },
  modalTitle: { fontWeight: "bold", marginBottom: 10, fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 10, padding: 8, borderRadius: 8 },
});



















