// ------------------ Disable right-click, copy, selection, and drag ------------------
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('cut', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

let token = null;
let userId = null;
let chartType = 'doughnut'; // default chart type
let chart;

// ------------------ DOM elements ------------------
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const categoryInput = document.getElementById('category');
const transactionForm = document.getElementById('transaction-form');
const transactionsList = document.getElementById('transactions-list');

const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expensesEl = document.getElementById('expenses');
const summaryOutput = document.getElementById('summary-output');
const periodSelect = document.getElementById('period-select');
const loadSummaryBtn = document.getElementById('load-summary-btn');

const toggleChartBtn = document.getElementById('toggleChartBtn');
const exportChartBtn = document.getElementById('exportChartBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

const profileName = document.getElementById('profile-name');
const profilePicture = document.getElementById('profile-picture');

// ------------------ Helper: update chart ------------------
function updateChart(income, expenses) {
    const ctx = document.getElementById('spendingChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{ data: [income, expenses], backgroundColor: ['#4CAF50', '#f44336'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Finance Overview' } } }
    });
}

// ------------------ Toggle chart ------------------
toggleChartBtn.addEventListener('click', () => {
    chartType = chartType === 'doughnut' ? 'bar' : 'doughnut';
    loadTransactions();
});

// ------------------ Export chart ------------------
exportChartBtn.addEventListener('click', () => {
    if (!chart) return;
    const url = chart.toBase64Image();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance_chart.png';
    a.click();
});

// ------------------ Load transactions ------------------
async function loadTransactions() {
    if (!token) return;
    try {
        const res = await fetch('http://localhost:3000/api/transactions', {
            headers: { 'Authorization': token }
        });
        const data = await res.json();

        transactionsList.innerHTML = '';
        let income = 0, expenses = 0;

        data.forEach(tx => {
            const li = document.createElement('li');
            li.textContent = `${tx.description} - $${parseFloat(tx.amount).toFixed(2)} [${tx.category}]`;
            li.classList.add(tx.type);
            li.onclick = () => deleteTransaction(tx.id);
            transactionsList.appendChild(li);

            if (tx.type === 'income') income += parseFloat(tx.amount);
            else expenses += parseFloat(tx.amount);
        });

        balanceEl.textContent = (income - expenses).toFixed(2);
        incomeEl.textContent = income.toFixed(2);
        expensesEl.textContent = expenses.toFixed(2);
        updateChart(income, expenses);
    } catch (err) {
        console.error('Failed to load transactions:', err);
    }
}

// ------------------ Add transaction ------------------
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const transaction = {
        description: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        type: typeSelect.value,
        category: categoryInput.value || 'General'
    };

    await fetch('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(transaction)
    });

    descriptionInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
    loadTransactions();
});

// ------------------ Delete transaction ------------------
async function deleteTransaction(id) {
    await fetch(`http://localhost:3000/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
    });
    loadTransactions();
}

// ------------------ Register ------------------
registerBtn.addEventListener('click', async () => {
    const file = document.getElementById('profile-upload-auth').files[0];
    const formData = new FormData();
    formData.append('name', nameInput.value);
    formData.append('email', emailInput.value);
    formData.append('password', passwordInput.value);
    if (file) formData.append('profile_picture', file);

    try {
        const res = await fetch('http://localhost:3000/api/auth/register', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.success ? 'Registered! Please login.' : data.error);
    } catch (err) {
        console.error('Registration error:', err);
    }
});

// ------------------ Login ------------------
loginBtn.addEventListener('click', async () => {
    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
        });
        const data = await res.json();

        if (data.success) {
            token = data.token;
            userId = data.userId;
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId);

            authDiv.style.display = 'none';
            appDiv.style.display = 'block';

            profileName.textContent = data.name;
            profilePicture.src = data.profile_picture
                ? `http://localhost:3000/uploads/${data.profile_picture}`
                : 'default-avatar.png';

            loadTransactions();
        } else alert(data.error);
    } catch (err) {
        console.error('Login error:', err);
    }
});

