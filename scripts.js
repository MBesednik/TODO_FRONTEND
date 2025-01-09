// Initialize WebSocket connection to the backend
const socket = io("http://127.0.0.1:5000");

const taskForm = document.getElementById("task-form");
const loader = document.getElementById("loader");
const taskList = document.getElementById("task-list");
const toDoGroup = document.getElementById("to-do-group");
const inProgressGroup = document.getElementById("in-progress-group");
const doneGroup = document.getElementById("done-group");

// Fetch all tasks when the page loads
async function fetchInitialTasks() {
  try {
    loader.style.display = "block"; // Show loader
    taskList.classList.add("hidden"); // Hide task list

    const response = await fetch("http://127.0.0.1:5000/get_tasks");
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    const data = await response.json();
    if (data.success) {
      // Populate the task list with initial tasks
      displayGroupedTasks(data.tasks);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
  } finally {
    setTimeout(() => {
      loader.style.display = "none"; // Hide loader after 2 seconds
      taskList.classList.remove("hidden"); // Show task list
    }, 1000);
  }
}

// Handle form submission
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("task-title").value;
  const desc = document.getElementById("task-desc").value;

  loader.style.display = "block"; // Show loader
  taskList.classList.add("hidden"); // Hide task list

  try {
    // Send new task to server via HTTP POST
    const response = await fetch("http://127.0.0.1:5000/add_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });

    if (response.ok) {
      // Clear the form fields after successful submission
      document.getElementById("task-title").value = "";
      document.getElementById("task-desc").value = "";
    } else {
      alert("Failed to add task. Please try again.");
    }
  } catch (error) {
    console.error("Error adding task:", error);
  } finally {
    setTimeout(() => {
      loader.style.display = "none"; // Hide loader after 2 seconds
      taskList.classList.remove("hidden"); // Show task list
    }, 1000);
  }
});

// Listen for 'tasks_updated' event via WebSocket
socket.on("tasks_updated", (tasks) => {
  displayGroupedTasks(tasks);
});

// Function to display tasks grouped by status
function displayGroupedTasks(tasks) {
  // Clear all groups
  toDoGroup.innerHTML = '<h2 class="group-title">To Do</h2>';
  inProgressGroup.innerHTML = '<h2 class="group-title">In Progress</h2>';
  doneGroup.innerHTML = '<h2 class="group-title">Done</h2>';

  // Add tasks to their respective groups
  tasks["To Do"].forEach((task) => addTaskToGroup(task, toDoGroup));
  tasks["In Progress"].forEach((task) => addTaskToGroup(task, inProgressGroup));
  tasks["Done"].forEach((task) => addTaskToGroup(task, doneGroup));

  // Add drag-and-drop functionality
  initializeDragAndDrop();
}

// Function to add a task to a specific group
function addTaskToGroup(task, group) {
  const taskElement = document.createElement("div");
  taskElement.className = "task";
  taskElement.draggable = true;
  taskElement.dataset.id = task.id;
  taskElement.innerHTML = `
          <div class="task-content">
            <strong>${task.title}</strong>
            <span>${task.description}</span>
          </div>
          <div class="task-dropdown">
            <select onchange="updateTaskStatus(${task.id}, this.value)">
              <option value="To Do" ${
                group.dataset.status === "To Do" ? "selected" : ""
              }>To Do</option>
              <option value="In Progress" ${
                group.dataset.status === "In Progress" ? "selected" : ""
              }>In Progress</option>
              <option value="Done" ${
                group.dataset.status === "Done" ? "selected" : ""
              }>Done</option>
            </select>
          </div>
        `;
  group.appendChild(taskElement);
}

// Function to initialize drag-and-drop functionality
function initializeDragAndDrop() {
  const tasks = document.querySelectorAll(".task");
  const groups = document.querySelectorAll(".task-group");

  tasks.forEach((task) => {
    task.addEventListener("dragstart", (e) => {
      task.classList.add("dragging");
      e.dataTransfer.setData("text/plain", task.dataset.id);
    });

    task.addEventListener("dragend", () => {
      task.classList.remove("dragging");
    });
  });

  groups.forEach((group) => {
    group.addEventListener("dragover", (e) => {
      e.preventDefault();
      group.classList.add("drag-over");
    });

    group.addEventListener("dragleave", () => {
      group.classList.remove("drag-over");
    });

    group.addEventListener("drop", async (e) => {
      e.preventDefault();
      group.classList.remove("drag-over");

      const taskId = e.dataTransfer.getData("text/plain");
      const newStatus = group.dataset.status;

      // Update task status on the server
      await updateTaskStatus(taskId, newStatus);

      // Move the task element
      const task = document.querySelector(`.task[data-id='${taskId}']`);
      group.appendChild(task);
    });
  });
}

// Function to update task status
async function updateTaskStatus(taskId, newStatus) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/update_task_status/${taskId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update task status");
    }
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}

// Fetch initial tasks on page load
fetchInitialTasks();
