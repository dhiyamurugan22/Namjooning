import { useEffect, useRef, useState } from "react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import {
  auth,
  db,
  googleProvider,
} from "./firebase/firebase";

import {
  Calendar,
  dateFnsLocalizer,
} from "react-big-calendar";

import {
  format,
  parse,
  startOfWeek,
  getDay,
} from "date-fns";

import { enUS } from "date-fns/locale";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./App.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function App() {
  // =========================
  // AUTH STATE
  // =========================

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // =========================
  // TASK STATE
  // =========================

  const [tasks, setTasks] = useState([]);

  const [taskTitle, setTaskTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  // NEW: START + END TIME
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [editingId, setEditingId] = useState(null);

  // =========================
  // UI STATE
  // =========================

  const [tasksLoading, setTasksLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [deleteTask, setDeleteTask] = useState(null);

  const [selectedCategory, setSelectedCategory] =
    useState("All Categories");

  // =========================
  // CALENDAR STATE
  // =========================

  const [calendarDate, setCalendarDate] =
    useState(new Date());

  const [calendarView, setCalendarView] =
    useState("month");

  // =========================
  // REF
  // =========================

  const taskInputRef = useRef(null);

  // =========================
  // AUTH LISTENER
  // =========================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================
  // FETCH TASKS
  // =========================

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    setTasksLoading(true);
    setErrorMessage("");

    try {
      const tasksRef = collection(
        db,
        "users",
        user.uid,
        "tasks"
      );

      const snapshot = await getDocs(tasksRef);

      const taskList = snapshot.docs.map(
        (taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        })
      );

      setTasks(taskList);
    } catch (error) {
      console.error(
        "Error fetching tasks:",
        error
      );

      setErrorMessage(
        "Unable to load your tasks. Please try again."
      );
    } finally {
      setTasksLoading(false);
    }
  };

  // =========================
  // TOAST
  // =========================

  const showToast = (
    message,
    type = "success"
  ) => {
    setToast({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: "",
        type: "success",
      });
    }, 3000);
  };

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async () => {
    setErrorMessage("");

    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      if (
        error.code !==
        "auth/popup-closed-by-user"
      ) {
        setErrorMessage(
          "Unable to sign in. Please try again."
        );
      }
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      showToast(
        "Signed out successfully."
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setErrorMessage(
        "Unable to sign out. Please try again."
      );
    }
  };

  // =========================
  // SUBMIT TASK
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // -------------------------
    // TASK TITLE VALIDATION
    // -------------------------

    if (!taskTitle.trim()) {
      setErrorMessage(
        "Please enter a task title."
      );

      taskInputRef.current?.focus();

      return;
    }

    // -------------------------
    // TIME VALIDATION
    // -------------------------

    if (
      startTime &&
      endTime &&
      endTime <= startTime
    ) {
      setErrorMessage(
        "End time must be after start time."
      );

      return;
    }

    const finalCategory =
      category.trim() || "Uncategorized";

    setSaving(true);
    setErrorMessage("");

    try {
      // =========================
      // UPDATE EXISTING TASK
      // =========================

      if (editingId) {
        const existingTask =
          tasks.find(
            (task) =>
              task.id === editingId
          );

        const taskRef = doc(
          db,
          "users",
          user.uid,
          "tasks",
          editingId
        );

        const updatedTaskData = {
          title: taskTitle.trim(),
          category: finalCategory,

          completed:
            existingTask?.completed ||
            false,

          dueDate: dueDate || "",

          // NEW
          startTime: startTime || "",
          endTime: endTime || "",

          // Keep old dueTime field for
          // compatibility with old tasks.
          dueTime:
            startTime ||
            existingTask?.dueTime ||
            "",
        };

        await updateDoc(
          taskRef,
          updatedTaskData
        );

        setTasks((previousTasks) =>
          previousTasks.map((task) =>
            task.id === editingId
              ? {
                ...task,
                ...updatedTaskData,
              }
              : task
          )
        );

        showToast(
          "Task updated successfully."
        );
      }

      // =========================
      // CREATE NEW TASK
      // =========================

      else {
        const tasksRef = collection(
          db,
          "users",
          user.uid,
          "tasks"
        );

        const newTaskData = {
          title: taskTitle.trim(),
          category: finalCategory,

          completed: false,

          dueDate: dueDate || "",

          // NEW
          startTime: startTime || "",
          endTime: endTime || "",

          // Keep dueTime so existing
          // app logic/data remains compatible.
          dueTime: startTime || "",
        };

        const newTask =
          await addDoc(
            tasksRef,
            newTaskData
          );

        setTasks((previousTasks) => [
          ...previousTasks,
          {
            id: newTask.id,
            ...newTaskData,
          },
        ]);

        showToast(
          "Task added successfully."
        );
      }

      // =========================
      // CLEAR FORM
      // =========================

      setEditingId(null);
      setTaskTitle("");
      setCategory("");
      setDueDate("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      console.error(
        "Error saving task:",
        error
      );

      setErrorMessage(
        "Unable to save the task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EDIT TASK
  // =========================

  const handleEdit = (task) => {
    setEditingId(task.id);

    setTaskTitle(
      task.title || ""
    );

    setCategory(
      task.category ||
      "Uncategorized"
    );

    setDueDate(
      task.dueDate || ""
    );

    // NEW
    // For old tasks, use dueTime as
    // the start time.
    setStartTime(
      task.startTime ||
      task.dueTime ||
      ""
    );

    setEndTime(
      task.endTime || ""
    );

    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(() => {
      taskInputRef.current?.focus();
    }, 400);
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async () => {
    if (!deleteTask) return;

    setDeletingId(deleteTask.id);
    setErrorMessage("");

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        deleteTask.id
      );

      await deleteDoc(taskRef);

      setTasks((previousTasks) =>
        previousTasks.filter(
          (task) =>
            task.id !== deleteTask.id
        )
      );

      if (
        editingId === deleteTask.id
      ) {
        handleCancelEdit();
      }

      showToast(
        "Task deleted successfully."
      );

      setDeleteTask(null);
    } catch (error) {
      console.error(
        "Error deleting task:",
        error
      );

      setErrorMessage(
        "Unable to delete the task. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================
  // COMPLETE / UNCOMPLETE
  // =========================

  const handleToggleComplete = async (
    task
  ) => {
    setTogglingId(task.id);
    setErrorMessage("");

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        task.id
      );

      const newCompletedState =
        !task.completed;

      await updateDoc(
        taskRef,
        {
          completed:
            newCompletedState,
        }
      );

      setTasks((previousTasks) =>
        previousTasks.map((item) =>
          item.id === task.id
            ? {
              ...item,
              completed:
                newCompletedState,
            }
            : item
        )
      );

      showToast(
        newCompletedState
          ? "Task completed."
          : "Task marked as incomplete."
      );
    } catch (error) {
      console.error(
        "Error updating task:",
        error
      );

      setErrorMessage(
        "Unable to update the task. Please try again."
      );
    } finally {
      setTogglingId(null);
    }
  };

  // =========================
  // CANCEL EDIT
  // =========================

  const handleCancelEdit = () => {
    setEditingId(null);

    setTaskTitle("");
    setCategory("");
    setDueDate("");

    setStartTime("");
    setEndTime("");

    setErrorMessage("");
  };

  // =========================
  // CATEGORIES
  // =========================

  const categories = [
    ...new Set(
      tasks.map(
        (task) =>
          task.category?.trim() ||
          "Uncategorized"
      )
    ),
  ].sort();

  // =========================
  // FILTER TASKS
  // =========================

  const filteredTasks =
    selectedCategory ===
      "All Categories"
      ? tasks
      : tasks.filter(
        (task) =>
          (task.category?.trim() ||
            "Uncategorized") ===
          selectedCategory
      );

  // =========================
  // GROUP TASKS
  // =========================

  const groupedTasks =
    filteredTasks.reduce(
      (groups, task) => {
        const taskCategory =
          task.category?.trim() ||
          "Uncategorized";

        if (!groups[taskCategory]) {
          groups[taskCategory] = [];
        }

        groups[taskCategory].push(task);

        return groups;
      },
      {}
    );

  // =========================
  // TASK STATISTICS
  // =========================

  const completedTaskCount =
    tasks.filter(
      (task) => task.completed
    ).length;

  const pendingTaskCount =
    tasks.length -
    completedTaskCount;

  // =========================
  // CALENDAR EVENTS
  // =========================

  const calendarEvents = tasks
    .filter(
      (task) => task.dueDate
    )
    .map((task) => {
      const [
        year,
        month,
        day,
      ] = task.dueDate
        .split("-")
        .map(Number);

      // -------------------------
      // START TIME
      // -------------------------

      // New tasks use startTime.
      // Old tasks use dueTime.
      const taskStartTime =
        task.startTime ||
        task.dueTime ||
        "";

      let startHour = 0;
      let startMinute = 0;

      if (taskStartTime) {
        const [
          selectedHour,
          selectedMinute,
        ] = taskStartTime
          .split(":")
          .map(Number);

        startHour = selectedHour;
        startMinute = selectedMinute;
      }

      const start = new Date(
        year,
        month - 1,
        day,
        startHour,
        startMinute
      );

      // -------------------------
      // END TIME
      // -------------------------

      let end;

      if (task.endTime) {
        const [
          endHour,
          endMinute,
        ] = task.endTime
          .split(":")
          .map(Number);

        end = new Date(
          year,
          month - 1,
          day,
          endHour,
          endMinute
        );
      } else {
        // Old tasks don't have endTime.
        // Give them a default duration
        // of 1 hour.
        end = new Date(
          start.getTime() +
          60 * 60 * 1000
        );
      }

      return {
        id: task.id,

        title: task.title,

        start,
        end,

        completed:
          task.completed,

        category:
          task.category ||
          "Uncategorized",
      };
    });

  // =========================
  // CALENDAR NAVIGATION
  // =========================

  const handleCalendarNavigate = (
    newDate
  ) => {
    setCalendarDate(newDate);
  };

  const handleCalendarView = (
    newView
  ) => {
    setCalendarView(newView);
  };

  // =========================
  // CALENDAR EVENT CLICK
  // =========================

  const handleCalendarEventClick = (
    event
  ) => {
    const task = tasks.find(
      (item) =>
        item.id === event.id
    );

    if (task) {
      handleEdit(task);
    }
  };

  // =========================
  // CALENDAR STYLES
  // =========================

  const slotPropGetter = () => {
    return {
      style: {
        backgroundColor:
          "#1f2027",
        color: "white",
        borderTop:
          "1px solid #333",
      },
    };
  };

  const dayPropGetter = () => {
    return {
      style: {
        backgroundColor:
          "#1f2027",
        color: "white",
      },
    };
  };

  const eventPropGetter = (
    event
  ) => {
    return {
      style: {
        backgroundColor:
          event.completed
            ? "#555"
            : "#6c5ce7",

        color: "white",

        border: "none",

        borderRadius: "4px",

        padding: "3px 5px",

        cursor: "pointer",
      },
    };
  };

  // =========================
  // AUTH LOADING SCREEN
  // =========================

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="loading-card">
          <div className="spinner"></div>

          <p>
            Loading your To-Do List...
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // LOGIN PAGE
  // =========================

  if (!user) {
    return (
      <div className="login-page">

        <div className="login-box">

          <div className="login-icon">
            ✓
          </div>

          <h1>
            To-Do List
          </h1>

          <p>
            Organize your tasks,
            stay focused.
          </p>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <button
            className="login-button"
            onClick={handleLogin}
          >
            Sign in with Google
          </button>

        </div>

      </div>
    );
  }

  // =========================
  // MAIN APP
  // =========================

  return (
    <div className="app-container">

      {/* =========================
          TOAST
      ========================= */}

      {toast.show && (
        <div
          className={`toast toast-${toast.type}`}
        >
          <span className="toast-icon">
            {toast.type === "success"
              ? "✓"
              : "!"}
          </span>

          <span>
            {toast.message}
          </span>
        </div>
      )}

      {/* =========================
          HEADER
      ========================= */}

      <header className="app-header">

        <div>
          <h1>
            ✓ To-Do List
          </h1>

          <p>
            Welcome,{" "}
            {user.displayName ||
              user.email}
          </p>
        </div>

        <button
          className="signout-button"
          onClick={handleLogout}
        >
          Sign Out
        </button>

      </header>

      <main>

        {/* =========================
            ERROR MESSAGE
        ========================= */}

        {errorMessage && (
          <div className="global-error">

            <span>⚠</span>

            <span>
              {errorMessage}
            </span>

            <button
              onClick={() =>
                setErrorMessage("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* =========================
            ADD / EDIT TASK
        ========================= */}

        <section className="task-form-section">

          <div className="section-heading">

            <div>

              <span className="section-label">
                {editingId
                  ? "TASK MANAGEMENT"
                  : "GET STARTED"}
              </span>

              <h2>
                {editingId
                  ? "Edit Task"
                  : "Add New Task"}
              </h2>

            </div>

            {editingId && (
              <button
                type="button"
                className="top-cancel-button"
                onClick={
                  handleCancelEdit
                }
              >
                Cancel Edit
              </button>
            )}

          </div>

          <form
            onSubmit={handleSubmit}
            className="task-form"
          >

            {/* =========================
                TASK
            ========================= */}

            <div className="form-field">

              <label>
                Task
                <span className="required">
                  *
                </span>
              </label>

              <input
                ref={taskInputRef}
                type="text"
                placeholder="What needs to be done?"
                value={taskTitle}
                onChange={(event) =>
                  setTaskTitle(
                    event.target.value
                  )
                }
              />

            </div>

            {/* =========================
                CATEGORY
            ========================= */}

            <div className="form-field">

              <label>
                Category
              </label>

              <input
                type="text"
                list="category-options"
                placeholder="e.g. DSA, Java, Personal"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
              />

              <datalist id="category-options">

                {categories.map(
                  (item) => (
                    <option
                      value={item}
                      key={item}
                    />
                  )
                )}

              </datalist>

            </div>

            {/* =========================
                DUE DATE
            ========================= */}

            <div className="form-field">

              <label>
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value
                  )
                }
              />

            </div>

            {/* =========================
                START TIME
            ========================= */}

            <div className="form-field">

              <label>
                Start Time
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) =>
                  setStartTime(
                    event.target.value
                  )
                }
              />

            </div>

            {/* =========================
                END TIME
            ========================= */}

            <div className="form-field">

              <label>
                End Time
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(
                    event.target.value
                  )
                }
              />

            </div>

            {/* =========================
                FORM BUTTONS
            ========================= */}

            <div className="form-buttons">

              <button
                type="submit"
                className="add-button"
                disabled={saving}
              >

                {saving ? (
                  <>
                    <span className="button-spinner"></span>

                    {editingId
                      ? "Updating..."
                      : "Adding..."}
                  </>
                ) : (
                  editingId
                    ? "Update Task"
                    : "Add Task"
                )}

              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    handleCancelEdit
                  }
                  disabled={saving}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>

        </section>

        {/* =========================
            TASKS
        ========================= */}

        <section className="tasks-section">

          <div className="tasks-header">

            <div>

              <span className="section-label">
                YOUR WORK
              </span>

              <h2>
                Tasks
              </h2>

            </div>

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
              disabled={tasksLoading}
            >

              <option>
                All Categories
              </option>

              {categories.map(
                (item) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>

          </div>

          {/* =========================
              TASK SUMMARY
          ========================= */}

          {!tasksLoading &&
            tasks.length > 0 && (
              <div className="task-summary">

                <span>
                  <strong>
                    {tasks.length}
                  </strong>{" "}
                  {tasks.length === 1
                    ? "task"
                    : "tasks"}
                </span>

                <span className="summary-dot">
                  •
                </span>

                <span>
                  <strong>
                    {pendingTaskCount}
                  </strong>{" "}
                  pending
                </span>

                <span className="summary-dot">
                  •
                </span>

                <span>
                  <strong>
                    {completedTaskCount}
                  </strong>{" "}
                  completed
                </span>

              </div>
            )}

          {/* =========================
              LOADING
          ========================= */}

          {tasksLoading ? (

            <div className="empty-state">

              <div className="spinner"></div>

              <h3>
                Loading your tasks...
              </h3>

              <p>
                Just a moment.
              </p>

            </div>

          ) : tasks.length === 0 ? (

            /* =========================
                EMPTY STATE
            ========================= */

            <div className="empty-state">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No tasks yet
              </h3>

              <p>
                Add your first task
                and start organizing
                your day.
              </p>

              <button
                className="empty-action"
                onClick={() => {

                  taskInputRef.current?.focus();

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });

                }}
              >
                + Add Your First Task
              </button>

            </div>

          ) : filteredTasks.length ===
            0 ? (

            /* =========================
                FILTER EMPTY STATE
            ========================= */

            <div className="empty-state">

              <div className="empty-icon">
                📁
              </div>

              <h3>
                No tasks in this category
              </h3>

              <p>
                Try selecting another
                category.
              </p>

              <button
                className="empty-action"
                onClick={() =>
                  setSelectedCategory(
                    "All Categories"
                  )
                }
              >
                View All Tasks
              </button>

            </div>

          ) : (

            /* =========================
                TASK GROUPS
            ========================= */

            <div className="category-list">

              {Object.entries(
                groupedTasks
              ).map(
                ([
                  categoryName,
                  categoryTasks,
                ]) => (

                  <div
                    className="category-section"
                    key={categoryName}
                  >

                    <div className="category-title">

                      <span className="category-icon">
                        📁
                      </span>

                      <h3>
                        {categoryName}
                      </h3>

                      <span className="category-count">
                        {
                          categoryTasks.length
                        }
                      </span>

                    </div>

                    <div className="task-list">

                      {categoryTasks.map(
                        (task) => (

                          <div
                            className={`task-item ${task.completed
                                ? "completed"
                                : ""
                              }`}
                            key={task.id}
                          >

                            <div className="task-left">

                              <input
                                type="checkbox"
                                checked={
                                  task.completed ||
                                  false
                                }
                                disabled={
                                  togglingId ===
                                  task.id
                                }
                                onChange={() =>
                                  handleToggleComplete(
                                    task
                                  )
                                }
                              />

                              <div className="task-info">

                                <h3>
                                  {task.title}
                                </h3>

                                {task.dueDate && (
                                  <p className="due-info">

                                    📅{" "}
                                    {task.dueDate}

                                    {(task.startTime ||
                                      task.dueTime) &&
                                      ` • ${task.startTime ||
                                      task.dueTime
                                      }`}

                                    {task.endTime &&
                                      ` - ${task.endTime}`}

                                  </p>
                                )}

                              </div>

                            </div>

                            <div className="task-actions">

                              <button
                                onClick={() =>
                                  handleEdit(
                                    task
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  task.id ||
                                  togglingId ===
                                  task.id
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  setDeleteTask(
                                    task
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  task.id ||
                                  togglingId ===
                                  task.id
                                }
                              >
                                Delete
                              </button>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* =========================
            CALENDAR
        ========================= */}

        <section className="calendar-section">

          <div className="calendar-heading">

            <div>

              <span className="section-label">
                DEADLINES
              </span>

              <h2>
                Calendar
              </h2>

            </div>

            <p>
              Click a task to edit it.
            </p>

          </div>

          <div className="calendar-container">

            <Calendar
              localizer={localizer}

              events={calendarEvents}

              startAccessor="start"
              endAccessor="end"

              date={calendarDate}

              view={calendarView}

              onNavigate={
                handleCalendarNavigate
              }

              onView={
                handleCalendarView
              }

              onSelectEvent={
                handleCalendarEventClick
              }

              views={[
                "month",
                "week",
                "day",
                "agenda",
              ]}

              popup={true}

              /*
               * NEW:
               * 30-minute time slots.
               */
              step={30}

              timeslots={2}

              slotPropGetter={
                slotPropGetter
              }

              dayPropGetter={
                dayPropGetter
              }

              eventPropGetter={
                eventPropGetter
              }

              style={{
                height: "700px",
              }}
            />

          </div>

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className="app-footer">

        <p>
          Stay organized. Stay focused.
        </p>

        <button
          onClick={handleLogout}
        >
          Sign Out
        </button>

      </footer>

      {/* =========================
          DELETE MODAL
      ========================= */}

      {deleteTask && (

        <div
          className="modal-overlay"
          onClick={() =>
            deletingId === null &&
            setDeleteTask(null)
          }
        >

          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-icon">
              !
            </div>

            <h2>
              Delete Task?
            </h2>

            <p>
              Are you sure you want to
              delete

              <strong>
                {" "}
                "{deleteTask.title}"
              </strong>
              ?
            </p>

            <p className="modal-warning">
              This action cannot be undone.
            </p>

            <div className="modal-actions">

              <button
                className="modal-cancel"
                onClick={() =>
                  setDeleteTask(null)
                }
                disabled={
                  deletingId !== null
                }
              >
                Cancel
              </button>

              <button
                className="modal-delete"
                onClick={handleDelete}
                disabled={
                  deletingId !== null
                }
              >

                {deletingId ? (
                  <>
                    <span className="button-spinner"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete Task"
                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;