// ------------------ Persist login on refresh ------------------
window.addEventListener('load', async () => {
    const savedToken = localStorage.getItem('token');
    const savedUserId = localStorage.getItem('userId');

    if (savedToken && savedUserId) {
        token = savedToken;
        userId = savedUserId;

        authDiv.style.display = 'none';
        appDiv.style.display = 'block';

        await loadTransactions();

        try {
            const res = await fetch(`http://localhost:3000/api/auth/profile/${userId}`, {
                headers: { 'Authorization': token }
            });
            const data = await res.json();

            profileName.textContent = data.name;
            profilePicture.src = data.profile_picture
                ? `http://localhost:3000/uploads/${data.profile_picture}`
                : 'default-avatar.png';
        } catch (err) {
            console.error('Failed to fetch profile on refresh:', err);
        }
    }
});

// ------------------ Logout ------------------
logoutBtn.addEventListener('click', () => {
    token = null;
    userId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    authDiv.style.display = 'block';
    appDiv.style.display = 'none';
});

// ------------------ Load summary ------------------
loadSummaryBtn.addEventListener('click', async () => {
    const period = periodSelect.value;
    try {
        const res = await fetch(`http://localhost:3000/api/transactions/summary?period=${period}`, { headers: { 'Authorization': token } });
        const data = await res.json();

        let totalIncome = 0, totalExpense = 0;
        data.forEach(item => {
            totalIncome += parseFloat(item.total_income);
            totalExpense += parseFloat(item.total_expense);
        });

        const profit = totalIncome - totalExpense;
        const expensePercent = totalIncome ? ((totalExpense / totalIncome) * 100).toFixed(2) : 0;
        const profitPercent = totalIncome ? ((profit / totalIncome) * 100).toFixed(2) : 0;

        summaryOutput.innerHTML = `
            <p>Total Income: $${totalIncome.toFixed(2)}</p>
            <p>Total Expenses: $${totalExpense.toFixed(2)}</p>
            <p>Profit: $${profit.toFixed(2)}</p>
            <p>Expense %: ${expensePercent}% | Profit %: ${profitPercent}%</p>
        `;
    } catch (err) {
        console.error('Failed to load summary:', err);
    }
});

// ------------------ Download PDF ------------------
downloadPdfBtn.addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const chartCanvas = document.getElementById('spendingChart');
    const transactionsSection = document.getElementById('transactions-section');
    const pdf = new jsPDF();

    const chartImg = chartCanvas.toDataURL('image/png', 1.0);
    pdf.addImage(chartImg, 'PNG', 15, 15, 180, 100);

    await html2canvas(transactionsSection).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, 15, 180, 0);
    });

    pdf.save('FinanceSummary.pdf');
});

// ------------------ Send Email ------------------
const shareEmailInput = document.getElementById('share-email');
const sendEmailBtn = document.getElementById('send-email-btn');

sendEmailBtn.addEventListener('click', async () => {
    if (!token) return alert('Please login first.');
    const email = shareEmailInput.value.trim();
    if (!email) return alert('Enter recipient email');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const chartCanvas = document.getElementById('spendingChart');
    const transactionsSection = document.getElementById('transactions-section');

    const chartImg = chartCanvas.toDataURL('image/png', 1.0);
    pdf.addImage(chartImg, 'PNG', 15, 15, 180, 100);

    await html2canvas(transactionsSection).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, 15, 180, 0);
    });

    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    try {
        const res = await fetch('http://localhost:3000/api/share/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ email, pdfBase64 })
        });
        const data = await res.json();
        alert(data.success ? 'Email sent successfully!' : 'Failed to send email: ' + data.error);
    } catch (err) {
        console.error('Email send error:', err);
        alert('Error sending email. Check console for details.');
    }
});
