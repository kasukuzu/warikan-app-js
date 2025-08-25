document.addEventListener('DOMContentLoaded', () => {
    // 各セクションの要素を取得
    const setupSection = document.getElementById('setup-section');
    const expenseSection = document.getElementById('expense-section');
    const resultSection = document.getElementById('result-section');

    // 参加者関連の要素
    const participantNameInput = document.getElementById('participant-name');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const participantList = document.getElementById('participant-list');
    const startExpenseBtn = document.getElementById('start-expense-btn');

    // 費用関連の要素
    const payerSelect = document.getElementById('payer-select');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseDescInput = document.getElementById('expense-desc');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expenseList = document.getElementById('expense-list');
    const calculateBtn = document.getElementById('calculate-btn');

    // 結果表示の要素
    const totalAmountSpan = document.getElementById('total-amount');
    const perPersonCostSpan = document.getElementById('per-person-cost');
    const transactionsDiv = document.getElementById('transactions');
    const restartBtn = document.getElementById('restart-btn');

    // アプリのデータを保存する変数
    let participants = [];
    let expenses = [];

    // --- イベントリスナー ---
    addParticipantBtn.addEventListener('click', addParticipant);
    startExpenseBtn.addEventListener('click', showExpenseSection);
    addExpenseBtn.addEventListener('click', addExpense);
    calculateBtn.addEventListener('click', showResultSection);
    restartBtn.addEventListener('click', restartApp);

    // --- 関数定義 ---
    function addParticipant() {
        const name = participantNameInput.value.trim();
        if (name && !participants.includes(name)) {
            participants.push(name);
            updateParticipantList();
            participantNameInput.value = '';
        }
    }

    function updateParticipantList() {
        participantList.innerHTML = '';
        participants.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            participantList.appendChild(li);
        });
    }

    function showExpenseSection() {
        if (participants.length < 2) {
            alert('参加者を2人以上追加してください。');
            return;
        }
        setupSection.classList.add('hidden');
        expenseSection.classList.remove('hidden');
        updatePayerSelect();
    }

    function updatePayerSelect() {
        payerSelect.innerHTML = '';
        participants.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            payerSelect.appendChild(option);
        });
    }

    function addExpense() {
        const payer = payerSelect.value;
        const amount = parseFloat(expenseAmountInput.value);
        const description = expenseDescInput.value.trim();

        if (payer && amount > 0 && description) {
            expenses.push({ payer, amount, description });
            updateExpenseList();
            expenseAmountInput.value = '';
            expenseDescInput.value = '';
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    }

    function updateExpenseList() {
        expenseList.innerHTML = '';
        expenses.forEach(expense => {
            const li = document.createElement('li');
            li.textContent = `${expense.description} - ${expense.amount.toLocaleString()}円 (支払者: ${expense.payer})`;
            expenseList.appendChild(li);
        });
    }

    function showResultSection() {
        if (expenses.length === 0) {
            alert('費用を1つ以上追加してください。');
            return;
        }
        expenseSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        calculateSplit();
    }

    function calculateSplit() {
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const numPeople = participants.length;
        const perPersonCost = totalAmount / numPeople;

        const balances = {};
        participants.forEach(p => { balances[p] = 0; });
        expenses.forEach(exp => { balances[exp.payer] += exp.amount; });
        participants.forEach(p => { balances[p] -= perPersonCost; });

        const debtors = [];
        const creditors = [];
        for (const person in balances) {
            if (balances[person] < 0) debtors.push({ name: person, amount: -balances[person] });
            else if (balances[person] > 0) creditors.push({ name: person, amount: balances[person] });
        }

        const transactions = [];
        while (debtors.length > 0 && creditors.length > 0) {
            const debtor = debtors[0];
            const creditor = creditors[0];
            const amount = Math.min(debtor.amount, creditor.amount);

            transactions.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount) });

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) debtors.shift();
            if (creditor.amount < 0.01) creditors.shift();
        }

        totalAmountSpan.textContent = totalAmount.toLocaleString();
        perPersonCostSpan.textContent = Math.round(perPersonCost).toLocaleString();
        
        transactionsDiv.innerHTML = '';
        if (transactions.length === 0) {
            transactionsDiv.textContent = '精算の必要はありません。';
        } else {
            transactions.forEach(t => {
                const p = document.createElement('p');
                p.textContent = `› ${t.from}さん → ${t.to}さん へ ${t.amount.toLocaleString()}円 支払う`;
                transactionsDiv.appendChild(p);
            });
        }
    }
    
    function restartApp() {
        participants = [];
        expenses = [];
        updateParticipantList();
        updateExpenseList();
        
        resultSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
    }
});