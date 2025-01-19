// WebSocket connection to the backend
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
    loader.style.display = "block";
    taskList.classList.add("hidden");

    const response = await fetch("http://127.0.0.1:5000/get_tasks");
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    const data = await response.json();
    if (data.success) {
      console.log(data.tasks);
      displayGroupedTasks(data.tasks);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
  } finally {
    setTimeout(() => {
      loader.style.display = "none";
      taskList.classList.remove("hidden");
    }, 1000);
  }
}

// Handle form submission
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("task-title").value;
  const desc = document.getElementById("task-desc").value;

  loader.style.display = "block";
  taskList.classList.add("blurred");

  try {
    // Pošalji novi task na server preko HTTP POST
    const response = await fetch("http://127.0.0.1:5000/add_task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });

    if (!response.ok) {
      alert("Failed to add task. Please try again.");
    }
  } catch (error) {
    console.error("Error adding task:", error);
  } finally {
    setTimeout(() => {
      loader.style.display = "none";
      taskList.classList.remove("blurred"); // Pokaži task listu
    }, 1000);
  }
});

// Slušaj 'tasks_updated' event preko WebSocket
socket.on("tasks_updated", (tasks) => {
  displayGroupedTasks(tasks);
});

socket.on("task_added", (msg) => {
  document.getElementById("task-title").value = "";
  document.getElementById("task-desc").value = "";
  alert(msg);
});

socket.on("alert", (msg) => {
  alert(msg);
});

// Prikazivanje taskova prema statusu
function displayGroupedTasks(tasks) {
  // Clear all groups
  toDoGroup.innerHTML = '<h2 class="group-title">To Do</h2>';
  inProgressGroup.innerHTML = '<h2 class="group-title">In Progress</h2>';
  doneGroup.innerHTML = '<h2 class="group-title">Done</h2>';

  // Taskovi primaju status
  tasks["To Do"].forEach((task) => addTaskToGroup(task, toDoGroup));
  tasks["In Progress"].forEach((task) => addTaskToGroup(task, inProgressGroup));
  tasks["Done"].forEach((task) => addTaskToGroup(task, doneGroup));

  initializeDragAndDrop();
}

// Funkcija za dodavanje taska u specifičnu grupu
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

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const taskId = e.dataTransfer.getData("text/plain");
  const newStatus = e.currentTarget.dataset.status;

  // Provjeri postoji li element:
  const task = document.querySelector(`.task[data-id='${taskId}']`);
  if (!task) {
    console.error("No .task found with data-id=", taskId);
    return; // Spriječi rušenje
  }

  // ... zatim normalno pozovi updateTaskStatus ...
  await updateTaskStatus(taskId, newStatus);
  e.currentTarget.appendChild(task);
}

function handleDragStart(e) {
  e.target.classList.add("dragging");
  e.dataTransfer.setData("text/plain", e.currentTarget.dataset.id);
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
}

function initializeDragAndDrop() {
  const tasks = document.querySelectorAll(".task");
  const groups = document.querySelectorAll(".task-group");

  tasks.forEach((task) => {
    // Za svaki task prije dodavanja uklonimo stare evente (ako postoje)
    task.removeEventListener("dragstart", handleDragStart);
    task.removeEventListener("dragend", handleDragEnd);

    task.addEventListener("dragstart", handleDragStart);
    task.addEventListener("dragend", handleDragEnd);
  });

  groups.forEach((group) => {
    group.removeEventListener("dragover", handleDragOver);
    group.removeEventListener("dragleave", handleDragLeave);
    group.removeEventListener("drop", handleDrop);

    group.addEventListener("dragover", handleDragOver);
    group.addEventListener("dragleave", handleDragLeave);
    group.addEventListener("drop", handleDrop);
  });
}

// Sunkcija za ažuriranje task statusa (zove novi POST endpoint)
async function updateTaskStatus(taskId, newStatus) {
  try {
    const response = await fetch("http://127.0.0.1:5000/update_task_status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: Number(taskId), new_status: newStatus }),
    });

    if (!response.ok) {
      throw new Error("Failed to update task status");
    }
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}

// Fetch initial tasks na učitavanje stranice
fetchInitialTasks();
