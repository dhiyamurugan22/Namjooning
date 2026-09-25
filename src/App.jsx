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

import {
  Home,
  ListTodo,
  CalendarDays,
  Tags,
  Settings,
  Search,
  Plus,
  LogOut,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Trash2,
  X,
  Menu,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  Check,
  FolderOpen,
  LayoutDashboard,
} from "lucide-react";

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
  // AUTH
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
  const [dueTime, setDueTime] = useState("");

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

  const [searchQuery, setSearchQuery] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeNav, setActiveNav] = useState("dashboard");

  // =========================
  // CALENDAR
  // =========================

  const [calendarDate, setCalendarDate] =
    useState(new Date());

  const [calendarView, setCalendarView] =
    useState("month");

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
      console.error(error);

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
      console.error(error);

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
      console.error(error);

      setErrorMessage(
        "Unable to sign out. Please try again."
      );
    }
  };

  // =========================
  // NAVIGATION
  // =========================

  const scrollToSection = (
    section,
    id
  ) => {
    setActiveNav(section);
    setSidebarOpen(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const focusTaskInput = () => {
    document
      .getElementById("add-task")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

    setTimeout(() => {
      taskInputRef.current?.focus();
    }, 400);
  };

  // =========================
  // SUBMIT TASK
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!taskTitle.trim()) {
      setErrorMessage(
        "Please enter a task title."
      );

      taskInputRef.current?.focus();

      return;
    }

    const finalCategory =
      category.trim() || "Uncategorized";

    setSaving(true);
    setErrorMessage("");

    try {
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

        const updatedTask = {
          title: taskTitle.trim(),
          category: finalCategory,
          completed:
            existingTask?.completed || false,
          dueDate: dueDate || "",
          dueTime: dueTime || "",
        };

        await updateDoc(
          taskRef,
          updatedTask
        );

        setTasks((previous) =>
          previous.map((task) =>
            task.id === editingId
              ? {
                ...task,
                ...updatedTask,
              }
              : task
          )
        );

        showToast(
          "Task updated successfully."
        );
      } else {
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
          dueTime: dueTime || "",
        };

        const newTask =
          await addDoc(
            tasksRef,
            newTaskData
          );

        setTasks((previous) => [
          ...previous,
          {
            id: newTask.id,
            ...newTaskData,
          },
        ]);

        showToast(
          "Task added successfully."
        );
      }

      handleCancelEdit();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to save the task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleEdit = (task) => {
    setEditingId(task.id);
    setTaskTitle(task.title || "");
    setCategory(
      task.category || "Uncategorized"
    );
    setDueDate(task.dueDate || "");
    setDueTime(task.dueTime || "");
    setErrorMessage("");

    focusTaskInput();
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async () => {
    if (!deleteTask) return;

    setDeletingId(deleteTask.id);

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        deleteTask.id
      );

      await deleteDoc(taskRef);

      setTasks((previous) =>
        previous.filter(
          (task) =>
            task.id !== deleteTask.id
        )
      );

      if (
        editingId === deleteTask.id
      ) {
        handleCancelEdit();
      }

      setDeleteTask(null);

      showToast(
        "Task deleted successfully."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to delete the task."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================
  // COMPLETE
  // =========================

  const handleToggleComplete = async (
    task
  ) => {
    setTogglingId(task.id);

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        task.id
      );

      const completed =
        !task.completed;

      await updateDoc(taskRef, {
        completed,
      });

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? {
              ...item,
              completed,
            }
            : item
        )
      );

      showToast(
        completed
          ? "Task completed."
          : "Task marked as incomplete."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to update the task."
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
    setDueTime("");
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
  // FILTER
  // =========================

  const filteredTasks = tasks
    .filter((task) => {
      if (
        selectedCategory ===
        "All Categories"
      ) {
        return true;
      }

      return (
        (task.category?.trim() ||
          "Uncategorized") ===
        selectedCategory
      );
    })
    .filter((task) => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) return true;

      return (
        task.title
          ?.toLowerCase()
          .includes(query) ||
        task.category
          ?.toLowerCase()
          .includes(query)
      );
    });

  // =========================
  // GROUP
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
  // STATS
  // =========================

  const totalTasks = tasks.length;

  const completedTaskCount =
    tasks.filter(
      (task) => task.completed
    ).length;

  const pendingTaskCount =
    totalTasks -
    completedTaskCount;

  const todayString = format(
    new Date(),
    "yyyy-MM-dd"
  );

  const todayTaskCount =
    tasks.filter(
      (task) =>
        task.dueDate === todayString &&
        !task.completed
    ).length;

  // =========================
  // GREETING
  // =========================

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  // =========================
  // CALENDAR EVENTS
  // =========================

  const calendarEvents = tasks
    .filter((task) => task.dueDate)
    .map((task) => {
      const [
        year,
        month,
        day,
      ] = task.dueDate
        .split("-")
        .map(Number);

      let hour = 0;
      let minute = 0;

      if (task.dueTime) {
        const [
          selectedHour,
          selectedMinute,
        ] = task.dueTime
          .split(":")
          .map(Number);

        hour = selectedHour;
        minute = selectedMinute;
      }

      const start = new Date(
        year,
        month - 1,
        day,
        hour,
        minute
      );

      const end = new Date(
        start.getTime() +
        60 * 60 * 1000
      );

      return {
        id: task.id,
        title: task.title,
        start,
        end,
        completed: task.completed,
        category:
          task.category ||
          "Uncategorized",
      };
    });

  // =========================
  // CALENDAR
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

  const eventPropGetter = (
    event
  ) => ({
    style: {
      backgroundColor:
        event.completed
          ? "#555"
          : "#7c5cff",
      border: "none",
      borderRadius: "6px",
      color: "white",
    },
  });

  // =========================
  // INITIAL LOADING
  // =========================

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="loading-card">
          <div className="brand-mark">
            N
          </div>

          <div className="spinner"></div>

          <p>
            Loading Namjooning...
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // LOGIN
  // =========================

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-glow"></div>

        <div className="login-box">
          <div className="brand-mark large">
            N
          </div>

          <span className="login-brand">
            NAMJOONING
          </span>

          <h1>
            Your day.
            <br />
            <span>Organized.</span>
          </h1>

          <p>
            A simple productivity
            space for your tasks,
            deadlines and plans.
          </p>

          {errorMessage && (
            <div className="error-message">
              <AlertCircle size={17} />
              {errorMessage}
            </div>
          )}

          <button
            className="google-button"
            onClick={handleLogin}
          >
            Sign in with Google
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // MAIN APP
  // =========================

  return (
    <div className="app-shell">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        className={`sidebar ${sidebarOpen
          ? "sidebar-open"
          : ""
          }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            N
          </div>

          <div>
            <strong>
              NAMJOONING
            </strong>

            <span>
              Productivity space
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">
            MENU
          </p>

          <button
            className={
              activeNav === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              scrollToSection(
                "dashboard",
                "dashboard"
              )
            }
          >
            <Home size={19} />
            Dashboard
          </button>

          <button
            className={
              activeNav === "tasks"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              scrollToSection(
                "tasks",
                "tasks"
              )
            }
          >
            <ListTodo size={19} />
            Tasks

            <span className="nav-count">
              {pendingTaskCount}
            </span>
          </button>

          <button
            className={
              activeNav === "calendar"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              scrollToSection(
                "calendar",
                "calendar"
              )
            }
          >
            <CalendarDays size={19} />
            Calendar
          </button>

          <button
            className={
              activeNav === "categories"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              scrollToSection(
                "categories",
                "categories"
              )
            }
          >
            <Tags size={19} />
            Categories

            <span className="nav-count">
              {categories.length}
            </span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() =>
              scrollToSection(
                "settings",
                "settings"
              )
            }
          >
            <Settings size={19} />
            Settings
          </button>

          <div className="sidebar-user">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
              />
            ) : (
              <div className="avatar">
                {(
                  user.displayName ||
                  user.email ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <strong>
                {user.displayName ||
                  "User"}
              </strong>

              <span>
                {user.email}
              </span>
            </div>

            <button
              className="logout-icon"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <div className="main-shell">

        {/* TOPBAR */}

        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu size={22} />
          </button>

          <div className="topbar-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
            />

            {searchQuery && (
              <button
                onClick={() =>
                  setSearchQuery("")
                }
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="quick-add"
            onClick={focusTaskInput}
          >
            <Plus size={18} />
            <span>Add Task</span>
          </button>
        </header>

        <main className="dashboard-main">

          {/* ERROR */}

          {errorMessage && (
            <div className="global-error">
              <AlertCircle size={18} />

              <span>
                {errorMessage}
              </span>

              <button
                onClick={() =>
                  setErrorMessage("")
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* =========================
              DASHBOARD
          ========================= */}

          <section
            id="dashboard"
            className="dashboard-section"
          >
            <div className="hero">
              <div>
                <span className="eyebrow">
                  YOUR PRODUCTIVITY
                </span>

                <h1>
                  {greeting},{" "}
                  {user.displayName?.split(
                    " "
                  )[0] || "there"}{" "}
                  👋
                </h1>

                <p>
                  Here's a quick look at
                  what's happening today.
                </p>
              </div>

              <button
                className="hero-add"
                onClick={focusTaskInput}
              >
                <Plus size={18} />
                Create a task
              </button>
            </div>

            {/* STATS */}

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon purple">
                  <ClipboardList
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Total tasks
                  </span>

                  <strong>
                    {totalTasks}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <CheckCircle2
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Completed
                  </span>

                  <strong>
                    {completedTaskCount}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <Clock3 size={21} />
                </div>

                <div>
                  <span>
                    Pending
                  </span>

                  <strong>
                    {pendingTaskCount}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <CalendarDays
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    Due today
                  </span>

                  <strong>
                    {todayTaskCount}
                  </strong>
                </div>
              </div>

            </div>

            {/* CATEGORIES */}

            <div
              id="categories"
              className="category-overview"
            >
              <div className="section-top">
                <div>
                  <span className="eyebrow">
                    ORGANIZE
                  </span>

                  <h2>
                    Categories
                  </h2>
                </div>

                <button
                  onClick={() =>
                    scrollToSection(
                      "tasks",
                      "tasks"
                    )
                  }
                >
                  View tasks
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>

              <div className="category-chips">

                <button
                  className={
                    selectedCategory ===
                      "All Categories"
                      ? "category-chip active"
                      : "category-chip"
                  }
                  onClick={() => {
                    setSelectedCategory(
                      "All Categories"
                    );

                    scrollToSection(
                      "tasks",
                      "tasks"
                    );
                  }}
                >
                  <FolderOpen size={17} />
                  All
                  <span>
                    {totalTasks}
                  </span>
                </button>

                {categories.map(
                  (item) => {
                    const count =
                      tasks.filter(
                        (task) =>
                          (task.category?.trim() ||
                            "Uncategorized") ===
                          item
                      ).length;

                    return (
                      <button
                        key={item}
                        className={
                          selectedCategory ===
                            item
                            ? "category-chip active"
                            : "category-chip"
                        }
                        onClick={() => {
                          setSelectedCategory(
                            item
                          );

                          scrollToSection(
                            "tasks",
                            "tasks"
                          );
                        }}
                      >
                        <Tags size={16} />
                        {item}
                        <span>
                          {count}
                        </span>
                      </button>
                    );
                  }
                )}

                {categories.length === 0 && (
                  <p className="no-categories">
                    Add a task with a category
                    to see it here.
                  </p>
                )}

              </div>
            </div>
          </section>

          {/* =========================
              ADD TASK
          ========================= */}

          <section
            id="add-task"
            className="task-form-section"
          >
            <div className="section-top">
              <div>
                <span className="eyebrow">
                  {editingId
                    ? "EDIT TASK"
                    : "QUICK ADD"}
                </span>

                <h2>
                  {editingId
                    ? "Edit your task"
                    : "What needs to be done?"}
                </h2>
              </div>

              {editingId && (
                <button
                  className="secondary-button"
                  onClick={
                    handleCancelEdit
                  }
                >
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>

            <form
              className="task-form"
              onSubmit={handleSubmit}
            >
              <div className="form-field task-title-field">
                <label>
                  Task title
                </label>

                <input
                  ref={taskInputRef}
                  type="text"
                  placeholder="e.g. Complete DSA assignment"
                  value={taskTitle}
                  onChange={(event) =>
                    setTaskTitle(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="form-field">
                <label>
                  Category
                </label>

                <input
                  type="text"
                  list="category-options"
                  placeholder="DSA, Java, Personal..."
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

              <div className="form-field">
                <label>
                  Due date
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

              <div className="form-field">
                <label>
                  Due time
                </label>

                <input
                  type="time"
                  value={dueTime}
                  onChange={(event) =>
                    setDueTime(
                      event.target.value
                    )
                  }
                />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingId ? (
                      <Check size={18} />
                    ) : (
                      <Plus size={18} />
                    )}

                    {editingId
                      ? "Update Task"
                      : "Add Task"}
                  </>
                )}
              </button>
            </form>
          </section>

          {/* =========================
              TASKS
          ========================= */}

          <section
            id="tasks"
            className="tasks-section"
          >
            <div className="section-top">
              <div>
                <span className="eyebrow">
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
              >
                <option>
                  All Categories
                </option>

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="task-summary">
              <span>
                {totalTasks} total
              </span>

              <span>•</span>

              <span>
                {pendingTaskCount} pending
              </span>

              <span>•</span>

              <span>
                {completedTaskCount} completed
              </span>

              {searchQuery && (
                <>
                  <span>•</span>
                  <span>
                    Searching "{searchQuery}"
                  </span>
                </>
              )}
            </div>

            {tasksLoading ? (
              <div className="empty-state">
                <div className="spinner" />
                <h3>
                  Loading tasks...
                </h3>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <ListTodo size={25} />
                </div>

                <h3>
                  No tasks yet
                </h3>

                <p>
                  Add your first task and
                  start organizing your day.
                </p>

                <button
                  className="primary-button"
                  onClick={focusTaskInput}
                >
                  <Plus size={17} />
                  Add your first task
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Search size={25} />
                </div>

                <h3>
                  No matching tasks
                </h3>

                <p>
                  Try another search or
                  category.
                </p>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(
                      "All Categories"
                    );
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
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
                      <div className="category-heading">
                        <div>
                          <FolderOpen
                            size={18}
                          />

                          <h3>
                            {categoryName}
                          </h3>
                        </div>

                        <span>
                          {
                            categoryTasks.length
                          }
                        </span>
                      </div>

                      <div className="task-list">
                        {categoryTasks.map(
                          (task) => (
                            <article
                              className={`task-card ${task.completed
                                ? "completed"
                                : ""
                                }`}
                              key={task.id}
                            >
                              <button
                                className="complete-button"
                                onClick={() =>
                                  handleToggleComplete(
                                    task
                                  )
                                }
                                disabled={
                                  togglingId ===
                                  task.id
                                }
                              >
                                {task.completed ? (
                                  <CheckCircle2
                                    size={23}
                                  />
                                ) : (
                                  <Circle
                                    size={23}
                                  />
                                )}
                              </button>

                              <div className="task-content">
                                <h3>
                                  {task.title}
                                </h3>

                                <div className="task-meta">
                                  {task.dueDate && (
                                    <span>
                                      <CalendarDays
                                        size={14}
                                      />
                                      {task.dueDate}
                                    </span>
                                  )}

                                  {task.dueTime && (
                                    <span>
                                      <Clock3
                                        size={14}
                                      />
                                      {task.dueTime}
                                    </span>
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
                                  title="Edit"
                                >
                                  <Edit3
                                    size={16}
                                  />
                                </button>

                                <button
                                  className="delete-action"
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
                                  title="Delete"
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              </div>
                            </article>
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

          <section
            id="calendar"
            className="calendar-section"
          >
            <div className="section-top">
              <div>
                <span className="eyebrow">
                  DEADLINES
                </span>

                <h2>
                  Calendar
                </h2>
              </div>

              <span className="section-note">
                Click an event to edit it
              </span>
            </div>

            <div className="calendar-card">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                date={calendarDate}
                view={calendarView}
                onNavigate={setCalendarDate}
                onView={setCalendarView}
                onSelectEvent={
                  handleCalendarEventClick
                }
                views={[
                  "month",
                  "week",
                  "day",
                  "agenda",
                ]}
                popup
                eventPropGetter={
                  eventPropGetter
                }
                style={{
                  height: "700px",
                }}
              />
            </div>
          </section>

          {/* =========================
              SETTINGS
          ========================= */}

          <section
            id="settings"
            className="settings-section"
          >
            <div className="section-top">
              <div>
                <span className="eyebrow">
                  ACCOUNT
                </span>

                <h2>
                  Settings
                </h2>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-profile">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                  />
                ) : (
                  <div className="large-avatar">
                    {(
                      user.displayName ||
                      user.email ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <strong>
                    {user.displayName ||
                      "User"}
                  </strong>

                  <span>
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                className="logout-button"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          </section>

        </main>

        {/* FOOTER */}

        <footer className="app-footer">
          <span>
            © 2026 Namjooning
          </span>

          <span>
            Stay organized. Stay focused.
          </span>
        </footer>
      </div>

      {/* =========================
          TOAST
      ========================= */}

      {toast.show && (
        <div
          className={`toast ${toast.type === "error"
            ? "toast-error"
            : ""
            }`}
        >
          <CheckCircle2 size={18} />
          {toast.message}
        </div>
      )}

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
              <Trash2 size={23} />
            </div>

            <h2>
              Delete task?
            </h2>

            <p>
              Are you sure you want to
              delete{" "}
              <strong>
                "{deleteTask.title}"
              </strong>
              ?
            </p>

            <span>
              This action cannot be undone.
            </span>

            <div className="modal-actions">
              <button
                className="secondary-button"
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
                className="danger-button"
                onClick={handleDelete}
                disabled={
                  deletingId !== null
                }
              >
                {deletingId ? (
                  <>
                    <span className="button-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
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