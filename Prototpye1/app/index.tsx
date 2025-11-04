import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Button,
  Dimensions,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [today, setToday] = useState(new Date());
  const scrollRef = useRef<ScrollView>(null);

  const [showHighPriority, setShowHighPriority] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);

  // Layout constants
  const rowHeight = 80;
  const sidebarWidth = 50;
  const screenWidth = Dimensions.get("window").width;
  const columnWidth = Math.max((screenWidth - sidebarWidth) / 7, 56);
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  // Week calculation
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
    const t = setTimeout(() => {
      updateToday();
      const interval = setInterval(updateToday, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilMidnight);
    return () => clearTimeout(t);
  }, []);

  // Colors
  const priorityColor = (p: string) =>
    p === "high" ? "#ef4444" : p === "medium" ? "#f59e0b" : "#10b981";

  // Scroll to current hour on load
  useEffect(() => {
    const now = new Date();
    const y = Math.max(0, (now.getHours() - 8) * rowHeight - 40);
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  // Overlap detection
  const isOverlap = (a: Event, b: Event) => {
    if (a.date !== b.date) return false;
    const toNum = (t: string) => parseInt(t.replace(":", ""), 10);
    return toNum(a.startTime) < toNum(b.endTime) && toNum(b.startTime) < toNum(a.endTime);
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

  const conflictEvents = events.filter((e) => conflicts[e.id]);

  // Add/edit/delete
  const saveEvent = () => {
    if (!title.trim()) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (sh > eh || (sh === eh && sm >= em)) {
      alert("End time must be after start time");
      return;
    }

    if (editingEventId) {
      // Edit existing
      setEvents((s) =>
        s.map((e) =>
          e.id === editingEventId
            ? { ...e, title, date: date.toISOString().split("T")[0], startTime, endTime, priority }
            : e
        )
      );
    } else {
      // Add new
      setEvents((s) => [
        ...s,
        {
          id: Date.now().toString(),
          title,
          date: date.toISOString().split("T")[0],
          startTime,
          endTime,
          priority,
        },
      ]);
    }

    setModalVisible(false);
    setEditingEventId(null);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setPriority("medium");
    setDate(new Date());
  };

  const deleteEvent = (id: string) => setEvents((s) => s.filter((e) => e.id !== id));

  const openEditModal = (event: Event) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setDate(new Date(event.date));
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setPriority(event.priority);
    setModalVisible(true);
  };

  // Layout helpers
  const getTop = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h - 8) * rowHeight + (m / 60) * rowHeight;
  };
  const getHeight = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return (eh + em / 60 - sh - sm / 60) * rowHeight;
  };

  // Side-by-side layout for overlaps
  const eventsWithLayout: EventLayout[] = useMemo(() => {
    const out: EventLayout[] = [];
    for (const dayDate of weekDates) {
      const dayKey = dayDate.toISOString().split("T")[0];
      const dayEvents = events.filter((e) => e.date === dayKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
      const columns: Event[][] = [];
      dayEvents.forEach((ev) => {
        let placed = false;
        for (const col of columns) {
          if (!col.some((c) => isOverlap(c, ev))) {
            col.push(ev);
            placed = true;
            break;
          }
        }
        if (!placed) columns.push([ev]);
      });
      columns.forEach((col, colIndex) => {
        col.forEach((ev) => {
          const totalSlots = columns.length;
          const leftOffset = colIndex / totalSlots;
          const widthFraction = 1 / totalSlots;
          out.push({ ...ev, leftOffset, widthFraction, slotIndex: colIndex, totalSlots });
        });
      });
    }
    return out;
  }, [events, weekDates]);

  const now = new Date();
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60 - 8) * rowHeight;

  return (
    <View style={styles.container}>
      {/* Title bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <Text style={styles.titleText}>Weekly Calendar</Text>
          <TouchableOpacity
            onPress={() => scrollRef.current?.scrollTo({ y: currentTimeTop, animated: true })}
            style={styles.nowButton}
          >
            <Text style={styles.nowText}>Now</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "column" }}>
            {/* Day headers */}
            <View style={{ flexDirection: "row" }}>
              {/* Spacer for time sidebar */}
              <View style={{ width: sidebarWidth, backgroundColor: "#f1f5f9" }} />
              {weekDates.map((d, i) => {
                const isToday = d.toISOString().split("T")[0] === today.toISOString().split("T")[0];
                return (
                  <View
                    key={i}
                    style={{
                      width: columnWidth,
                      padding: 6,
                      backgroundColor: isToday ? "#dbeafe" : "#f8fafc",
                      borderBottomWidth: 1,
                      borderColor: "#e2e8f0",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "bold", color: isToday ? "#1d4ed8" : "#1e293b" }}>
                      {d.getDate()} {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Hour grid */}
            <View style={{ flexDirection: "row" }}>
              {/* Time sidebar */}
              <View style={{ width: sidebarWidth }}>
                {hours.map((h) => (
                  <View key={h} style={{ height: rowHeight, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#475569" }}>{`${h}:00`}</Text>
                  </View>
                ))}
              </View>

              {/* Grid cells */}
              <View style={{ position: "relative" }}>
                {hours.map((h) => (
                  <View key={h} style={{ flexDirection: "row", borderTopWidth: 1, borderColor: "#e2e8f0", height: rowHeight }}>
                    {weekDates.map((_, i) => (
                      <View key={i} style={{ width: columnWidth, borderLeftWidth: 1, borderColor: "#e2e8f0" }} />
                    ))}
                  </View>
                ))}

                {/* Events */}
                {eventsWithLayout.map((event) => {
                  const dayIndex = weekDates.findIndex(d => d.toISOString().split("T")[0] === event.date);
                  if (dayIndex === -1) return null;

                  return (
                    <TouchableOpacity
                      key={event.id}
                      onPress={() => openEditModal(event)}
                      style={{
                        position: "absolute",
                        top: getTop(event.startTime),
                        left: dayIndex * columnWidth + event.leftOffset * columnWidth,
                        width: event.widthFraction * columnWidth - 2,
                        height: getHeight(event.startTime, event.endTime),
                        backgroundColor: priorityColor(event.priority),
                        borderRadius: 6,
                        padding: 4,
                        opacity: 0.9,
                      }}
                    >
                      <Text
                        style={{ color: "#fff", fontWeight: "bold" }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {event.title}
                      </Text>
                      <Text style={{ color: "#fff", fontSize: 10 }}>{event.startTime}-{event.endTime}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* High Priority */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowHighPriority(s => !s)}>
          <Text style={styles.sectionTitle}>🔥 High Priority</Text>
          <Feather name={showHighPriority ? "chevron-down" : "chevron-right"} size={18} color="#1e293b" />
        </TouchableOpacity>
        {showHighPriority && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {events.filter(e => e.priority === "high").length === 0 ? (
              <Text style={{ color: "#64748b", paddingHorizontal: 8 }}>No high-priority events</Text>
            ) : (
              events.filter(e => e.priority === "high")
                .sort((a,b) => a.startTime.localeCompare(b.startTime))
                .map(e => (
                  <View key={e.id} style={[styles.priorityCard, { backgroundColor: "#ef4444" }]}>
                    <Text style={styles.cardTitle}>{e.title}</Text>
                    <Text style={styles.cardSubtitle}>{e.date} — {e.startTime} to {e.endTime}</Text>
                  </View>
                ))
            )}
          </ScrollView>
        )}

        {/* Conflicts */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowConflicts(s => !s)}>
          <Text style={styles.sectionTitle}>⚠️ Time Conflicts</Text>
          <Feather name={showConflicts ? "chevron-down" : "chevron-right"} size={18} color="#1e293b" />
        </TouchableOpacity>
        {showConflicts && (
          conflictEvents.length === 0 ? (
            <Text style={{ color: "#475569", marginVertical: 8 }}>No conflicts detected 🎉</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {conflictEvents.map(e => (
                <View key={e.id} style={[styles.priorityCard, { backgroundColor: "#facc15" }]}>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text style={styles.cardSubtitle}>{e.date} — {e.startTime} to {e.endTime}</Text>
                </View>
              ))}
            </ScrollView>
          )
        )}
      </View>

      {/* Add/Edit Event Modal */}
      {modalVisible && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingEventId ? "Edit Event" : "Add Event"}</Text>

            <TextInput
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <Text style={{ fontWeight: "bold" }}>Select Date:</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={date.toISOString().split("T")[0]}
                onChange={(e: any) => setDate(new Date(e.target.value))}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 6,
                  marginBottom: 6,
                  width: "100%",
                  fontFamily: "sans-serif",
                  fontSize: 16,
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                <Text>{date.toDateString()}</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(e, selected) => {
                  setShowDatePicker(false);
                  if (selected) setDate(selected);
                }}
              />
            )}

            <TextInput
              placeholder="Start Time (HH:MM)"
              value={startTime}
              onChangeText={setStartTime}
              style={styles.input}
            />
            <TextInput
              placeholder="End Time (HH:MM)"
              value={endTime}
              onChangeText={setEndTime}
              style={styles.input}
            />

            <Text style={{ fontWeight: "bold" }}>Priority:</Text>
            <View style={{ flexDirection: "row", marginVertical: 8 }}>
              {(["high", "medium", "low"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={{
                    backgroundColor: priority === p ? priorityColor(p) : "#e2e8f0",
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: priority === p ? "#fff" : "#000" }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={editingEventId ? "Save Changes" : "Add Event"}
              onPress={saveEvent}
            />
            {editingEventId && (
              <>
                <View style={{ height: 8 }} />
                <Button
                  title="Delete Event"
                  color="#ef4444"
                  onPress={() => {
                    if (editingEventId) deleteEvent(editingEventId);
                    setEditingEventId(null);
                    setModalVisible(false);
                  }}
                />
              </>
            )}
            <View style={{ height: 8 }} />
            <Button
              title="Cancel"
              color="#999"
              onPress={() => {
                setModalVisible(false);
                setEditingEventId(null);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 8 : 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: "#2563eb",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  titleText: { color: "#fff", fontSize: 18, fontWeight: "bold", flexShrink: 1, marginRight: 6 },
  nowButton: { backgroundColor: "#1d4ed8", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  nowText: { color: "#fff", fontWeight: "bold" },
  addButton: { backgroundColor: "#fff", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addButtonText: { color: "#2563eb", fontWeight: "bold" },
  bottomSection: { padding: 12, backgroundColor: "#f1f5f9" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 6 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, color: "#1e293b" },
  priorityCard: { padding: 8, borderRadius: 8, marginRight: 8, minWidth: 120 },
  cardTitle: { fontWeight: "bold", color: "#1e293b" },
  cardSubtitle: { fontSize: 12, color: "#1e293b" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000088", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 16, borderRadius: 12, width: "90%", maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 8, marginVertical: 6 },
});

































