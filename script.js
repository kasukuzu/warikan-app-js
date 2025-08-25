document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const groupSection = document.getElementById('group-section');
    const mainApp = document.getElementById('main-app');
    const groupIdInput = document.getElementById('group-id-input');
    const joinGroupBtn = document.getElementById('join-group-btn');
    const currentGroupIdDisplay = document.getElementById('current-group-id-display');
    const setupSection = document.getElementById('setup-section');
    const expenseSection = document.getElementById('expense-section');
    const resultSection = document.getElementById('result-section');
    const participantNameInput = document.getElementById('participant-name');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const participantList = document.getElementById('participant-list');
    const startExpenseBtn = document.getElementById('start-expense-btn');
    const clearStorageBtn = document.getElementById('clear-storage-btn');
    const payerSelect = document.getElementById('payer-select');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseDescInput = document.getElementById('expense-desc');
    const expenseForRadio = document.getElementsByName('expense-for');
    const participantsCheckboxContainer = document.getElementById('participants-checkbox-container');
    const participantsCheckboxes = document.getElementById('participants-checkboxes');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expenseList = document.getElementById('expense-list');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const totalAmountSpan = document.getElementById('total-amount');
    const perPersonCostSpan = document.getElementById('per-person-cost');
    const transactionsDiv = document.getElementById('transactions');
    const backToExpenseBtn = document.getElementById('back-to-expense-btn');
    const resetCalculationBtn = document.getElementById('reset-calculation-btn');

    // --- アプリのグローバル変数 ---
    let participants = [];
    let expenses = [];
    let groupDocRef = null;
    let unsubscribe = null; // リアルタイムリスナーを停止するための変数

    // --- イベントリスナー ---
    joinGroupBtn.addEventListener('click', joinGroup);
    addParticipantBtn.addEventListener('click', addParticipant);
    startExpenseBtn.addEventListener('click', showExpenseSection);
    clearStorageBtn.addEventListener('click', clearAllData);
    addExpenseBtn.addEventListener('click', addExpense);
    calculateBtn.addEventListener('click', showResultSection);
    backToSetupBtn.addEventListener('click', () => {
        expenseSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
    });
    backToExpenseBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        expenseSection.classList.remove('hidden');
    });
    resetCalculationBtn.addEventListener('click', resetCalculation);
    expenseForRadio.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'some') {
                participantsCheckboxContainer.classList.remove('hidden');
            } else {
                participantsCheckboxContainer.classList.add('hidden');
            }
        });
    });

    // --- 関数定義 ---
    function joinGroup() {
        const groupId = groupIdInput.value.trim();
        if (!groupId) {
            alert('グループIDを入力してください。');
            return;
        }
        groupDocRef = db.collection('groups').doc(groupId);
        currentGroupIdDisplay.textContent = `グループID: ${groupId}`;

        groupSection.classList.add('hidden');
        mainApp.classList.remove('hidden');

        if (unsubscribe) unsubscribe();
        
        unsubscribe = groupDocRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                participants = data.participants || [];
                expenses = data.expenses || [];
                renderUI();
            } else {
                groupDocRef.set({ participants: [], expenses: [] });
            }
        });
    }

    async function saveData() {
        if (!groupDocRef) return;
        try {
            await groupDocRef.set({ participants, expenses });
        } catch (error) {
            console.error("データの保存に失敗しました: ", error);
        }
    }

    async function clearAllData() {
        if (confirm('本当にこのグループの全データを消去しますか？参加している全員のデータが消えます。')) {
            participants = [];
            expenses = [];
            await saveData();
            alert('データを消去しました。');
        }
    }

    async function addParticipant() {
        const name = participantNameInput.value.trim();
        if (name && !participants.includes(name)) {
            participants.push(name);
            participantNameInput.value = '';
            await saveData();
        }
    }

    function showExpenseSection() {
        if (participants.length < 2) {
            alert('参加者を2人以上追加してください。');
            return;
        }
        setupSection.classList.add('hidden');
        expenseSection.classList.remove('hidden');
    }
    
    async function addExpense() {
        const payer = payerSelect.value;
        const amount = parseFloat(expenseAmountInput.value);
        const description = expenseDescInput.value.trim();
        const expenseFor = document.querySelector('input[name="expense-for"]:checked').value;
        let involvedParticipants = [];

        if (expenseFor === 'all') {
            involvedParticipants = [...participants];
        } else {
            document.querySelectorAll('#participants-checkboxes input:checked')
              .forEach(box => involvedParticipants.push(box.value));
        }

        if (!payer || !(amount > 0) || !description) {
            alert('支払者、金額、内容を正しく入力してください。');
            return;
        }
        if (expenseFor === 'some' && involvedParticipants.length < 1) {
            alert('対象者を1人以上選択してください。');
            return;
        }

        expenses.push({ payer, amount, description, for: involvedParticipants });
        expenseAmountInput.value = '';
        expenseDescInput.value = '';
        await saveData();
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
    
    async function resetCalculation() {
        if (confirm('現在の費用リストをすべて消去して、費用の入力からやり直しますか？\n（参加者リストは残ります）')) {
            expenses = [];
            await saveData();
            resultSection.classList.add('hidden');
            expenseSection.classList.remove('hidden');
        }
    }
    
    function renderUI() {
        updateParticipantList();
        updatePayerSelect();
        createParticipantCheckboxes();
        updateExpenseList();
        if(resultSection.classList.contains('hidden') === false) {
            calculateSplit();
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

    function updatePayerSelect() {
        payerSelect.innerHTML = '';
        participants.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            payerSelect.appendChild(option);
        });
    }
    
    function createParticipantCheckboxes() {
        participantsCheckboxes.innerHTML = '';
        participants.forEach(name => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `check-${name}`;
            checkbox.value = name;
            checkbox.checked = true;
            const label = document.createElement('label');
            label.htmlFor = `check-${name}`;
            label.textContent = name;
            div.appendChild(checkbox);
            div.appendChild(label);
            participantsCheckboxes.appendChild(div);
        });
    }

    function updateExpenseList() {
        expenseList.innerHTML = '';
        expenses.forEach(expense => {
            const li = document.createElement('li');
            const target = expense.for.length === participants.length ? '全員' : expense.for.join(', ');
            li.textContent = `${expense.description}: ${expense.amount.toLocaleString()}円 (支払者: ${expense.payer}, 対象: ${target})`;
            expenseList.appendChild(li);
        });
    }
    
    function calculateSplit() {
        const balances = {};
        participants.forEach(p => { balances[p] = 0; });

        expenses.forEach(expense => {
            const involved = expense.for;
            const numInvolved = involved.length;
            if (numInvolved === 0) return;
            const costPerPerson = expense.amount / numInvolved;
            balances[expense.payer] += expense.amount;
            involved.forEach(person => {
                balances[person] -= costPerPerson;
            });
        });
        
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
            if (amount > 0.01) {
                transactions.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount) });
            }
            debtor.amount -= amount;
            creditor.amount -= amount;
            if (debtor.amount < 0.01) debtors.shift();
            if (creditor.amount < 0.01) creditors.shift();
        }

        const overallTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const overallPerPerson = participants.length > 0 ? overallTotal / participants.length : 0;
        
        totalAmountSpan.textContent = overallTotal.toLocaleString();
        perPersonCostSpan.textContent = `約 ${Math.round(overallPerPerson).toLocaleString()}`;
        
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
});