chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clearAll();
  chrome.storage.sync.get('tasks', (data) => {
    const tasks = data.tasks || [];
    tasks.forEach(scheduleTaskNotifications);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  const task = JSON.parse(alarm.name);
  showNotification(task);
});

function scheduleTaskNotifications(task) {
  const dueDate = new Date(task.dueDate).getTime();
  const now = Date.now();
  const timeBeforeDue = 15 * 60 * 1000; // 15 minutes before due time

  if (dueDate > now) {
    // Schedule notification 15 minutes before due time
    chrome.alarms.create(JSON.stringify(task), { when: dueDate - timeBeforeDue });
    // Schedule notification at due time
    chrome.alarms.create(JSON.stringify(task), { when: dueDate });
  }
}

function showNotification(task) {
  const priorityText = getPriorityText(task.priority);
  const dueDate = new Date(task.dueDate).toLocaleString();
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Task Reminder',
    message: `Task: ${task.content}\nDue: ${dueDate}\nPriority: ${priorityText}`
  });
}

// Get priority text
function getPriorityText(priority) {
  switch (priority) {
    case '1':
      return 'Low Priority';
    case '2':
      return 'Medium Priority';
    case '3':
      return 'High Priority';
    default:
      return 'Unknown Priority';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskDueTimeInput = document.getElementById('task-due-time');
  const taskPrioritySelect = document.getElementById('task-priority');
  const addTaskButton = document.getElementById('add-task');
  let isEditing = false;
  let editingTaskId = null;

  // Load tasks from storage
  chrome.storage.sync.get('tasks', (data) => {
    const tasks = data.tasks || [];
    tasks.forEach(addTaskToList);
  });

  // Add or update a task
  addTaskButton.addEventListener('click', () => {
    const taskContent = newTaskInput.value.trim();
    const dueDate = taskDueDateInput.value;
    const dueTime = taskDueTimeInput.value;
    const priority = taskPrioritySelect.value;
    if (taskContent && dueDate && dueTime) {
      const dueDateTime = new Date(`${dueDate}T${dueTime}`).toISOString();
      const task = {
        id: isEditing ? editingTaskId : Date.now(),
        content: taskContent,
        dueDate: dueDateTime,
        priority: priority
      };
      if (isEditing) {
        updateTask(task);
      } else {
        addTaskToList(task);
        saveTask(task);
        scheduleTaskNotifications(task);
      }
      resetForm();
    }
  });

  // Add task to the UI
  function addTaskToList(task) {
    const priorityText = getPriorityText(task.priority);
    const dueDate = new Date(task.dueDate).toLocaleString();
    const li = document.createElement('li');
    li.textContent = `${task.content} (Due: ${dueDate}) - Priority: ${priorityText}`;
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => {
      editTask(task);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      li.remove();
      deleteTask(task.id);
    });
    
    li.appendChild(editButton);
    li.appendChild(deleteButton);
    taskList.appendChild(li);
  }

  // Edit task
  function editTask(task) {
    newTaskInput.value = task.content;
    const dueDate = new Date(task.dueDate);
    taskDueDateInput.value = dueDate.toISOString().split('T')[0];
    taskDueTimeInput.value = dueDate.toTimeString().split(' ')[0].slice(0, 5);
    taskPrioritySelect.value = task.priority;

    addTaskButton.textContent = 'Update Task';
    isEditing = true;
    editingTaskId = task.id;
  }

  // Update task
  function updateTask(updatedTask) {
    chrome.storage.sync.get('tasks', (data) => {
      let tasks = data.tasks || [];
      tasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
      chrome.storage.sync.set({ tasks }, () => {
        location.reload();
      });
    });
  }

  // Get priority text
  function getPriorityText(priority) {
    switch (priority) {
      case '1':
        return 'Low Priority';
      case '2':
        return 'Medium Priority';
      case '3':
        return 'High Priority';
      default:
        return 'Unknown Priority';
    }
  }

  // Save task to storage
  function saveTask(task) {
    chrome.storage.sync.get('tasks', (data) => {
      const tasks = data.tasks || [];
      tasks.push(task);
      chrome.storage.sync.set({ tasks });
    });
  }

  // Delete task from storage
  function deleteTask(taskId) {
    chrome.storage.sync.get('tasks', (data) => {
      const tasks = data.tasks || [];
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      chrome.storage.sync.set({ tasks: updatedTasks });
      chrome.alarms.clear(JSON.stringify({ id: taskId }));
    });
  }

  // Reset form
  function resetForm() {
    newTaskInput.value = '';
    taskDueDateInput.value = '';
    taskDueTimeInput.value = '';
    taskPrioritySelect.value = '1';
    addTaskButton.textContent = 'Add Task';
    isEditing = false;
    editingTaskId = null;
  }
});