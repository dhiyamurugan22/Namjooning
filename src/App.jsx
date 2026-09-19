import { useEffect, useState } from "react";
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

function App() {
  const [user, setUser] = useState(null);

  const [task, setTask] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");

  const [tasks, setTasks] = useState([]);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  // Google Sign-In
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(
        "Google Sign-In Error:",
        error
      );
    }
  };

  // Sign-Out
  const handleLogout = async () => {
    try {
      await signOut(auth);

      setTasks([]);
    } catch (error) {
      console.error(
        "Sign-Out Error:",
        error
      );
    }
  };

  // Add Task
  const handleAddTask = async () => {
    if (!task.trim()) {
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "tasks"
        ),
        {
          title: task.trim(),
          completed: false,
          dueDate: taskDate,
          dueTime: taskTime,
        }
      );

      setTask("");
      setTaskDate("");
      setTaskTime("");

      console.log(
        "Task added successfully"
      );

      loadTasks();
    } catch (error) {
      console.error(
        "Error adding task:",
        error
      );
    }
  };

  // Read Tasks
  const loadTasks = async () => {
    if (!user) {
      return;
    }

    try {
      const querySnapshot =
        await getDocs(
          collection(
            db,
            "users",
            user.uid,
            "tasks"
          )
        );

      const taskList =
        querySnapshot.docs.map(
          (taskDocument) => ({
            id: taskDocument.id,
            ...taskDocument.data(),
          })
        );

      setTasks(taskList);

      console.log(
        "Tasks loaded:",
        taskList
      );
    } catch (error) {
      console.error(
        "Error loading tasks:",
        error
      );
    }
  };

  // Load tasks when user logs in
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  // Update Task
  const handleUpdateTask = async (
    taskId,
    oldTitle
  ) => {
    const newTitle = prompt(
      "Enter the updated task:",
      oldTitle
    );

    if (
      !newTitle ||
      !newTitle.trim()
    ) {
      return;
    }

    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        taskId
      );

      await updateDoc(taskRef, {
        title: newTitle.trim(),
      });

      console.log(
        "Task updated successfully"
      );

      loadTasks();
    } catch (error) {
      console.error(
        "Error updating task:",
        error
      );
    }
  };

  // Delete Task
  const handleDeleteTask = async (
    taskId
  ) => {
    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        taskId
      );

      await deleteDoc(taskRef);

      console.log(
        "Task deleted successfully"
      );

      loadTasks();
    } catch (error) {
      console.error(
        "Error deleting task:",
        error
      );
    }
  };

  // Complete / Uncomplete Task
  const handleToggleTask = async (
    taskId,
    currentStatus
  ) => {
    try {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        taskId
      );

      await updateDoc(taskRef, {
        completed: !currentStatus,
      });

      console.log(
        "Task status updated"
      );

      loadTasks();
    } catch (error) {
      console.error(
        "Error updating task status:",
        error
      );
    }
  };

  return (
    <div>
      <h1>To-Do List</h1>

      {user ? (
        <div>
          <h2>
            Welcome, {user.displayName}!
          </h2>

          <p>{user.email}</p>

          {/* Add Task */}
          <input
            type="text"
            placeholder="Enter a task"
            value={task}
            onChange={(e) =>
              setTask(e.target.value)
            }
          />

          {/* Due Date */}
          <input
            type="date"
            value={taskDate}
            onChange={(e) =>
              setTaskDate(e.target.value)
            }
          />

          {/* Due Time */}
          <input
            type="time"
            value={taskTime}
            onChange={(e) =>
              setTaskTime(e.target.value)
            }
          />

          <button
            onClick={handleAddTask}
          >
            Add Task
          </button>

          {/* Display Tasks */}
          <h2>Your Tasks</h2>

          {tasks.length === 0 ? (
            <p>No tasks yet.</p>
          ) : (
            <ul>
              {tasks.map((item) => (
                <li key={item.id}>
                  {/* Complete / Uncomplete */}
                  <input
                    type="checkbox"
                    checked={
                      item.completed || false
                    }
                    onChange={() =>
                      handleToggleTask(
                        item.id,
                        item.completed || false
                      )
                    }
                  />

                  <span>
                    {item.title}
                  </span>

                  {/* Due Date */}
                  {item.dueDate && (
                    <span>
                      {" "}
                      - Due: {item.dueDate}
                    </span>
                  )}

                  {/* Due Time */}
                  {item.dueTime && (
                    <span>
                      {" "}
                      at {item.dueTime}
                    </span>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() =>
                      handleUpdateTask(
                        item.id,
                        item.title
                      )
                    }
                  >
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() =>
                      handleDeleteTask(
                        item.id
                      )
                    }
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Sign Out */}
          <button
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}

export default App;