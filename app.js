document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const formFeedback = document.getElementById('form-feedback');
    const sortSelect = document.getElementById('sort-select');
    const filterSelect = document.getElementById('filter-select');
    const searchTasksInput = document.getElementById('search-tasks');
    const taskCountSpan = document.getElementById('task-count');
    const notificationsContainer = document.getElementById('notifications-container');
    const categoryFilter = document.getElementById('category-filter');
    const showCompletedToggle = document.getElementById('show-completed-toggle');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let filteredTasks = tasks;

    updateTaskCount();

    tasks.forEach(task => {
        addTaskToDOM(task);
        updateCategoryFilter(task.category); // Add this line to update the category filter dropdown
        if (task.isMonitored) {
            const taskElement = taskList.querySelector(`[data-id="${task.id}"]`);
            const redDot = taskElement.querySelector('.red-dot');
            redDot.style.visibility = 'visible';
            redDot.style.left = '10px'; // Adjust position to the right
        }
    });

    taskForm.addEventListener('submit', addTask);
    taskList.addEventListener('click', manageTask);
    sortSelect.addEventListener('change', sortTasks);
    filterSelect.addEventListener('change', filterTasks);
    searchTasksInput.addEventListener('input', searchTasks);
    categoryFilter.addEventListener('change', filterTasks); // Add event listener for category filter
    showCompletedToggle.addEventListener('change', toggleCompletedTasks); // Add event listener for show completed tasks toggle

    function addTask(e) {
        e.preventDefault();

        const title = document.getElementById('task-title').value;
        const desc = document.querySelector('trix-editor').value;
        const priority = document.getElementById('task-priority').value;
        const status = document.getElementById('task-status').value;
        const date = document.getElementById('task-date').value;
        const category = document.getElementById('task-category').value;

        const task = {
            id: Date.now(),
            title,
            description: desc,
            priority,
            status,
            dueDate: date,
            category,
            isMonitored: false
        };

        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        addTaskToDOM(task);
        updateCategoryFilter(category); // Add this line to update the category filter dropdown
        displayFeedback('Task added successfully.', 'success');

        taskForm.reset();
        updateTaskCount();
    }

    function manageTask(e) {
        const taskElement = e.target.closest('li');
        if (!taskElement) return;

        const taskId = taskElement.getAttribute('data-id');
        const taskIndex = tasks.findIndex(task => task.id == taskId);

        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this task?')) {
                taskList.removeChild(taskElement);
                tasks.splice(taskIndex, 1);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                displayFeedback('Task deleted successfully.', 'success');
                updateTaskCount();
            }
        }

        if (e.target.classList.contains('complete-btn')) {
            tasks[taskIndex].status = tasks[taskIndex].status === 'Completed' ? 'Not Started' : 'Completed';
            localStorage.setItem('tasks', JSON.stringify(tasks));
            taskElement.classList.toggle('completed');
            e.target.textContent = tasks[taskIndex].status === 'Completed' ? 'Undo' : 'Complete';
            displayFeedback('Task status updated.', 'info');
        }

        if (e.target.classList.contains('edit-btn')) {
            const task = tasks[taskIndex];
            document.getElementById('task-title').value = task.title;
            document.querySelector('trix-editor').editor.loadHTML(task.description.replace(/\n/g, '<br>'));
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-date').value = task.dueDate;
            document.getElementById('task-category').value = task.category;
            taskList.removeChild(taskElement);
            tasks.splice(taskIndex, 1);

            // Remove old category from the category filter dropdown
            const oldCategoryOption = document.querySelector(`#category-filter option[value="${task.category}"]`);
            if (oldCategoryOption) {
                oldCategoryOption.remove();
            }

            localStorage.setItem('tasks', JSON.stringify(tasks));
            displayFeedback('Edit mode activated. Update and submit the form.', 'info');
            updateTaskCount();
        }


        if (e.target.classList.contains('monitor-toggle')) {
            tasks[taskIndex].isMonitored = !tasks[taskIndex].isMonitored;
            localStorage.setItem('tasks', JSON.stringify(tasks));

            const redDot = taskElement.querySelector('.red-dot');
            redDot.style.visibility = tasks[taskIndex].isMonitored ? 'visible' : 'hidden';

            displayFeedback('Task monitor status updated.', 'info');
        }

        const priorityLabel = taskElement.querySelector('.priority-label');
        if (priorityLabel) {
            priorityLabel.classList.toggle('blink', tasks[taskIndex].isMonitored);
        }
    }

    function addTaskToDOM(task) {
        const taskItem = document.createElement('li');
        taskItem.classList.add(task.priority.toLowerCase());
        if (task.status === 'Completed') {
            taskItem.classList.add('completed');
        }
        taskItem.setAttribute('data-id', task.id);

        const titleWithDPLinks = task.title.replace(/(DP\d{5})/g, '<a href="https://dp.deploy.akamai.com/info/$1" target="_blank">$1</a>');
        const descriptionWithLinks = task.description.replace(/(DP\d{5})/g, '<a href="https://dp.deploy.akamai.com/info/$1" target="_blank">$1</a>');

        const dueDate = new Date(task.dueDate);
        const currentDate = new Date();

        taskItem.innerHTML = `
            <div class="task-header">
                <div class="red-dot-container">
                    <div class="red-dot"></div>
                </div>
                <div>
                    <label class="switch tooltip-container">
                        <input type="checkbox" class="monitor-toggle" ${task.isMonitored ? 'checked' : ''}>
                        <span class="slider round"></span>
                        <div class="tooltip-text">Focus Tasks</div>
                    </label>
                    <h3 class="task-title">${titleWithDPLinks}</h3>
                </div>
            </div>
            <div class="task-description">${descriptionWithLinks.replace(/\n/g, '<br>')}</div>
            <div class="due-date ${dueDate < currentDate ? 'due-date-glow' : ''}">Due Date: ${dueDate.toLocaleDateString()}</div>
            <div class="priority">Priority: ${task.priority}</div>
            <div class="status">Status: ${task.status}</div>
            <div class="category">Category: ${task.category}</div>
            <div class="task-buttons">
                <button class="complete-btn">${task.status === 'Completed' ? 'Undo' : 'Complete'}</button>
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;

        // Check if due date has passed and apply glow effect
        if (dueDate < currentDate) {
            const dueDateElement = taskItem.querySelector('.due-date');
            dueDateElement.classList.add('due-date-glow');
        }

        taskList.appendChild(taskItem);
    }

    function displayFeedback(message, type) {
        showNotification(message, type);
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notificationsContainer.appendChild(notification);

        setTimeout(() => {
            notificationsContainer.removeChild(notification);
        }, 3000);
    }

    function filterTasks() {
        const filterByCategory = categoryFilter.value;
        const filterByStatus = filterSelect.value;

        filteredTasks = tasks.filter(task => {
            const categoryMatch = filterByCategory === 'all' || task.category === filterByCategory;
            const statusMatch = filterByStatus === 'all' || task.status === filterByStatus;
            return categoryMatch && statusMatch;
        });

        taskList.innerHTML = '';
        filteredTasks.forEach(addTaskToDOM);
        displayFeedback(`Tasks filtered by category: ${filterByCategory} and status: ${filterByStatus}.`, 'info');
        updateTaskCount(filteredTasks.length);
    }

    function updateCategoryFilter(category) {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter.querySelector(`option[value="${category}"]`)) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        }
    }

    function searchTasks() {
        const searchQuery = searchTasksInput.value.toLowerCase();
        filteredTasks = tasks.filter(task =>
            task.title.toLowerCase().includes(searchQuery) ||
            task.description.toLowerCase().includes(searchQuery)
        );
        taskList.innerHTML = '';
        filteredTasks.forEach(addTaskToDOM);
        displayFeedback(`Tasks filtered by search query: ${searchQuery}`, 'info');
        updateTaskCount(filteredTasks.length);
    }

    function sortTasks() {
        const sortBy = sortSelect.value;
        filteredTasks.sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1);
        taskList.innerHTML = '';
        filteredTasks.forEach(addTaskToDOM);
        displayFeedback(`Tasks sorted by ${sortBy}.`, 'info');
        updateTaskCount(filteredTasks.length);
    }

    function toggleCompletedTasks() {
        const completedTasks = document.querySelectorAll('.completed');

        if (showCompletedToggle.checked) {
            completedTasks.forEach(task => task.style.display = 'block');
        } else {
            completedTasks.forEach(task => task.style.display = 'none');
        }
    }

    function updateTaskCount(count = tasks.length) {
        taskCountSpan.textContent = `(${count})`;
    }
});

document.addEventListener('trix-file-accept', function(event) {
    event.preventDefault();
    alert('File attachment is not allowed!');
});
